import { supabase } from '../config/database.js';

const isValidUUID = (str) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
};

export const getMetadata = async (req, res) => {
    try {
        console.log("📋 Getting all metadata...");
        const { data, error } = await supabase
            .from('metadata')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("❌ Query failed:", error);
            return res.status(500).json({ success: false, error: error.message });
        }

        console.log(`✅ Found ${data?.length || 0} records`);
        res.json({ success: true, data: data || [] });
    } catch (error) {
        console.error("💥 Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getMetadataById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidUUID(id)) {
            return res.status(400).json({ 
                success: false, 
                error: `Invalid UUID: "${id}"` 
            });
        }

        const { data, error } = await supabase
            .from('metadata')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return res.status(500).json({ success: false, error: error.message });
        if (!data) return res.status(404).json({ success: false, error: "Not found" });

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

        updates.updated_at = new Date().toISOString();

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

        const { error } = await supabase.from('metadata').delete().eq('id', id);
        if (error) return res.status(500).json({ success: false, error: error.message });
        
        res.json({ success: true, message: "Deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getMetadataByUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { data, error } = await supabase
            .from('metadata')
            .select('*')
            .or(`user_id.eq.${userId},user_id_string.eq.${userId}`)
            .order('created_at', { ascending: false });

        if (error) return res.status(500).json({ success: false, error: error.message });
        res.json({ success: true, userId, data: data || [] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const searchMetadata = async (req, res) => {
    try {
        const { q: query, type, limit = 50 } = req.query;
        if (!query) {
            return res.status(400).json({ success: false, error: "Query required" });
        }

        let searchQuery = supabase.from('metadata').select('*');
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

export const getUserVideoRelationships = async (req, res) => {
    try {
        const { userId } = req.params;
        const { data, error } = await supabase
            .from('metadata')
            .select('id, user_id, user_id_string, video_name, original_name, created_at, video_url, public_url')
            .or(`user_id.eq.${userId},user_id_string.eq.${userId}`)
            .order('created_at', { ascending: false });

        if (error) return res.status(500).json({ success: false, error: error.message });
        res.json({ success: true, userId, data: data || [] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getAllUsersWithVideos = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('metadata')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) return res.status(500).json({ success: false, error: error.message });
        res.json({ success: true, data: data || [] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};