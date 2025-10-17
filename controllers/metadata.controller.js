

import { supabase } from '../config/database.js';

const isValidUUID = (str) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
};

// ============================================================================
// CORE USER FUNCTION (Relies on RLS for filtering)
// ============================================================================
export const getMetadata = async (req, res) => {
    try {
        console.log("📋 Getting metadata. RLS will filter by authenticated user...");
        
        // Supabase will automatically use the JWT token in the request headers
        // to call auth.uid() and apply the RLS policy: 
        // "Users can only view their own videos"
        const { data, error } = await supabase
            .from('metadata')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("❌ Query failed:", error);
            // The RLS denial typically manifests here as a cs error
            return res.status(500).json({ success: false, error: error.message });
        }

        console.log(`✅ Found ${data?.length || 0} records for authenticated user`);
        res.json({ success: true, data: data || [] });
    } catch (error) {
        console.error("💥 Error:", error);
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

        // RLS ensures the user can only see the record if they own it.
        const { data, error } = await supabase
            .from('metadata')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return res.status(500).json({ success: false, error: error.message });
        if (!data) return res.status(404).json({ success: false, error: "Not found or not authorized" });

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const updateMetadata = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: "Invalid UUID" });
        }

        const allowedFields = ['original_name', 'description', 'tags', 'custom_metadata'];
        const updates = {};
        Object.keys(req.body).forEach(key => {
            if (allowedFields.includes(key)) updates[key] = req.body[key];
        });

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ success: false, error: "No valid fields" });
        }

        // Note: The database trigger handles `updated_at`. We can remove this line.
        // updates.updated_at = new Date().toISOString(); 

        // RLS prevents unauthorized updates
        const { data, error } = await supabase
            .from('metadata')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) return res.status(500).json({ success: false, error: error.message });
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const deleteMetadata = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: "Invalid UUID" });
        }

        // RLS prevents unauthorized deletions
        const { error } = await supabase.from('metadata').delete().eq('id', id);
        if (error) return res.status(500).json({ success: false, error: error.message });
        
        res.json({ success: true, message: "Deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================================================
// SEARCH AND ADMIN FUNCTIONS (Keep for backend logic, but note security reliance)
// ============================================================================

export const searchMetadata = async (req, res) => {
    try {
        const { q: query, type, limit = 50 } = req.query;
        if (!query) {
            return res.status(400).json({ success: false, error: "Query required" });
        }

        let searchQuery = supabase.from('metadata').select('*');
        // NOTE: RLS will ensure search results are still limited to the authenticated user's videos.
        if (type === 'name') {
            searchQuery = searchQuery.or(`original_name.ilike.%${query}%,video_name.ilike.%${query}%`);
        } else {
            searchQuery = searchQuery.or(`original_name.ilike.%${query}%,video_name.ilike.%${query}%,deepgram_transcript.ilike.%${query}%`);
        }

        const { data, error } = await searchQuery.order('created_at', { ascending: false }).limit(parseInt(limit));
        if (error) return res.status(500).json({ success: false, error: error.message });
        
        res.json({ success: true, query, data: data || [] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ⚠️ DEPRECATED/REMOVED FUNCTIONS:
// getMetadataByUser, getUserVideoRelationships, getAllUsersWithVideos 
// These were redundant for user access (RLS handles it) and should be moved 
// to an admin-only endpoint if they need to bypass RLS. For now, we omit them.