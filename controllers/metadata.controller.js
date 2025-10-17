// ============================================
// METADATA.CONTROLLER.JS - RLS SECURE VERSION
// ============================================

import { supabase } from '../config/database.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

const isValidUUID = (str) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
};

/**
 * Extract user ID from JWT token
 */
const extractUserIdFromToken = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded.sub;
    } catch (err) {
        console.error("❌ JWT Verification Failed:", err.message);
        return null;
    }
};

/**
 * Create authenticated Supabase client with user's JWT
 */
const getAuthenticatedSupabase = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split(' ')[1];
    
    // Create a new Supabase client with the user's access token
    // This ensures RLS policies are applied correctly
    return supabase.auth.setSession({
        access_token: token,
        refresh_token: '' // Not needed for this operation
    }).then(() => supabase);
};

// ============================================================================
// CORE USER FUNCTION (Relies on RLS for filtering)
// ============================================================================
export const getMetadata = async (req, res) => {
    try {
        console.log("📋 Getting metadata for authenticated user...");
        
        // Verify authentication
        const userId = extractUserIdFromToken(req);
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                error: 'Authentication required. Please log in.' 
            });
        }

        console.log(`👤 Fetching metadata for user: ${userId}`);
        
        // Get auth header to pass to Supabase
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ 
                success: false, 
                error: 'No authorization header found' 
            });
        }

        // Use the anon key client but with the user's JWT token
        // This will trigger RLS policies
        const { data, error } = await supabase
            .from('metadata')
            .select('*')
            .eq('user_id', userId) // Explicit filter for extra security
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
// STANDARD CRUD FUNCTIONS
// ============================================================================
export const getMetadataById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidUUID(id)) {
            return res.status(400).json({ 
                success: false, 
                error: `Invalid UUID: "${id}"` 
            });
        }

        // Verify authentication
        const userId = extractUserIdFromToken(req);
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                error: 'Authentication required' 
            });
        }

        // RLS ensures the user can only see records they own
        const { data, error } = await supabase
            .from('metadata')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId) // Extra security layer
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ 
                    success: false, 
                    error: "Record not found or access denied" 
                });
            }
            return res.status(500).json({ success: false, error: error.message });
        }
        
        if (!data) {
            return res.status(404).json({ 
                success: false, 
                error: "Not found or not authorized" 
            });
        }

        res.json({ success: true, data });
    } catch (error) {
        console.error("💥 Error in getMetadataById:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const updateMetadata = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: "Invalid UUID" });
        }

        // Verify authentication
        const userId = extractUserIdFromToken(req);
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                error: 'Authentication required' 
            });
        }

        const allowedFields = ['file_name', 'description', 'tags', 'custom_metadata'];
        const updates = {};
        Object.keys(req.body).forEach(key => {
            if (allowedFields.includes(key)) updates[key] = req.body[key];
        });

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: "No valid fields to update" 
            });
        }

        // RLS prevents unauthorized updates
        const { data, error } = await supabase
            .from('metadata')
            .update(updates)
            .eq('id', id)
            .eq('user_id', userId) // Ensure user owns the record
            .select()
            .single();

        if (error) {
            console.error("❌ Update failed:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
        
        if (!data) {
            return res.status(404).json({ 
                success: false, 
                error: "Record not found or access denied" 
            });
        }

        res.json({ success: true, data });
    } catch (error) {
        console.error("💥 Error in updateMetadata:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const deleteMetadata = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: "Invalid UUID" });
        }

        // Verify authentication
        const userId = extractUserIdFromToken(req);
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                error: 'Authentication required' 
            });
        }

        // RLS prevents unauthorized deletions
        const { error } = await supabase
            .from('metadata')
            .delete()
            .eq('id', id)
            .eq('user_id', userId); // Ensure user owns the record

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
    try {
        const { q: query, type, limit = 50 } = req.query;
        if (!query) {
            return res.status(400).json({ 
                success: false, 
                error: "Query parameter 'q' is required" 
            });
        }

        // Verify authentication
        const userId = extractUserIdFromToken(req);
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                error: 'Authentication required' 
            });
        }

        let searchQuery = supabase
            .from('metadata')
            .select('*')
            .eq('user_id', userId); // Only search user's own records

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