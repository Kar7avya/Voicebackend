// ============================================
// METADATA.CONTROLLER.JS - FIXED WITH AUTHENTICATED CLIENT
// ============================================

import { supabase } from '../config/database.js';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!JWT_SECRET || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("CRITICAL: Missing Supabase environment variables!");
}

const isValidUUID = (str) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
};

/**
 * Extract and verify user ID from JWT token
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

/**
 * Create an authenticated Supabase client for the request
 */
const createAuthenticatedClient = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split(' ')[1];
    
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    });
};

// ============================================================================
// CORE USER FUNCTION - GET ALL METADATA FOR LOGGED-IN USER
// ============================================================================
export const getMetadata = async (req, res) => {
    try {
        console.log("📋 Attempting to get metadata...");
        
        // 1. AUTH CHECK
        const userId = extractUserIdFromToken(req);
        if (!userId) {
            console.log("❌ Authentication failed - no valid user ID");
            return res.status(401).json({ 
                success: false, 
                error: 'Authentication required. Please log in.' 
            });
        }

        console.log(`👤 Fetching metadata for user: ${userId}`);
        
        // 2. CREATE AUTHENTICATED CLIENT
        const authClient = createAuthenticatedClient(req);
        if (!authClient) {
            console.log("❌ Failed to create authenticated client");
            return res.status(401).json({
                success: false,
                error: 'Invalid authentication token'
            });
        }

        // 3. QUERY WITH AUTHENTICATED CLIENT (RLS will automatically filter by user_id)
        const { data, error } = await authClient
            .from('metadata')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("❌ Query failed:", error);
            return res.status(500).json({ 
                success: false, 
                error: error.message,
                hint: error.hint,
                details: error.details
            });
        }

        console.log(`✅ Found ${data?.length || 0} records for user ${userId}`);
        
        // Return data in format expected by frontend
        res.json({ 
            success: true, 
            data: data || [] 
        });
        
    } catch (error) {
        console.error("💥 Error in getMetadata:", error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// ============================================================================
// GET METADATA BY ID
// ============================================================================
export const getMetadataById = async (req, res) => {
    const { id } = req.params;
    
    // 1. AUTH CHECK
    const userId = extractUserIdFromToken(req);
    if (!userId) {
        return res.status(401).json({ 
            success: false, 
            error: 'Authentication required.' 
        });
    }
    
    // 2. VALIDATE UUID
    if (!isValidUUID(id)) {
        return res.status(400).json({ 
            success: false, 
            error: 'Invalid UUID format.' 
        });
    }

    try {
        // 3. CREATE AUTHENTICATED CLIENT
        const authClient = createAuthenticatedClient(req);
        if (!authClient) {
            return res.status(401).json({
                success: false,
                error: 'Invalid authentication token'
            });
        }

        // 4. QUERY WITH RLS
        const { data, error } = await authClient
            .from('metadata')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ 
                    success: false, 
                    error: "Record not found or access denied" 
                });
            }
            return res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
        
        res.json({ success: true, data });
        
    } catch (error) {
        console.error("💥 Error in getMetadataById:", error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// ============================================================================
// UPDATE METADATA
// ============================================================================
export const updateMetadata = async (req, res) => {
    const { id } = req.params;
    
    // 1. AUTH CHECK
    const userId = extractUserIdFromToken(req);
    if (!userId) {
        return res.status(401).json({ 
            success: false, 
            error: 'Authentication required.' 
        });
    }
    
    // 2. VALIDATE UUID
    if (!isValidUUID(id)) {
        return res.status(400).json({ 
            success: false, 
            error: 'Invalid UUID format.' 
        });
    }

    try {
        // 3. FILTER ALLOWED FIELDS
        const allowedFields = ['file_name', 'description', 'tags', 'custom_metadata'];
        const updates = {};
        Object.keys(req.body).forEach(key => {
            if (allowedFields.includes(key)) {
                updates[key] = req.body[key];
            }
        });

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: "No valid fields to update" 
            });
        }

        // 4. CREATE AUTHENTICATED CLIENT
        const authClient = createAuthenticatedClient(req);
        if (!authClient) {
            return res.status(401).json({
                success: false,
                error: 'Invalid authentication token'
            });
        }

        // 5. UPDATE WITH RLS
        const { data, error } = await authClient
            .from('metadata')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ 
                success: false, 
                error: error.message 
            });
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
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// ============================================================================
// DELETE METADATA
// ============================================================================
export const deleteMetadata = async (req, res) => {
    const { id } = req.params;
    
    // 1. AUTH CHECK
    const userId = extractUserIdFromToken(req);
    if (!userId) {
        return res.status(401).json({ 
            success: false, 
            error: 'Authentication required.' 
        });
    }
    
    // 2. VALIDATE UUID
    if (!isValidUUID(id)) {
        return res.status(400).json({ 
            success: false, 
            error: 'Invalid UUID format.' 
        });
    }

    try {
        // 3. CREATE AUTHENTICATED CLIENT
        const authClient = createAuthenticatedClient(req);
        if (!authClient) {
            return res.status(401).json({
                success: false,
                error: 'Invalid authentication token'
            });
        }

        // 4. CHECK IF EXISTS (RLS will filter by user automatically)
        const { data: existingData } = await authClient
            .from('metadata')
            .select('id')
            .eq('id', id)
            .single();

        if (!existingData) {
            return res.status(404).json({ 
                success: false, 
                error: "Record not found or access denied" 
            });
        }
        
        // 5. DELETE WITH RLS
        const { error } = await authClient
            .from('metadata')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("❌ Delete failed:", error);
            return res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
        
        res.json({ 
            success: true, 
            message: "Deleted successfully" 
        });
        
    } catch (error) {
        console.error("💥 Error in deleteMetadata:", error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// ============================================================================
// SEARCH METADATA
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
            return res.status(400).json({ 
                success: false, 
                error: "Query parameter 'q' is required" 
            });
        }

        // 2. CREATE AUTHENTICATED CLIENT
        const authClient = createAuthenticatedClient(req);
        if (!authClient) {
            return res.status(401).json({
                success: false,
                error: 'Invalid authentication token'
            });
        }

        // 3. BUILD SEARCH QUERY (RLS will automatically filter by user_id)
        let searchQuery = authClient.from('metadata').select('*');

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
            return res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
        
        res.json({ 
            success: true, 
            query, 
            results: data?.length || 0, 
            data: data || [] 
        });
        
    } catch (error) {
        console.error("💥 Error in searchMetadata:", error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};