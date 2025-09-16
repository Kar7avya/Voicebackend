// // controllers/metadata.controller.js - DATABASE INFORMATION WORKERS
// // "We manage all the file information and data records!"

// import { supabase } from '../config/database.js';

// // WORKER 1: Get all file metadata (like a filing cabinet list)
// export const getMetadata = async (req, res) => {
//     try {
//         console.log("📋 Metadata Worker: Getting all file records...");

//         const { data, error } = await supabase
//             .from('metadata')
//             .select('*')
//             .order('created_at', { ascending: false });

//         if (error) {
//             console.error("❌ Metadata Worker: Database query failed:", error);
//             return res.status(500).json({ 
//                 success: false, 
//                 error: error.message 
//             });
//         }

//         console.log(`✅ Metadata Worker: Found ${data ? data.length : 0} records`);
        
//         // Add some useful summary info
//         const summary = {
//             totalFiles: data ? data.length : 0,
//             filesWithFrames: data ? data.filter(item => item.frames && item.frames.length > 0).length : 0,
//             filesWithTranscripts: data ? data.filter(item => item.deepgram_transcript).length : 0,
//             lastUpload: data && data.length > 0 ? data[0].created_at : null
//         };

//         res.json({ 
//             success: true, 
//             summary,
//             data: data || [] 
//         });

//     } catch (error) {
//         console.error("❌ Metadata Worker: Unexpected error:", error);
//         res.status(500).json({ 
//             success: false, 
//             error: error.message 
//         });
//     }
// };

// // WORKER 2: Get metadata for a specific file
// export const getMetadataById = async (req, res) => {
//     try {
//         const { id } = req.params;
//         console.log(`📋 Metadata Worker: Getting record for ID ${id}`);

//         const { data, error } = await supabase
//             .from('metadata')
//             .select('*')
//             .eq('id', id)
//             .single();

//         if (error) {
//             console.error("❌ Metadata Worker: Query failed:", error);
//             return res.status(500).json({ 
//                 success: false, 
//                 error: error.message 
//             });
//         }

//         if (!data) {
//             console.log("📭 Metadata Worker: No record found");
//             return res.status(404).json({ 
//                 success: false, 
//                 error: "File record not found" 
//             });
//         }

//         // Add some computed information
//         const enrichedData = {
//             ...data,
//             hasFrames: !!(data.frames && data.frames.length > 0),
//             frameCount: data.frames ? data.frames.length : 0,
//             hasTranscript: !!data.deepgram_transcript,
//             transcriptWordCount: data.deepgram_transcript ? data.deepgram_transcript.split(' ').length : 0,
//             processingStatus: {
//                 uploaded: !!data.video_url,
//                 framesExtracted: !!(data.frames && data.frames.length > 0),
//                 transcribed: !!data.deepgram_transcript,
//                 fullyProcessed: !!(data.frames && data.frames.length > 0 && data.deepgram_transcript)
//             }
//         };

//         console.log("✅ Metadata Worker: Record found and enriched");
//         res.json({ 
//             success: true, 
//             data: enrichedData 
//         });

//     } catch (error) {
//         console.error("❌ Metadata Worker: Unexpected error:", error);
//         res.status(500).json({ 
//             success: false, 
//             error: error.message 
//         });
//     }
// };

// // WORKER 3: Update metadata for a file
// export const updateMetadata = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const updates = req.body;
        
//         console.log(`✏️ Metadata Update Worker: Updating record ${id}`);

//         // Remove any fields that shouldn't be updated directly
//         const allowedFields = [
//             'original_name', 
//             'description', 
//             'tags', 
//             'custom_metadata'
//         ];
        
//         const filteredUpdates = {};
//         Object.keys(updates).forEach(key => {
//             if (allowedFields.includes(key)) {
//                 filteredUpdates[key] = updates[key];
//             }
//         });

//         if (Object.keys(filteredUpdates).length === 0) {
//             return res.status(400).json({
//                 success: false,
//                 error: "No valid fields to update",
//                 allowedFields
//             });
//         }

