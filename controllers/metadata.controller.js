// ============================================
// METADATA.CONTROLLER.JS - FIXED WITH getAllUsersWithVideos
// ============================================

import { supabase } from '../config/database.js';

// Get all metadata
export const getMetadata = async (req, res) => {
    try {
        console.log("Metadata Worker: Getting all file records...");

        const { data, error } = await supabase
            .from('metadata')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Metadata Worker: Database query failed:", error);
            return res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }

        const summary = {
            totalFiles: data?.length || 0,
            filesWithFrames: data?.filter(item => item.frames && item.frames.length > 0).length || 0,
            filesWithTranscripts: data?.filter(item => item.deepgram_transcript).length || 0,
            lastUpload: data?.[0]?.created_at || null
        };

        res.json({ 
            success: true, 
            summary,
            data: data || [] 
        });

    } catch (error) {
        console.error("Metadata Worker: Unexpected error:", error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// Get metadata by ID
export const getMetadataById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('metadata')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error("Metadata Worker: Query failed:", error);
            return res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }

        if (!data) {
            return res.status(404).json({ 
                success: false, 
                error: "File record not found" 
            });
        }

        const enrichedData = {
            ...data,
            hasFrames: !!(data.frames && data.frames.length > 0),
            frameCount: data.frames?.length || 0,
            hasTranscript: !!data.deepgram_transcript,
            processingStatus: {
                uploaded: !!data.video_url,
                framesExtracted: !!(data.frames && data.frames.length > 0),
                transcribed: !!data.deepgram_transcript
            }
        };

        res.json({ 
            success: true, 
            data: enrichedData 
        });

    } catch (error) {
        console.error("Metadata Worker: Unexpected error:", error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// Update metadata
export const updateMetadata = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const allowedFields = ['original_name', 'description', 'tags', 'custom_metadata'];
        const filteredUpdates = {};
        
        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key)) {
                filteredUpdates[key] = updates[key];
            }
        });

        if (Object.keys(filteredUpdates).length === 0) {
            return res.status(400).json({
                success: false,
                error: "No valid fields to update",
                allowedFields
            });
        }

        filteredUpdates.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('metadata')
            .update(filteredUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }

        res.json({ 
            success: true, 
            message: "Metadata updated successfully",
            data 
        });

    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// Delete metadata
export const deleteMetadata = async (req, res) => {
    try {
        const { id } = req.params;
        const { deleteFile = false } = req.query;

        const { data: record, error: fetchError } = await supabase
            .from('metadata')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !record) {
            return res.status(404).json({ 
                success: false, 
                error: "File record not found" 
            });
        }

        if (deleteFile === 'true') {
            if (record.video_name) {
                await supabase.storage
                    .from('projectai')
                    .remove([`videos/${record.video_name}`]);
            }

            if (record.frames?.length > 0) {
                const framePaths = record.frames.map(frame => `frames/${frame.frame_id}`);
                await supabase.storage
                    .from('projectai')
                    .remove(framePaths);
            }
        }

        const { error: deleteError } = await supabase
            .from('metadata')
            .delete()
            .eq('id', id);

        if (deleteError) {
            return res.status(500).json({ 
                success: false, 
                error: deleteError.message 
            });
        }

        res.json({ 
            success: true, 
            message: deleteFile === 'true' 
                ? "Record and files deleted" 
                : "Record deleted (files preserved)",
            deletedRecord: {
                id: record.id,
                video_name: record.video_name
            }
        });

    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// Get metadata by user - FIXED to check both columns
export const getMetadataByUser = async (req, res) => {
    try {
        const { userId } = req.params;

        // Query using OR to check both user_id and user_id_string
        const { data, error } = await supabase
            .from('metadata')
            .select('*')
            .or(`user_id.eq.${userId},user_id_string.eq.${userId}`)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }

        const userSummary = {
            totalFiles: data?.length || 0,
            totalStorage: data?.reduce((sum, item) => sum + (item.file_size || 0), 0) || 0,
            recentActivity: data?.[0]?.created_at || null
        };

        res.json({ 
            success: true, 
            userId,
            summary: userSummary,
            data: data || [] 
        });

    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// Search metadata
export const searchMetadata = async (req, res) => {
    try {
        const { q: query, type, limit = 50 } = req.query;
        
        if (!query) {
            return res.status(400).json({
                success: false,
                error: "Search query is required"
            });
        }

        let searchQuery = supabase.from('metadata').select('*');

        if (type === 'name') {
            searchQuery = searchQuery.or(`original_name.ilike.%${query}%,video_name.ilike.%${query}%`);
        } else if (type === 'transcript') {
            searchQuery = searchQuery.ilike('deepgram_transcript', `%${query}%`);
        } else {
            searchQuery = searchQuery.or(
                `original_name.ilike.%${query}%,video_name.ilike.%${query}%,deepgram_transcript.ilike.%${query}%`
            );
        }

        const { data, error } = await searchQuery
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));

        if (error) {
            return res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }

        res.json({ 
            success: true, 
            query,
            resultCount: data?.length || 0,
            data: data || [] 
        });

    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// Get all users with their videos - MISSING FUNCTION ADDED
export const getAllUsersWithVideos = async (req, res) => {
    try {
        console.log("Metadata Worker: Getting all users with videos...");

        const { data, error } = await supabase
            .from('metadata')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Metadata Worker: Database query failed:", error);
            return res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }

        // Group videos by user
        const userMap = {};
        
        data?.forEach(video => {
            const userId = video.user_id || video.user_id_string || 'unknown';
            
            if (!userMap[userId]) {
                userMap[userId] = {
                    userId,
                    videos: [],
                    totalVideos: 0,
                    totalStorage: 0
                };
            }
            
            userMap[userId].videos.push(video);
            userMap[userId].totalVideos += 1;
            userMap[userId].totalStorage += video.file_size || 0;
        });

        const users = Object.values(userMap);

        res.json({ 
            success: true, 
            totalUsers: users.length,
            data: users
        });

    } catch (error) {
        console.error("Metadata Worker: Unexpected error:", error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};