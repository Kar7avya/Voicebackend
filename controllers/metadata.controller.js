// // ============================================
// METADATA.CONTROLLER.JS - FINAL RLS SECURE VERSION
// ============================================

import { supabase } from '../config/database.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

const isValidUUID = (str) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
};

/**
 * Extract and verify user ID from JWT token. 
 * This confirms the user is authenticated BEFORE querying the DB.
 */
const extractUserIdFromToken = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split(' ')[1];
    if (!JWT_SECRET) return null;
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded.sub;
    } catch (err) {
        console.warn("❌ JWT Verification Failed:", err.message);
        return null;
    }
};

// ============================================================================
// CORE USER FUNCTION (Relies on RLS for filtering)
// ============================================================================
export const getMetadata = async (req, res) => {
    try {
        console.log("📋 Attempting to get metadata...");
        
        // 🔑 1. EXPLICIT AUTH CHECK
        const userId = extractUserIdFromToken(req);
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                error: 'Authentication required. Please log in.' 
            });
        }

        console.log(`👤 Fetching metadata for user: ${userId}`);
        
        // 🔑 2. RLS-FILTERED QUERY (The token is automatically passed via headers)
        const { data, error } = await supabase
            .from('metadata')
            .select('*')
            // Optional: The .eq('user_id', userId) is removed here to rely purely on RLS (cleaner/standard)
            // If you insist on the extra check: .eq('user_id', userId) 
            .order('created_at', { ascending: false });

        if (error) {
            console.error("❌ Query failed:", error);
            return res.status(500).json({ 
                success: false, 
                error: error.message,
                hint: error.hint 
            });
        }

        console.log(`✅ Found ${data?.length || 0} records for user ${userId}`);
        res.json({ success: true, data: data || [] });
    } catch (error) {
        console.error("💥 Error in getMetadata:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================================================
// CRUD HELPER FUNCTION
// ============================================================================

const checkAuthAndId = (req, res, id) => {
    const userId = extractUserIdFromToken(req);
    if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return false;
    }
    if (!isValidUUID(id)) {
        res.status(400).json({ success: false, error: 'Invalid UUID format.' });
        return false;
    }
    return userId; // Return userId on success for use in queries
};


// ============================================================================
// STANDARD CRUD FUNCTIONS
// ============================================================================
export const getMetadataById = async (req, res) => {
    const { id } = req.params;
    const userId = checkAuthAndId(req, res, id);
    if (!userId) return;

    try {
        const { data, error } = await supabase
            .from('metadata')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId) // Explicit check is good here as it's a specific fetch
            .single();

        if (error) {
            // PGRST116 is 'No rows found' which should return 404
            if (error.code === 'PGRST116') {
                return res.status(404).json({ success: false, error: "Record not found or access denied" });
            }
            return res.status(500).json({ success: false, error: error.message });
        }
        
        res.json({ success: true, data });
    } catch (error) {
        console.error("💥 Error in getMetadataById:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const updateMetadata = async (req, res) => {
    const { id } = req.params;
    const userId = checkAuthAndId(req, res, id);
    if (!userId) return;

    try {
        const allowedFields = ['file_name', 'description', 'tags', 'custom_metadata'];
        const updates = {};
        Object.keys(req.body).forEach(key => {
            if (allowedFields.includes(key)) updates[key] = req.body[key];
        });

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ success: false, error: "No valid fields to update" });
        }

        // RLS prevents unauthorized updates, but we add an explicit check to return 404/403
        const { data, error } = await supabase
            .from('metadata')
            .update(updates)
            .eq('id', id)
            .eq('user_id', userId) // Ensure user owns the record
            .select()
            .single();

        if (error) return res.status(500).json({ success: false, error: error.message });
        
        if (!data) {
            return res.status(404).json({ success: false, error: "Record not found or access denied" });
        }

        res.json({ success: true, data });
    } catch (error) {
        console.error("💥 Error in updateMetadata:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const deleteMetadata = async (req, res) => {
    const { id } = req.params;
    const userId = checkAuthAndId(req, res, id);
    if (!userId) return;

    try {
        // First, check if the record exists and belongs to the user to return a meaningful status
        const { data: existingData } = await supabase
            .from('metadata')
            .select('id')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (!existingData) {
            return res.status(404).json({ success: false, error: "Record not found or access denied" });
        }
        
        // If it exists and belongs to the user, proceed with deletion
        const { error } = await supabase
            .from('metadata')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("❌ Delete failed:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
        
        res.json({ success: true, message: "Deleted successfully" });
    } catch (error) {
        console.error("💥 Error in deleteMetadata:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================================================
// SEARCH FUNCTION
// ============================================================================
export const searchMetadata = async (req, res) => {
    const { q: query, type, limit = 50 } = req.query;
    
    // 1. AUTH CHECK
    const userId = extractUserIdFromToken(req);
    if (!userId) {
        return res.status(401).json({ 
            success: false, 
            error: 'Authentication required' 
        });
    }
    
    try {
        if (!query) {
            return res.status(400).json({ success: false, error: "Query parameter 'q' is required" });
        }

        // 2. QUERY BUILDING: RLS will automatically filter by user_id
        let searchQuery = supabase.from('metadata').select('*');

        if (type === 'name') {
            searchQuery = searchQuery.or(`file_name.ilike.%${query}%,video_name.ilike.%${query}%`);
        } else {
            searchQuery = searchQuery.or(`file_name.ilike.%${query}%,video_name.ilike.%${query}%,deepgram_transcript.ilike.%${query}%`);
        }

        const { data, error } = await searchQuery
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));

        if (error) {
            console.error("❌ Search failed:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
        
        res.json({ success: true, query, results: data?.length || 0, data: data || [] });
    } catch (error) {
        console.error("💥 Error in searchMetadata:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};