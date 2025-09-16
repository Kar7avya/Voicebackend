// controllers/frames.controller.js - THE FRAME PROCESSING WORKERS
// "We extract pictures from videos and analyze them!"

import fs, { promises as fsp } from "fs";
import path from "path";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import { supabase } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// WORKER 1: Extract frames from a video
export const extractFrames = async (req, res) => {
    console.log("🎬 Frame Extraction Worker: Starting job...");
    const { videoName } = req.body;

    if (!videoName) {
        console.log("❌ Frame Extraction Worker: No video name provided");
        return res.status(400).send("videoName is required");
    }

    const videoPath = path.join(__dirname, "../uploads", videoName);
    const framesDir = path.join(__dirname, '../frames');

    try {
        console.log("☁️ Frame Extraction Worker: Downloading video from cloud storage...");
        
        // Download video from Supabase cloud storage
        const { data, error: downloadError } = await supabase.storage
            .from('projectai')
            .download(`videos/${videoName}`);

        if (downloadError || !data) {
            console.error("❌ Frame Extraction Worker: Failed to download video", downloadError);
            return res.status(404).send("Failed to download video from Supabase");
        }

        // Save video temporarily to local storage
        await fsp.writeFile(videoPath, Buffer.from(await data.arrayBuffer()));
        console.log("📁 Frame Extraction Worker: Video saved temporarily");

        // Use FFmpeg to extract frames (1 frame every 5 seconds)
        const command = `ffmpeg -i "${videoPath}" -vf "fps=1/5" "${path.join(framesDir, 'frame_%04d.jpg')}"`;
        console.log("⚡ Frame Extraction Worker: Running FFmpeg command...");
        
        exec(command, async (err) => {
            if (err) {
                console.error("❌ Frame Extraction Worker: FFmpeg failed:", err);
                await fsp.unlink(videoPath).catch(() => {});
                return res.status(500).send("Failed to extract frames");
            }

            try {
                console.log("📸 Frame Extraction Worker: Frames extracted! Processing them...");
                
                const frameMetadata = [];
                const frameFiles = fs.readdirSync(framesDir);
                
                // Upload each frame to cloud storage
                for (const file of frameFiles) {
                    const fullPath = path.join(framesDir, file);
                    const fileBuffer = fs.readFileSync(fullPath);
                    const storagePath = `frames/${file}`;

                    console.log(`☁️ Frame Extraction Worker: Uploading ${file} to cloud...`);

                    const { error: uploadError } = await supabase.storage
                        .from('projectai')
                        .upload(storagePath, fileBuffer, {
                            contentType: 'image/jpeg',
                            upsert: true,
                        });

                    if (uploadError) {
                        console.error(`❌ Failed to upload ${file}`, uploadError);
                        continue;
                    }

                    // Get public URL for the frame
                    const { data: publicUrlData } = supabase
                        .storage
                        .from("projectai")
                        .getPublicUrl(storagePath);

                    frameMetadata.push({
                        frame_id: file,
                        frame_path: storagePath,
                        frame_created_at: new Date().toISOString(),
                        frame_analysis: null, // Will be filled by analysis worker later
                        frame_url: publicUrlData.publicUrl
                    });
                    
                    // Clean up local frame file
                    fs.unlinkSync(fullPath);
                    console.log(`🧹 Frame Extraction Worker: Cleaned up ${file}`);
                }

                // Update database with frame information
                console.log("💾 Frame Extraction Worker: Saving frame metadata to database...");
                const { error: updateError } = await supabase
                    .from("metadata")
                    .update({ frames: frameMetadata })
                    .eq("video_name", videoName);

                if (updateError) {
                    console.error("❌ Frame Extraction Worker: Database update failed:", updateError);
                    return res.status(500).send("Failed to update metadata");
                }

                // Clean up temporary video file
                await fsp.unlink(videoPath);
                console.log("🧹 Frame Extraction Worker: Cleaned up temporary video file");

                console.log("✅ Frame Extraction Worker: Job completed successfully!");
                res.json({
                    message: "Frames extracted and metadata updated",
                    frameCount: frameMetadata.length,
                    frames: frameMetadata
                });

            } catch (uploadErr) {
                console.error("❌ Frame Extraction Worker: Upload process failed:", uploadErr);
                res.status(500).send("Frame upload failed");
            }
        });
    } catch (err) {
        console.error("❌ Frame Extraction Worker: Unexpected error:", err);
        res.status(500).send("Internal server error");
    }
};

// WORKER 2: Analyze all existing frames using AI
export const analyzeAllFrames = async (req, res) => {
    try {
        console.log("🔍 Frame Analysis Worker: Starting analysis job...");

        // Get list of all frames from cloud storage
        const { data: frameList, error: listError } = await supabase
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

            // Download frame from cloud storage
            const { data, error: downloadError } = await supabase
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
                    // Find which video this frame belongs to
                    const { data: allVideos, error: fetchError } = await supabase
                        .from("metadata")
                        .select("id, frames");

                    if (fetchError) {
                        console.error("❌ Error fetching videos:", fetchError);
                        continue;
                    }

                    const video = allVideos.find(v =>
                        Array.isArray(v.frames) &&
                        v.frames.some(f => f.frame_id === item.name)
                    );

                    if (!video) {
                        console.warn(`⚠️ Frame Analysis Worker: No video found for frame ${item.name}`);
                        continue;
                    }

                    // Update the frame analysis in the video's metadata
                    const updatedFrames = video.frames.map(f =>
                        f.frame_id === item.name
                            ? { ...f, frame_analysis: description }
                            : f
                    );

                    await supabase
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