//         // Add update timestamp
//         filteredUpdates.updated_at = new Date().toISOString();

//         const { data, error } = await supabase
//             .from('metadata')
//             .update(filteredUpdates)
//             .eq('id', id)
//             .select()
//             .single();

//         if (error) {
//             console.error("❌ Metadata Update Worker: Update failed:", error);
//             return res.status(500).json({ 
//                 success: false, 
//                 error: error.message 
//             });
//         }

//         console.log("✅ Metadata Update Worker: Record updated successfully");
//         res.json({ 
//             success: true, 
//             message: "Metadata updated successfully",
//             data 
//         });

//     } catch (error) {
//         console.error("❌ Metadata Update Worker: Unexpected error:", error);
//         res.status(500).json({ 
//             success: false, 
//             error: error.message 
//         });
//     }
// };

// // WORKER 4: Delete a file record (and optionally the file itself)
// export const deleteMetadata = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { deleteFile = false } = req.query; // Option to delete actual file too
        
//         console.log(`🗑️ Metadata Delete Worker: Deleting record ${id}`);

//         // First, get the record to know what files to delete
//         const { data: record, error: fetchError } = await supabase
//             .from('metadata')
//             .select('*')
//             .eq('id', id)
//             .single();

//         if (fetchError || !record) {
//             console.log("📭 Metadata Delete Worker: Record not found");
//             return res.status(404).json({ 
//                 success: false, 
//                 error: "File record not found" 
//             });
//         }

//         // If requested, delete the actual files from storage
//         if (deleteFile === 'true') {
//             console.log("🗂️ Metadata Delete Worker: Deleting actual files...");
            
//             // Delete video file
//             if (record.video_name) {
//                 await supabase.storage
//                     .from('projectai')
//                     .remove([`videos/${record.video_name}`]);
//                 console.log(`🗑️ Deleted video: ${record.video_name}`);
//             }

//             // Delete frame files
//             if (record.frames && record.frames.length > 0) {
//                 const framePaths = record.frames.map(frame => `frames/${frame.frame_id}`);
//                 await supabase.storage
//                     .from('projectai')
//                     .remove(framePaths);
//                 console.log(`🗑️ Deleted ${framePaths.length} frame files`);
//             }
//         }

//         // Delete the metadata record
//         const { error: deleteError } = await supabase
//             .from('metadata')
//             .delete()
//             .eq('id', id);

//         if (deleteError) {
//             console.error("❌ Metadata Delete Worker: Delete failed:", deleteError);
//             return res.status(500).json({ 
//                 success: false, 
//                 error: deleteError.message 
//             });
//         }

//         console.log("✅ Metadata Delete Worker: Record deleted successfully");
//         res.json({ 
//             success: true, 
//             message: deleteFile === 'true' 
//                 ? "Record and associated files deleted successfully" 
//                 : "Record deleted successfully (files preserved)",
//             deletedRecord: {
//                 id: record.id,
//                 video_name: record.video_name,
//                 original_name: record.original_name
//             }
//         });

//     } catch (error) {
//         console.error("❌ Metadata Delete Worker: Unexpected error:", error);
//         res.status(500).json({ 
//             success: false, 
//             error: error.message 
//         });
//     }
// };

// // WORKER 5: Get metadata for specific user
// export const getMetadataByUser = async (req, res) => {
//     try {
//         const { userId } = req.params;
//         console.log(`👤 User Metadata Worker: Getting records for user ${userId}`);

//         const { data, error } = await supabase
//             .from('metadata')
//             .select('*')
//             .eq('user_id', userId)
//             .order('created_at', { ascending: false });

//         if (error) {
//             console.error("❌ User Metadata Worker: Query failed:", error);
//             return res.status(500).json({ 
//                 success: false, 
//                 error: error.message 
//             });
//         }

