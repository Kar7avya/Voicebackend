// controllers/frames.controller.js - THE FRAME PROCESSING WORKERS
// "We extract pictures from videos and analyze them!"

import fs, { promises as fsp } from "fs";
import path from "path";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import { supabase } from '../config/database.js';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Extract user ID from JWT token
const extractUserIdFromToken = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    try {
        if (!JWT_SECRET) {
            console.warn("⚠️ JWT_SECRET not set, cannot verify token");
            return null;
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded.sub;
    } catch (err) {
        console.warn("❌ JWT Verification Failed:", err.message);
        return null;
    }
};

// Create service client for database operations
const createServiceClient = () => {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
    }
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
};

// WORKER 1: Extract frames from a video
export const extractFrames = async (req, res) => {
    console.log("🎬 Frame Extraction Worker: Starting job...");
    
    // Authentication check
    const userId = extractUserIdFromToken(req);
    if (!userId) {
        console.log("❌ Frame Extraction Worker: Authentication failed");
        return res.status(401).json({ error: "Authentication required" });
    }
    
    const { videoName } = req.body;

    if (!videoName) {
        console.log("❌ Frame Extraction Worker: No video name provided");
        return res.status(400).json({ error: "videoName is required" });
    }
    
    console.log(`👤 Frame Extraction Worker: User ID: ${userId}, Video: ${videoName}`);

    // Ensure frames directory exists
    const framesDir = path.join(__dirname, '../frames');
    if (!fs.existsSync(framesDir)) {
        await fsp.mkdir(framesDir, { recursive: true });
    }

    // Clean up any existing frames in the directory
    try {
        const existingFrames = fs.readdirSync(framesDir);
        for (const frameFile of existingFrames) {
            if (frameFile.startsWith('frame_')) {
                await fsp.unlink(path.join(framesDir, frameFile)).catch(() => {});
            }
        }
    } catch (err) {
        console.warn("⚠️ Could not clean frames directory:", err);
    }

    const videoPath = path.join(__dirname, "../uploads", `temp_${videoName}_${Date.now()}.mp4`);

    try {
        console.log("☁️ Frame Extraction Worker: Downloading video from cloud storage...");
        
        // Use service client to get metadata (bypasses RLS)
        const serviceClient = createServiceClient();
        
        // First, get the metadata to find the correct bucket path
        const { data: metadataRows, error: metadataError } = await serviceClient
            .from("metadata")
            .select("bucket_path, video_name, user_id")
            .eq("video_name", videoName)
            .eq("user_id", userId) // Verify ownership
            .limit(1);

        if (metadataError || !metadataRows || metadataRows.length === 0) {
            console.error("❌ Frame Extraction Worker: Metadata not found for video:", videoName);
            return res.status(404).json({ error: "Video metadata not found or access denied" });
        }

        const metadata = metadataRows[0];
        const bucketPath = metadata.bucket_path || `videos/${videoName}`;
        
        console.log(`📋 Frame Extraction Worker: Using bucket path: ${bucketPath}`);
        
        // Download video from Supabase cloud storage using service client
        const { data, error: downloadError } = await serviceClient.storage
            .from('projectai')
            .download(bucketPath);

        if (downloadError || !data) {
            console.error("❌ Frame Extraction Worker: Failed to download video", downloadError);
            return res.status(404).json({ error: "Failed to download video from Supabase: " + (downloadError?.message || "Unknown error") });
        }

        // Save video temporarily to local storage
        await fsp.writeFile(videoPath, Buffer.from(await data.arrayBuffer()));
        console.log("📁 Frame Extraction Worker: Video saved temporarily");

        // Use FFmpeg to extract frames (1 frame every 5 seconds)
        const command = `ffmpeg -i "${videoPath}" -vf "fps=1/5" -q:v 2 "${path.join(framesDir, 'frame_%04d.jpg')}"`;
        console.log("⚡ Frame Extraction Worker: Running FFmpeg command...");
        console.log(`   Command: ${command}`);
        
        exec(command, async (err, stdout, stderr) => {
            if (err) {
                console.error("❌ Frame Extraction Worker: FFmpeg failed:", err);
                console.error("   stderr:", stderr);
                await fsp.unlink(videoPath).catch(() => {});
                return res.status(500).json({ error: "Failed to extract frames: " + err.message });
            }
            
            console.log("✅ Frame Extraction Worker: FFmpeg completed successfully");

            try {
                console.log("📸 Frame Extraction Worker: Frames extracted! Processing them...");
                
                // Wait a bit for file system to sync
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const frameMetadata = [];
                const frameFiles = fs.readdirSync(framesDir)
                    .filter(file => file.startsWith('frame_') && file.endsWith('.jpg'))
                    .sort();

                console.log(`📊 Frame Extraction Worker: Found ${frameFiles.length} frames to process`);
                
                if (frameFiles.length === 0) {
                    console.warn("⚠️ Frame Extraction Worker: No frames found after extraction");
                    await fsp.unlink(videoPath).catch(() => {});
                    return res.status(500).json({ error: "No frames were extracted from the video" });
                }
                
                // Upload each frame to cloud storage
                for (const file of frameFiles) {
                    const fullPath = path.join(framesDir, file);
                    
                    // Check if file exists and is readable
                    if (!fs.existsSync(fullPath)) {
                        console.warn(`⚠️ Frame file not found: ${file}`);
                        continue;
                    }
                    
                    const fileBuffer = fs.readFileSync(fullPath);
                    const storagePath = `frames/${videoName}_${file}`;

                    console.log(`☁️ Frame Extraction Worker: Uploading ${file} to cloud...`);

                    // Use service client for storage operations
                    const storageServiceClient = createServiceClient();
                    const { error: uploadError } = await storageServiceClient.storage
                        .from('projectai')
                        .upload(storagePath, fileBuffer, {
                            contentType: 'image/jpeg',
                            upsert: true,
                        });

                    if (uploadError) {
                        console.error(`❌ Failed to upload ${file}:`, uploadError);
                        // Continue with other frames even if one fails
                        continue;
                    }

                    // Get public URL for the frame
                    const { data: publicUrlData } = storageServiceClient.storage
                        .from("projectai")
                        .getPublicUrl(storagePath);

                    frameMetadata.push({
                        frame_id: file,
                        frame_path: storagePath,
                        frame_created_at: new Date().toISOString(),
                        frame_analysis: null, // Will be filled by analysis worker later
                        frame_url: publicUrlData?.publicUrl || null
                    });
                    
                    // Clean up local frame file
                    try {
                        fs.unlinkSync(fullPath);
                        console.log(`🧹 Frame Extraction Worker: Cleaned up ${file}`);
                    } catch (unlinkErr) {
                        console.warn(`⚠️ Could not delete ${file}:`, unlinkErr);
                    }
                }

                if (frameMetadata.length === 0) {
                    console.error("❌ Frame Extraction Worker: No frames were successfully uploaded");
                    await fsp.unlink(videoPath).catch(() => {});
                    return res.status(500).json({ error: "Failed to upload any frames to storage" });
                }

                // Update database with frame information using service client
                console.log("💾 Frame Extraction Worker: Saving frame metadata to database...");
                const serviceClient = createServiceClient();
                const { error: updateError } = await serviceClient
                    .from("metadata")
                    .update({ frames: frameMetadata })
                    .eq("video_name", videoName)
                    .eq("user_id", userId); // Verify ownership

                if (updateError) {
                    console.error("❌ Frame Extraction Worker: Database update failed:", updateError);
                    await fsp.unlink(videoPath).catch(() => {});
                    return res.status(500).json({ error: "Failed to update metadata: " + updateError.message });
                }

                // Clean up temporary video file
                await fsp.unlink(videoPath).catch(() => {});
                console.log("🧹 Frame Extraction Worker: Cleaned up temporary video file");

                console.log("✅ Frame Extraction Worker: Job completed successfully!");
                res.json({
                    success: true,
                    message: "Frames extracted and metadata updated",
                    frameCount: frameMetadata.length,
                    frames: frameMetadata
                });

            } catch (uploadErr) {
                console.error("❌ Frame Extraction Worker: Upload process failed:", uploadErr);
                await fsp.unlink(videoPath).catch(() => {});
                res.status(500).json({ error: "Frame upload failed: " + uploadErr.message });
            }
        });
    } catch (err) {
        console.error("❌ Frame Extraction Worker: Unexpected error:", err);
        // Clean up video file if it exists
        try {
            if (fs.existsSync(videoPath)) {
                await fsp.unlink(videoPath);
            }
        } catch (cleanupErr) {
            console.warn("⚠️ Could not clean up video file:", cleanupErr);
        }
        res.status(500).json({ error: "Internal server error: " + err.message });
    }
};