//         // User-specific summary
//         const userSummary = {
//             totalFiles: data ? data.length : 0,
//             totalStorage: data ? data.reduce((sum, item) => sum + (item.file_size || 0), 0) : 0,
//             recentActivity: data && data.length > 0 ? data[0].created_at : null,
//             processingStatus: {
//                 uploaded: data ? data.length : 0,
//                 withFrames: data ? data.filter(item => item.frames && item.frames.length > 0).length : 0,
//                 withTranscripts: data ? data.filter(item => item.deepgram_transcript).length : 0
//             }
//         };

//         console.log(`✅ User Metadata Worker: Found ${data ? data.length : 0} files for user`);
//         res.json({ 
//             success: true, 
//             userId,
//             summary: userSummary,
//             data: data || [] 
//         });

//     } catch (error) {
//         console.error("❌ User Metadata Worker: Unexpected error:", error);
//         res.status(500).json({ 
//             success: false, 
//             error: error.message 
//         });
//     }
// };

// // WORKER 6: Search metadata
// export const searchMetadata = async (req, res) => {
//     try {
//         const { q: query, type, limit = 50 } = req.query;
        
//         if (!query) {
//             return res.status(400).json({
//                 success: false,
//                 error: "Search query is required"
//             });
//         }

//         console.log(`🔍 Search Worker: Searching for "${query}"`);

//         let searchQuery = supabase
//             .from('metadata')
//             .select('*');

//         // Search in different fields based on type
//         if (type === 'name') {
//             searchQuery = searchQuery.or(`original_name.ilike.%${query}%,video_name.ilike.%${query}%`);
//         } else if (type === 'transcript') {
//             searchQuery = searchQuery.ilike('deepgram_transcript', `%${query}%`);
//         } else {
//             // Search everywhere
//             searchQuery = searchQuery.or(
//                 `original_name.ilike.%${query}%,video_name.ilike.%${query}%,deepgram_transcript.ilike.%${query}%`
//             );
//         }

//         const { data, error } = await searchQuery
//             .order('created_at', { ascending: false })
//             .limit(parseInt(limit));

//         if (error) {
//             console.error("❌ Search Worker: Search failed:", error);
//             return res.status(500).json({ 
//                 success: false, 
//                 error: error.message 
//             });
//         }

//         console.log(`✅ Search Worker: Found ${data ? data.length : 0} results`);
//         res.json({ 
//             success: true, 
//             query,
//             resultCount: data ? data.length : 0,
//             data: data || [] 
//         });

//     } catch (error) {
//         console.error("❌ Search Worker: Unexpected error:", error);
//         res.status(500).json({ 
//             success: false, 
//             error: error.message 
//         });
//     }
// };

// /*
// HOW THESE METADATA WORKERS FUNCTION:

// GET METADATA WORKER:
// 1. 📋 Queries database for all file records
// 2. 📊 Adds summary statistics
// 3. 📤 Returns complete file list with stats

// GET BY ID WORKER:
// 1. 🔍 Finds specific file record by ID
// 2. 🎯 Enriches data with computed fields
// 3. 📤 Returns detailed file information

// UPDATE WORKER:
// 1. ✏️ Accepts updates for allowed fields only
// 2. 🔒 Prevents updating system fields
// 3. 💾 Saves changes with timestamp
// 4. 📤 Returns updated record

// DELETE WORKER:
// 1. 🗑️ Deletes metadata record
// 2. 📁 Optionally deletes actual files from storage
// 3. 🧹 Cleans up associated frame files
// 4. 📤 Confirms deletion

// USER METADATA WORKER:
// 1. 👤 Gets all files for specific user
// 2. 📊 Calculates user-specific statistics
// 3. 📤 Returns user's file collection

// SEARCH WORKER:
// 1. 🔍 Searches across file names and transcripts
// 2. 🎯 Supports different search types
// 3. 📤 Returns matching records

// THESE WORKERS PROVIDE:
// - Complete file inventory management
// - User-specific file collections
// - Search and discovery capabilities
// - Safe deletion with file cleanup options
// - Rich metadata with computed fields
// */















// controllers/metadata.controller.js - FIXED VERSION
import { supabase } from '../config/database.js';