// WORKER 2: Analyze all existing frames using AI
export const analyzeAllFrames = async (req, res) => {
    try {
        console.log("🔍 Frame Analysis Worker: Starting analysis job...");

        // Use service client for storage operations
        const serviceClient = createServiceClient();
        
        // Get list of all frames from cloud storage
        const { data: frameList, error: listError } = await serviceClient
            .storage
            .from("projectai")
            .list("frames", { limit: 100 });

        if (listError) {
            console.error("❌ Frame Analysis Worker: Could not list frames:", listError);
            return res.status(500).send("Could not list frames from Supabase.");
        }

        if (!frameList || frameList.length === 0) {
            console.log("📭 Frame Analysis Worker: No frames found");
            return res.status(404).send("No frames found to analyze.");
        }

        console.log(`🔍 Frame Analysis Worker: Found ${frameList.length} frames to analyze`);
        const analysisResults = [];

        // Analyze each frame
        for (const item of frameList) {
            console.log(`🔍 Frame Analysis Worker: Analyzing ${item.name}...`);

            // Download frame from cloud storage using service client
            const serviceClient = createServiceClient();
            const { data, error: downloadError } = await serviceClient
                .storage
                .from("projectai")
                .download(`frames/${item.name}`);

            if (downloadError) {
                console.error(`❌ Download error for ${item.name}:`, downloadError.message);
                continue;
            }

            // Convert frame to base64 for AI analysis
            const arrayBuffer = await data.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64 = buffer.toString("base64");

            if (!base64 || base64.length < 100) {
                console.warn(`⚠️ Frame Analysis Worker: Skipped ${item.name} - invalid image data`);
                continue;
            }

            // Send to HuggingFace AI for analysis
            const prompt = `Describe this image in one or two sentences. Focus on the main subjects, actions, and setting.`;

            try {
                console.log(`🤖 Frame Analysis Worker: Sending ${item.name} to AI...`);
                
                const hfResponse = await fetch("https://api-inference.huggingface.co/models/google/gemma-7b-it", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${process.env.HF_API_KEY}`
                    },
                    body: JSON.stringify({ 
                        inputs: prompt,
                        parameters: {
                            max_length: 100,
                            temperature: 0.7
                        }
                    })
                });

                const hfData = await hfResponse.json();
                const description = Array.isArray(hfData) && hfData[0]?.generated_text
                    ? hfData[0].generated_text
                    : (hfData.generated_text || "No description available");

                console.log(`✅ Frame Analysis Worker: ${item.name} analyzed successfully`);
                analysisResults.push({ name: item.name, description });

                // Update the database with analysis results
                try {
                    // Find which video this frame belongs to using service client
                    const dbServiceClient = createServiceClient();
                    const { data: allVideos, error: fetchError } = await dbServiceClient
                        .from("metadata")
                        .select("id, frames, user_id");

                    if (fetchError) {
                        console.error("❌ Error fetching videos:", fetchError);
                        continue;
                    }

                    const video = allVideos.find(v =>
                        Array.isArray(v.frames) &&
                        v.frames.some(f => f.frame_id === item.name || f.frame_path?.includes(item.name))
                    );

                    if (!video) {
                        console.warn(`⚠️ Frame Analysis Worker: No video found for frame ${item.name}`);
                        continue;
                    }

                    // Update the frame analysis in the video's metadata
                    const updatedFrames = video.frames.map(f =>
                        (f.frame_id === item.name || f.frame_path?.includes(item.name))
                            ? { ...f, frame_analysis: description }
                            : f
                    );

                    await dbServiceClient
                        .from("metadata")
                        .update({ frames: updatedFrames })
                        .eq("id", video.id);

                    console.log(`💾 Frame Analysis Worker: Updated database for ${item.name}`);

                } catch (updateError) {
                    console.error(`❌ Error updating metadata for frame ${item.name}:`, updateError);
                }

            } catch (aiError) {
                console.error(`❌ AI analysis failed for ${item.name}:`, aiError);
                analysisResults.push({ 
                    name: item.name, 
                    description: "Analysis failed", 
                    error: aiError.message 
                });
            }
        }

        console.log("✅ Frame Analysis Worker: All frames analyzed!");
        res.json({
            message: "Frame analysis complete and metadata updated",
            totalFrames: frameList.length,
            successfulAnalyses: analysisResults.length,
            analysisResults
        });

    } catch (err) {
        console.error("❌ Frame Analysis Worker: Job failed:", err);
        res.status(500).json({ 
            error: "Frame analysis failed", 
            details: err.message 
        });
    }
};

// HELPER FUNCTION: Get frames for a specific video
export const getFramesByVideo = async (req, res) => {
    try {
        const { videoId } = req.params;
        
        console.log(`📋 Frame Info Worker: Getting frames for video ${videoId}`);

        const { data: video, error } = await supabase
            .from("metadata")
            .select("frames, video_name")
            .eq("id", videoId)
            .single();

        if (error || !video) {
            return res.status(404).json({ error: "Video not found" });
        }

        res.json({
            videoName: video.video_name,
            frames: video.frames || [],
            frameCount: video.frames ? video.frames.length : 0
        });

    } catch (err) {
        console.error("❌ Frame Info Worker: Error:", err);
        res.status(500).json({ error: "Failed to get frames" });
    }
};

/*
HOW THESE WORKERS FUNCTION:

FRAME EXTRACTION WORKER:
1. 📥 Gets video name from request
2. ☁️ Downloads video from cloud storage  
3. ⚡ Uses FFmpeg to extract 1 frame every 5 seconds
4. ☁️ Uploads all frames back to cloud storage
5. 💾 Saves frame info to database
6. 🧹 Cleans up temporary files
7. ✅ Returns success with frame list

FRAME ANALYSIS WORKER:
1. 📋 Gets list of all frames from cloud storage
2. 📥 Downloads each frame
3. 🤖 Sends to AI for description
4. 💾 Updates database with analysis results
5. ✅ Returns analysis summary

THESE WORKERS NEED:
- FFmpeg installed on the system
- Supabase storage access
- HuggingFace API key for AI analysis
- Proper file permissions for temp directories
*/