// WORKER 1: Get all file metadata
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

        console.log(`Metadata Worker: Found ${data ? data.length : 0} records`);
        
        // Add some useful summary info
        const summary = {
            totalFiles: data ? data.length : 0,
            filesWithFrames: data ? data.filter(item => item.frames && item.frames.length > 0).length : 0,
            filesWithTranscripts: data ? data.filter(item => item.deepgram_transcript).length : 0,
            lastUpload: data && data.length > 0 ? data[0].created_at : null
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

// WORKER 2: Get metadata for a specific file
export const getMetadataById = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Metadata Worker: Getting record for ID ${id}`);

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
            console.log("Metadata Worker: No record found");
            return res.status(404).json({ 
                success: false, 
                error: "File record not found" 
            });
        }

        // Add some computed information
        const enrichedData = {
            ...data,
            hasFrames: !!(data.frames && data.frames.length > 0),
            frameCount: data.frames ? data.frames.length : 0,
            hasTranscript: !!data.deepgram_transcript,
            transcriptWordCount: data.deepgram_transcript ? data.deepgram_transcript.split(' ').length : 0,
            processingStatus: {
                uploaded: !!data.video_url,
                framesExtracted: !!(data.frames && data.frames.length > 0),
                transcribed: !!data.deepgram_transcript,
                fullyProcessed: !!(data.frames && data.frames.length > 0 && data.deepgram_transcript)
            }
        };

        console.log("Metadata Worker: Record found and enriched");
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

// WORKER 3: Update metadata for a file
export const updateMetadata = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        console.log(`Metadata Update Worker: Updating record ${id}`);

        // Remove any fields that shouldn't be updated directly
        const allowedFields = [
            'original_name', 
            'description', 
            'tags', 
            'custom_metadata'
        ];
        
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

        // Add update timestamp
        filteredUpdates.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('metadata')
            .update(filteredUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error("Metadata Update Worker: Update failed:", error);
            return res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }

        console.log("Metadata Update Worker: Record updated successfully");
        res.json({ 
            success: true, 
            message: "Metadata updated successfully",
            data 
        });

    } catch (error) {
        console.error("Metadata Update Worker: Unexpected error:", error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// WORKER 4: Delete a file record
export const deleteMetadata = async (req, res) => {
    try {
        const { id } = req.params;
        const { deleteFile = false } = req.query;
        
        console.log(`Metadata Delete Worker: Deleting record ${id}`);

        // First, get the record to know what files to delete
        const { data: record, error: fetchError } = await supabase
            .from('metadata')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !record) {
            console.log("Metadata Delete Worker: Record not found");
            return res.status(404).json({ 
                success: false, 
                error: "File record not found" 
            });
        }

        // If requested, delete the actual files from storage
        if (deleteFile === 'true') {
            console.log("Metadata Delete Worker: Deleting actual files...");
            
            // Delete video file
            if (record.video_name) {
                await supabase.storage
                    .from('projectai')
                    .remove([`videos/${record.video_name}`]);
                console.log(`Deleted video: ${record.video_name}`);
            }

            // Delete frame files
            if (record.frames && record.frames.length > 0) {
                const framePaths = record.frames.map(frame => `frames/${frame.frame_id}`);
                await supabase.storage
                    .from('projectai')
                    .remove(framePaths);
                console.log(`Deleted ${framePaths.length} frame files`);
            }
        }

        // Delete the metadata record
        const { error: deleteError } = await supabase
            .from('metadata')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error("Metadata Delete Worker: Delete failed:", deleteError);
            return res.status(500).json({ 
                success: false, 
                error: deleteError.message 
            });
        }

        console.log("Metadata Delete Worker: Record deleted successfully");
        res.json({ 
            success: true, 
            message: deleteFile === 'true' 
                ? "Record and associated files deleted successfully" 
                : "Record deleted successfully (files preserved)",
            deletedRecord: {
                id: record.id,
                video_name: record.video_name,
                original_name: record.original_name
            }
        });

    } catch (error) {
        console.error("Metadata Delete Worker: Unexpected error:", error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// WORKER 5: Get metadata for specific user - FIXED
export const getMetadataByUser = async (req, res) => {
    try {
        const { userId } = req.params;
        console.log(`User Metadata Worker: Getting records for user ${userId}`);

        const { data, error } = await supabase
            .from('metadata')
            .select('*')
            .eq('user_id_string', userId) // FIXED: was 'user_id', now 'user_id_string'
            .order('created_at', { ascending: false });

        if (error) {
            console.error("User Metadata Worker: Query failed:", error);
            return res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }

        // User-specific summary
        const userSummary = {
            totalFiles: data ? data.length : 0,
            totalStorage: data ? data.reduce((sum, item) => sum + (item.file_size || 0), 0) : 0,
            recentActivity: data && data.length > 0 ? data[0].created_at : null,
            processingStatus: {
                uploaded: data ? data.length : 0,
                withFrames: data ? data.filter(item => item.frames && item.frames.length > 0).length : 0,
                withTranscripts: data ? data.filter(item => item.deepgram_transcript).length : 0
            }
        };

        console.log(`User Metadata Worker: Found ${data ? data.length : 0} files for user`);
        res.json({ 
            success: true, 
            userId,
            summary: userSummary,
            data: data || [] 
        });

    } catch (error) {
        console.error("User Metadata Worker: Unexpected error:", error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// WORKER 6: Search metadata
export const searchMetadata = async (req, res) => {
    try {
        const { q: query, type, limit = 50 } = req.query;
        
        if (!query) {
            return res.status(400).json({
                success: false,
                error: "Search query is required"
            });
        }

        console.log(`Search Worker: Searching for "${query}"`);

        let searchQuery = supabase
            .from('metadata')
            .select('*');

        // Search in different fields based on type
        if (type === 'name') {
            searchQuery = searchQuery.or(`original_name.ilike.%${query}%,video_name.ilike.%${query}%`);
        } else if (type === 'transcript') {
            searchQuery = searchQuery.ilike('deepgram_transcript', `%${query}%`);
        } else {
            // Search everywhere
            searchQuery = searchQuery.or(
                `original_name.ilike.%${query}%,video_name.ilike.%${query}%,deepgram_transcript.ilike.%${query}%`
            );
        }

        const { data, error } = await searchQuery
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));

        if (error) {
            console.error("Search Worker: Search failed:", error);
            return res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }

        console.log(`Search Worker: Found ${data ? data.length : 0} results`);
        res.json({ 
            success: true, 
            query,
            resultCount: data ? data.length : 0,
            data: data || [] 
        });

    } catch (error) {
        console.error("Search Worker: Unexpected error:", error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// NEW WORKER 7: Get user video relationships using SQL function
export const getUserVideoRelationships = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Get user summary using the SQL function
        const { data: summaryData, error: summaryError } = await supabase
            .rpc('get_user_summary', { input_user_id_string: userId });

        if (summaryError) {
            console.error("Error getting user summary:", summaryError);
        }

        // Get all videos for the user
        const { data: videos, error: videosError } = await supabase
            .from('metadata')
            .select('*')
            .eq('user_id_string', userId)
            .order('created_at', { ascending: false });

        if (videosError) {
            return res.status(500).json({ success: false, error: videosError.message });
        }

        // Organize videos by processing status
        const videosByStatus = {
            uploaded: videos.filter(v => (!v.frames || v.frames.length === 0) && !v.deepgram_transcript),
            frames_extracted: videos.filter(v => v.frames && v.frames.length > 0 && !v.deepgram_transcript),
            fully_processed: videos.filter(v => v.frames && v.frames.length > 0 && v.deepgram_transcript)
        };

        res.json({
            success: true,
            userSummary: summaryData || {},
            totalVideos: videos.length,
            videosByStatus,
            videos
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// NEW WORKER 8: Get all users with their video counts
export const getAllUsersWithVideos = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('user_activity_summary')
            .select('*')
            .order('video_count', { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        res.json({
            success: true,
            users: data,
            totalUsers: data.length,
            totalVideosAcrossAllUsers: data.reduce((sum, user) => sum + user.video_count, 0)
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};