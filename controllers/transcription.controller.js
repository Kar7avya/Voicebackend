// // // ============================================
// // // TRANSCRIPTION.CONTROLLER.JS - FIXED WITH AUTH
// // // ============================================

// // import fs, { promises as fsp } from "fs";
// // import path from "path";
// // import { exec } from "child_process";
// // import { promisify } from "util";
// // import { fileURLToPath } from "url";
// // import { Blob } from "buffer";
// // import { createClient } from '@supabase/supabase-js';
// // import jwt from 'jsonwebtoken';
// // import { elevenlabs, deepgram } from '../config/clients.js';
// // import { PAUSE_THRESHOLD } from '../utils/constants.js';

// // const __filename = fileURLToPath(import.meta.url);
// // const __dirname = path.dirname(__filename);
// // const execPromise = promisify(exec);

// // // Environment variables
// // const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
// // const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
// // const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

// // if (!JWT_SECRET || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
// //     console.error("CRITICAL: Missing Supabase environment variables!");
// // }

// // // Extract user ID from JWT token
// // const extractUserIdFromToken = (req) => {
// //     const authHeader = req.headers.authorization;
// //     if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
// //     const token = authHeader.split(' ')[1];
// //     try {
// //         const decoded = jwt.verify(token, JWT_SECRET);
// //         return decoded.sub;
// //     } catch (err) {
// //         console.warn("❌ JWT Verification Failed:", err.message);
// //         return null;
// //     }
// // };

// // // WORKER 1: Transcribe with Deepgram (WITH AUTH)
// // export const transcribeWithDeepgram = async (req, res) => {
// //     const { videoName } = req.body;

// //     if (!videoName) {
// //         console.log("❌ Deepgram Worker: No video name provided");
// //         return res.status(400).json({ error: "videoName is required" });
// //     }
    
// //     console.log(`🎤 Deepgram Worker: Starting transcription for ${videoName}`);

// //     // ✅ AUTHENTICATION CHECK
// //     const authHeader = req.headers.authorization;
// //     const userToken = authHeader ? authHeader.split(' ')[1] : null;
// //     const userId = extractUserIdFromToken(req);
    
// //     if (!userId || !userToken) {
// //         console.log("❌ Deepgram Worker: Authentication failed");
// //         return res.status(401).json({ 
// //             error: "Authentication failed. Please log in." 
// //         });
// //     }

// //     console.log(`👤 Deepgram Worker: User ID: ${userId}`);

// //     const videoPath = path.join(__dirname, "../uploads", videoName);
// //     const audioPath = path.join(__dirname, "../uploads", `audio_for_deepgram_${Date.now()}.mp3`);

// //     try {
// //         // ✅ CREATE AUTHENTICATED CLIENT
// //         const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
// //             global: { 
// //                 headers: { 
// //                     Authorization: `Bearer ${userToken}` 
// //                 } 
// //             }
// //         });

// //         // Find the metadata record WITH USER CHECK
// //         console.log(`🔍 Deepgram Worker: Looking for video: ${videoName}, user: ${userId}`);
        
// //         let { data: metadataRows, error: metadataError } = await authClient
// //             .from("metadata")
// //             .select("*")
// //             .eq("video_name", videoName)
// //             .eq("user_id", userId)
// //             .limit(1);

// //         if (metadataError) {
// //             console.log("❌ Deepgram Worker: Database error", metadataError);
// //             return res.status(500).json({ 
// //                 error: "Database error: " + metadataError.message 
// //             });
// //         }

// //         if (!metadataRows || metadataRows.length === 0) {
// //             console.log("❌ Deepgram Worker: No metadata found for this video");
// //             return res.status(404).json({ 
// //                 error: "No metadata entry found for this video",
// //                 videoName: videoName,
// //                 userId: userId
// //             });
// //         }

// //         const metadata = metadataRows[0];
// //         const metadataId = metadata.id;
// //         console.log(`📋 Deepgram Worker: Found metadata ID: ${metadataId}`);

// //         console.log("☁️ Deepgram Worker: Downloading video from cloud storage...");
        
// //         // Download video using authenticated client
// //         const bucketPath = metadata.bucket_path || `videos/${videoName}`;
// //         const { data, error: downloadError } = await authClient.storage
// //             .from("projectai")
// //             .download(bucketPath);

// //         if (downloadError) {
// //             console.log("❌ Deepgram Worker: Failed to download video", downloadError);
// //             return res.status(500).json({ 
// //                 error: "Failed to download video from Supabase: " + downloadError.message 
// //             });
// //         }

// //         // Save video temporarily
// //         const videoBuffer = Buffer.from(await data.arrayBuffer());
// //         await fsp.writeFile(videoPath, videoBuffer);
// //         console.log("📁 Deepgram Worker: Video downloaded temporarily");

// //         // Extract audio using FFmpeg
// //         const command = `ffmpeg -y -i "${videoPath}" -q:a 0 -map a "${audioPath}"`;
// //         console.log("⚡ Deepgram Worker: Extracting audio with FFmpeg...");
        
// //         try {
// //             await execPromise(command);
// //             console.log("✅ Deepgram Worker: Audio extracted successfully");
// //         } catch (ffmpegError) {
// //             console.log("❌ Deepgram Worker: FFmpeg error", ffmpegError);
// //             await fsp.unlink(videoPath).catch(() => {});
// //             return res.status(500).json({ 
// //                 error: "Audio extraction failed: " + ffmpegError.message 
// //             });
// //         }

// //         // Verify audio file was created
// //         if (!fs.existsSync(audioPath)) {
// //             console.log("❌ Deepgram Worker: Audio file not created");
// //             await fsp.unlink(videoPath).catch(() => {});
// //             return res.status(500).json({ error: "Audio file was not created" });
// //         }

// //         try {
// //             console.log("🎤 Deepgram Worker: Sending audio to Deepgram API...");
            
// //             // Check Deepgram client is initialized
// //             if (!deepgram || !deepgram.listen) {
// //                 console.log("❌ Deepgram Worker: Client not initialized");
// //                 throw new Error("Deepgram client not properly initialized");
// //             }

// //             // Read audio file and send to Deepgram
// //             const audioBuffer = fs.readFileSync(audioPath);
// //             const { result, error: deepgramError } = await deepgram.listen.prerecorded.transcribeFile(
// //                 audioBuffer,
// //                 {
// //                     model: "nova-2",
// //                     smart_format: true,
// //                     disfluencies: true,
// //                     punctuate: true,
// //                     filler_words: true,
// //                     word_details: true,
// //                 }
// //             );

// //             if (deepgramError) {
// //                 console.log("❌ Deepgram Worker: API error", deepgramError);
// //                 throw new Error("Deepgram API error: " + deepgramError.message);
// //             }

// //             console.log("📄 Deepgram Worker: Transcription received");

// //             // Process the transcription results
// //             const words = result?.results?.channels?.[0]?.alternatives?.[0]?.words || [];
// //             const fillerWords = result?.results?.channels?.[0]?.alternatives?.[0]?.filler_words || [];
// //             const allWords = [...words, ...fillerWords].sort((a, b) => a.start - b.start);
            
// //             console.log(`📊 Deepgram Worker: Processing ${allWords.length} words`);

// //             // Build transcript with pause detection
// //             let currentTranscriptParts = [];
// //             for (let i = 0; i < allWords.length; i++) {
// //                 if (i > 0) {
// //                     const gap = allWords[i].start - allWords[i - 1].end;
// //                     if (gap > PAUSE_THRESHOLD) {
// //                         currentTranscriptParts.push(`[PAUSE:${gap.toFixed(2)}s]`);
// //                     }
// //                 }
// //                 currentTranscriptParts.push(allWords[i].word);
// //             }
// //             const transcript = currentTranscriptParts.join(" ");

// //             if (!transcript || transcript.trim().length === 0) {
// //                 console.log("⚠️ Deepgram Worker: Empty transcript generated");
// //             }

// //             console.log("💾 Deepgram Worker: Saving transcript to database...");

// //             // Save to database using authenticated client
// //             const { error: updateError } = await authClient
// //                 .from("metadata")
// //                 .update({
// //                     deepgram_transcript: transcript,
// //                     deepgram_words: allWords,
// //                     transcription_completed_at: new Date().toISOString(),
// //                     updated_at: new Date().toISOString()
// //                 })
// //                 .eq("id", metadataId);

// //             if (updateError) {
// //                 console.log("❌ Deepgram Worker: Database update failed", updateError);
// //                 throw new Error("Failed to update metadata: " + updateError.message);
// //             }

// //             console.log("✅ Deepgram Worker: Transcription completed successfully!");

// //             // Clean up temporary files
// //             await fsp.unlink(audioPath).catch(e => console.log("Warning: Could not delete audio file", e));
// //             await fsp.unlink(videoPath).catch(e => console.log("Warning: Could not delete video file", e));

// //             res.json({ 
// //                 success: true,
// //                 message: "Transcription completed successfully",
// //                 transcript, 
// //                 wordCount: allWords.length,
// //                 words: allWords 
// //             });

// //         } catch (err) {
// //             console.log("❌ Deepgram Worker: Processing failed", err);
            
// //             // Clean up files on error
// //             await fsp.unlink(audioPath).catch(() => {});
// //             await fsp.unlink(videoPath).catch(() => {});
            
// //             return res.status(500).json({ 
// //                 error: "Deepgram processing failed: " + err.message,
// //                 details: err.stack
// //             });
// //         }

// //     } catch (err) {
// //         console.log("❌ Deepgram Worker: Unexpected error", err);
        
// //         // Clean up any remaining files
// //         await fsp.unlink(audioPath).catch(() => {});
// //         await fsp.unlink(videoPath).catch(() => {});
        
// //         res.status(500).json({ 
// //             error: "Server error: " + err.message,
// //             details: err.stack
// //         });
// //     }
// // };

// // // WORKER 2: Transcribe with ElevenLabs (WITH AUTH)
// // export const transcribeWithElevenLabs = async (req, res) => {
// //     const { videoName } = req.body;
    
// //     if (!videoName) {
// //         console.log("❌ ElevenLabs Worker: No video name provided");
// //         return res.status(400).json({ error: "videoName is required" });
// //     }

// //     console.log(`🎙️ ElevenLabs Worker: Starting transcription for ${videoName}`);

// //     // ✅ AUTHENTICATION CHECK
// //     const authHeader = req.headers.authorization;
// //     const userToken = authHeader ? authHeader.split(' ')[1] : null;
// //     const userId = extractUserIdFromToken(req);
    
// //     if (!userId || !userToken) {
// //         console.log("❌ ElevenLabs Worker: Authentication failed");
// //         return res.status(401).json({ 
// //             error: "Authentication failed. Please log in." 
// //         });
// //     }

// //     console.log(`👤 ElevenLabs Worker: User ID: ${userId}`);

// //     const videoPath = path.join(__dirname, "../uploads", videoName);
// //     const audioPath = path.join(__dirname, "../uploads", `audio_for_11labs_${Date.now()}.mp3`);

// //     try {
// //         // ✅ CREATE AUTHENTICATED CLIENT
// //         const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
// //             global: { 
// //                 headers: { 
// //                     Authorization: `Bearer ${userToken}` 
// //                 } 
// //             }
// //         });

// //         // Find metadata WITH USER CHECK
// //         console.log(`🔍 ElevenLabs Worker: Looking for video: ${videoName}, user: ${userId}`);
        
// //         const { data: metadataRows, error: metadataError } = await authClient
// //             .from("metadata")
// //             .select("*")
// //             .eq("video_name", videoName)
// //             .eq("user_id", userId)
// //             .limit(1);

// //         if (metadataError || !metadataRows || metadataRows.length === 0) {
// //             console.log("❌ ElevenLabs Worker: No metadata found");
// //             return res.status(404).json({ 
// //                 error: "No metadata entry found for this video",
// //                 videoName: videoName,
// //                 userId: userId
// //             });
// //         }

// //         const metadata = metadataRows[0];
// //         console.log(`📋 ElevenLabs Worker: Found metadata ID: ${metadata.id}`);

// //         console.log("☁️ ElevenLabs Worker: Downloading video...");
        
// //         // Download video using authenticated client
// //         const bucketPath = metadata.bucket_path || `videos/${videoName}`;
// //         const { data, error: downloadError } = await authClient.storage
// //             .from("projectai")
// //             .download(bucketPath);

// //         if (downloadError) {
// //             console.log("❌ ElevenLabs Worker: Download failed", downloadError);
// //             return res.status(500).json({ 
// //                 error: "Failed to download video from Supabase: " + downloadError.message 
// //             });
// //         }

// //         // Save video temporarily
// //         const videoBuffer = Buffer.from(await data.arrayBuffer());
// //         await fsp.writeFile(videoPath, videoBuffer);
// //         console.log("📁 ElevenLabs Worker: Video saved temporarily");

// //         // Extract audio using FFmpeg
// //         const command = `ffmpeg -y -i "${videoPath}" -q:a 0 -map a "${audioPath}"`;
// //         console.log("⚡ ElevenLabs Worker: Extracting audio...");
        
// //         try {
// //             await execPromise(command);
// //             console.log("✅ ElevenLabs Worker: Audio extracted successfully");
// //         } catch (ffmpegError) {
// //             console.log("❌ ElevenLabs Worker: FFmpeg error", ffmpegError);
// //             await fsp.unlink(videoPath).catch(() => {});
// //             return res.status(500).json({ 
// //                 error: "Audio extraction failed: " + ffmpegError.message 
// //             });
// //         }

// //         // Check if audio file was created
// //         if (!fs.existsSync(audioPath)) {
// //             console.log("❌ ElevenLabs Worker: Audio file not created");
// //             await fsp.unlink(videoPath).catch(() => {});
// //             return res.status(500).json({ error: "Audio file was not created" });
// //         }

// //         try {
// //             console.log("🎙️ ElevenLabs Worker: Sending to ElevenLabs API...");
            
// //             // Check ElevenLabs client is initialized
// //             if (!elevenlabs || !elevenlabs.speechToText) {
// //                 console.log("❌ ElevenLabs Worker: Client not initialized");
// //                 throw new Error("ElevenLabs client not properly initialized");
// //             }

// //             // Read audio and create blob for ElevenLabs
// //             const buffer = fs.readFileSync(audioPath);
// //             const audioBlob = new Blob([buffer], { type: "audio/mpeg" });

// //             // Send to ElevenLabs for transcription
// //             const transcriptionResult = await elevenlabs.speechToText.convert({
// //                 file: audioBlob,
// //                 modelId: "scribe_v1",
// //                 tagAudioEvents: true,
// //                 languageCode: "eng",
// //                 diarize: true,
// //             });

// //             console.log("📄 ElevenLabs Worker: Transcription received");

// //             // Process results with pause detection
// //             let elevenLabsTranscript = "";
// //             let wordCount = 0;

// //             if (transcriptionResult && transcriptionResult.words && Array.isArray(transcriptionResult.words)) {
// //                 const words = transcriptionResult.words;
// //                 wordCount = words.length;
// //                 let currentTranscriptParts = [];
                
// //                 console.log(`📊 ElevenLabs Worker: Processing ${wordCount} words`);

// //                 for (let i = 0; i < words.length; i++) {
// //                     const word = words[i];
// //                     if (i > 0) {
// //                         const prevWord = words[i - 1];
// //                         const gap = word.start - prevWord.end;
// //                         if (gap > PAUSE_THRESHOLD) {
// //                             currentTranscriptParts.push(`[PAUSE:${gap.toFixed(2)}s]`);
// //                         }
// //                     }
// //                     currentTranscriptParts.push(word.text);
// //                 }
// //                 elevenLabsTranscript = currentTranscriptParts.join(' ');
// //             } else if (transcriptionResult?.text) {
// //                 elevenLabsTranscript = transcriptionResult.text;
// //                 console.log("📝 ElevenLabs Worker: Using plain text result");
// //             } else {
// //                 elevenLabsTranscript = "No transcription available";
// //                 console.log("⚠️ ElevenLabs Worker: Empty transcription result");
// //             }

// //             console.log("💾 ElevenLabs Worker: Saving to database...");

// //             // Save to database using authenticated client
// //             const { error: updateError } = await authClient
// //                 .from("metadata")
// //                 .update({
// //                     elevenlabs_transcript: elevenLabsTranscript,
// //                     updated_at: new Date().toISOString()
// //                 })
// //                 .eq("id", metadata.id);

// //             if (updateError) {
// //                 console.warn("⚠️ ElevenLabs Worker: Failed to update metadata", updateError);
// //             }

// //             console.log("✅ ElevenLabs Worker: Transcription completed!");
            
// //             // Clean up temporary files before sending response
// //             await fsp.unlink(audioPath).catch(e => console.log("Warning: Could not delete audio file", e));
// //             await fsp.unlink(videoPath).catch(e => console.log("Warning: Could not delete video file", e));

// //             res.json({ 
// //                 success: true,
// //                 message: "ElevenLabs transcription completed",
// //                 transcript: elevenLabsTranscript,
// //                 wordCount: wordCount,
// //                 metadata: {
// //                     service: "ElevenLabs",
// //                     model: "scribe_v1",
// //                     completedAt: new Date().toISOString()
// //                 }
// //             });
            
// //         } catch (err) {
// //             console.log("❌ ElevenLabs Worker: Processing failed", err);
            
// //             // Clean up files on error
// //             await fsp.unlink(audioPath).catch(() => {});
// //             await fsp.unlink(videoPath).catch(() => {});
            
// //             return res.status(500).json({ 
// //                 error: "ElevenLabs processing failed: " + err.message,
// //                 details: err.stack
// //             });
// //         }

// //     } catch (err) {
// //         console.log("❌ ElevenLabs Worker: Unexpected error", err);
        
// //         // Clean up any remaining files
// //         await fsp.unlink(audioPath).catch(() => {});
// //         await fsp.unlink(videoPath).catch(() => {});
        
// //         res.status(500).json({ 
// //             error: "Server error: " + err.message,
// //             details: err.stack
// //         });
// //     }
// // };

// // // HELPER: Get transcription status for a video (WITH AUTH)
// // export const getTranscriptionStatus = async (req, res) => {
// //     try {
// //         const { videoName } = req.params;
        
// //         console.log(`📋 Transcription Status Worker: Checking ${videoName}`);

// //         // ✅ AUTHENTICATION CHECK
// //         const authHeader = req.headers.authorization;
// //         const userToken = authHeader ? authHeader.split(' ')[1] : null;
// //         const userId = extractUserIdFromToken(req);
        
// //         if (!userId || !userToken) {
// //             return res.status(401).json({ 
// //                 error: "Authentication required" 
// //             });
// //         }

// //         // ✅ CREATE AUTHENTICATED CLIENT
// //         const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
// //             global: { 
// //                 headers: { 
// //                     Authorization: `Bearer ${userToken}` 
// //                 } 
// //             }
// //         });

// //         const { data, error } = await authClient
// //             .from("metadata")
// //             .select("deepgram_transcript, transcription_completed_at, video_name")
// //             .eq("video_name", videoName)
// //             .eq("user_id", userId)
// //             .single();

// //         if (error) {
// //             console.log("❌ Transcription Status Worker: Database error", error);
// //             return res.status(500).json({ error: "Database error: " + error.message });
// //         }

// //         if (!data) {
// //             console.log("❌ Transcription Status Worker: Video not found");
// //             return res.status(404).json({ error: "Video not found" });
// //         }

// //         const hasTranscript = !!data.deepgram_transcript;
        
// //         res.json({
// //             videoName: data.video_name,
// //             hasTranscript,
// //             transcriptionCompleted: hasTranscript,
// //             completedAt: data.transcription_completed_at,
// //             transcript: hasTranscript ? data.deepgram_transcript : null
// //         });

// //     } catch (err) {
// //         console.log("❌ Transcription Status Worker: Error", err);
// //         res.status(500).json({ 
// //             error: "Failed to get transcription status: " + err.message 
// //         });
// //     }
// // };

// // ============================================
// // TRANSCRIPTION.CONTROLLER.JS - USING SERVICE ROLE FOR UPDATES
// // ============================================

// import fs, { promises as fsp } from "fs";
// import path from "path";
// import { exec } from "child_process";
// import { promisify } from "util";
// import { fileURLToPath } from "url";
// import { Blob } from "buffer";
// import { createClient } from '@supabase/supabase-js';
// import jwt from 'jsonwebtoken';
// import { elevenlabs, deepgram } from '../config/clients.js';
// import { PAUSE_THRESHOLD } from '../utils/constants.js';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// const execPromise = promisify(exec);

// // Environment variables
// const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
// const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
// const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
// const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // ADD THIS

// if (!JWT_SECRET || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
//     console.error("CRITICAL: Missing Supabase environment variables!");
// }

// // Extract user ID from JWT token
// const extractUserIdFromToken = (req) => {
//     const authHeader = req.headers.authorization;
//     if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
//     const token = authHeader.split(' ')[1];
//     try {
//         const decoded = jwt.verify(token, JWT_SECRET);
//         return decoded.sub;
//     } catch (err) {
//         console.warn("❌ JWT Verification Failed:", err.message);
//         return null;
//     }
// };

// // Create service client (bypasses RLS)
// const createServiceClient = () => {
//     return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
//         auth: {
//             autoRefreshToken: false,
//             persistSession: false
//         }
//     });
// };

// // WORKER 1: Transcribe with Deepgram (WITH AUTH)
// export const transcribeWithDeepgram = async (req, res) => {
//     const { videoName } = req.body;

//     if (!videoName) {
//         console.log("❌ Deepgram Worker: No video name provided");
//         return res.status(400).json({ error: "videoName is required" });
//     }
    
//     console.log(`\n🎤 Deepgram Worker: Starting transcription for ${videoName}`);

//     // ✅ AUTHENTICATION CHECK
//     const authHeader = req.headers.authorization;
//     const userToken = authHeader ? authHeader.split(' ')[1] : null;
//     const userId = extractUserIdFromToken(req);
    
//     if (!userId || !userToken) {
//         console.log("❌ Deepgram Worker: Authentication failed");
//         return res.status(401).json({ 
//             error: "Authentication failed. Please log in." 
//         });
//     }

//     console.log(`👤 Deepgram Worker: User ID: ${userId}`);

//     const videoPath = path.join(__dirname, "../uploads", videoName);
//     const audioPath = path.join(__dirname, "../uploads", `audio_for_deepgram_${Date.now()}.mp3`);

//     try {
//         // ✅ CREATE AUTHENTICATED CLIENT FOR READING
//         const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
//             global: { 
//                 headers: { 
//                     Authorization: `Bearer ${userToken}` 
//                 } 
//             }
//         });

//         // Find the metadata record WITH USER CHECK
//         console.log(`🔍 Deepgram Worker: Looking for video: ${videoName}, user: ${userId}`);
        
//         let { data: metadataRows, error: metadataError } = await authClient
//             .from("metadata")
//             .select("*")
//             .eq("video_name", videoName)
//             .eq("user_id", userId)
//             .limit(1);

//         if (metadataError) {
//             console.log("❌ Deepgram Worker: Database error", metadataError);
//             return res.status(500).json({ 
//                 error: "Database error: " + metadataError.message 
//             });
//         }

//         if (!metadataRows || metadataRows.length === 0) {
//             console.log("❌ Deepgram Worker: No metadata found for this video");
//             return res.status(404).json({ 
//                 error: "No metadata entry found for this video",
//                 videoName: videoName,
//                 userId: userId
//             });
//         }

//         const metadata = metadataRows[0];
//         const metadataId = metadata.id;
//         console.log(`📋 Deepgram Worker: Found metadata ID: ${metadataId}`);

//         console.log("☁️ Deepgram Worker: Downloading video from cloud storage...");
        
//         // Download video using authenticated client
//         const bucketPath = metadata.bucket_path || `videos/${videoName}`;
//         const { data, error: downloadError } = await authClient.storage
//             .from("projectai")
//             .download(bucketPath);

//         if (downloadError) {
//             console.log("❌ Deepgram Worker: Failed to download video", downloadError);
//             return res.status(500).json({ 
//                 error: "Failed to download video from Supabase: " + downloadError.message 
//             });
//         }

//         // Save video temporarily
//         const videoBuffer = Buffer.from(await data.arrayBuffer());
//         await fsp.writeFile(videoPath, videoBuffer);
//         console.log("📁 Deepgram Worker: Video downloaded temporarily");

//         // Extract audio using FFmpeg
//         const command = `ffmpeg -y -i "${videoPath}" -q:a 0 -map a "${audioPath}"`;
//         console.log("⚡ Deepgram Worker: Extracting audio with FFmpeg...");
        
//         try {
//             await execPromise(command);
//             console.log("✅ Deepgram Worker: Audio extracted successfully");
//         } catch (ffmpegError) {
//             console.log("❌ Deepgram Worker: FFmpeg error", ffmpegError);
//             await fsp.unlink(videoPath).catch(() => {});
//             return res.status(500).json({ 
//                 error: "Audio extraction failed: " + ffmpegError.message 
//             });
//         }

//         // Verify audio file was created
//         if (!fs.existsSync(audioPath)) {
//             console.log("❌ Deepgram Worker: Audio file not created");
//             await fsp.unlink(videoPath).catch(() => {});
//             return res.status(500).json({ error: "Audio file was not created" });
//         }

//         try {
//             console.log("🎤 Deepgram Worker: Sending audio to Deepgram API...");
            
//             // Check Deepgram client is initialized
//             if (!deepgram || !deepgram.listen) {
//                 console.log("❌ Deepgram Worker: Client not initialized");
//                 throw new Error("Deepgram client not properly initialized");
//             }

//             // Read audio file and send to Deepgram
//             const audioBuffer = fs.readFileSync(audioPath);
//             const { result, error: deepgramError } = await deepgram.listen.prerecorded.transcribeFile(
//                 audioBuffer,
//                 {
//                     model: "nova-2",
//                     smart_format: true,
//                     disfluencies: true,
//                     punctuate: true,
//                     filler_words: true,
//                     word_details: true,
//                 }
//             );

//             if (deepgramError) {
//                 console.log("❌ Deepgram Worker: API error", deepgramError);
//                 throw new Error("Deepgram API error: " + deepgramError.message);
//             }

//             console.log("📄 Deepgram Worker: Transcription received");

//             // Process the transcription results
//             const words = result?.results?.channels?.[0]?.alternatives?.[0]?.words || [];
//             const fillerWords = result?.results?.channels?.[0]?.alternatives?.[0]?.filler_words || [];
//             const allWords = [...words, ...fillerWords].sort((a, b) => a.start - b.start);
            
//             console.log(`📊 Deepgram Worker: Processing ${allWords.length} words`);

//             // Build transcript with pause detection
//             let currentTranscriptParts = [];
//             for (let i = 0; i < allWords.length; i++) {
//                 if (i > 0) {
//                     const gap = allWords[i].start - allWords[i - 1].end;
//                     if (gap > PAUSE_THRESHOLD) {
//                         currentTranscriptParts.push(`[PAUSE:${gap.toFixed(2)}s]`);
//                     }
//                 }
//                 currentTranscriptParts.push(allWords[i].word);
//             }
//             const transcript = currentTranscriptParts.join(" ");

//             if (!transcript || transcript.trim().length === 0) {
//                 console.log("⚠️ Deepgram Worker: Empty transcript generated");
//             }

//             console.log("💾 Deepgram Worker: Saving transcript to database...");

//             // ✅ USE SERVICE ROLE FOR UPDATE (BYPASSES RLS)
//             const serviceClient = createServiceClient();
//             const { error: updateError } = await serviceClient
//                 .from("metadata")
//                 .update({
//                     deepgram_transcript: transcript,
//                     deepgram_words: allWords,
//                     transcription_completed_at: new Date().toISOString(),
//                     updated_at: new Date().toISOString()
//                 })
//                 .eq("id", metadataId)
//                 .eq("user_id", userId); // Still verify ownership

//             if (updateError) {
//                 console.log("❌ Deepgram Worker: Database update failed", updateError);
//                 throw new Error("Failed to update metadata: " + updateError.message);
//             }

//             console.log("✅ Deepgram Worker: Transcription completed successfully!\n");

//             // Clean up temporary files
//             await fsp.unlink(audioPath).catch(e => console.log("Warning: Could not delete audio file", e));
//             await fsp.unlink(videoPath).catch(e => console.log("Warning: Could not delete video file", e));

//             res.json({ 
//                 success: true,
//                 message: "Transcription completed successfully",
//                 transcript, 
//                 wordCount: allWords.length,
//                 words: allWords 
//             });

//         } catch (err) {
//             console.log("❌ Deepgram Worker: Processing failed", err);
            
//             // Clean up files on error
//             await fsp.unlink(audioPath).catch(() => {});
//             await fsp.unlink(videoPath).catch(() => {});
            
//             return res.status(500).json({ 
//                 error: "Deepgram processing failed: " + err.message,
//                 details: err.stack
//             });
//         }

//     } catch (err) {
//         console.log("❌ Deepgram Worker: Unexpected error", err);
        
//         // Clean up any remaining files
//         await fsp.unlink(audioPath).catch(() => {});
//         await fsp.unlink(videoPath).catch(() => {});
        
//         res.status(500).json({ 
//             error: "Server error: " + err.message,
//             details: err.stack
//         });
//     }
// };

// // WORKER 2: Transcribe with ElevenLabs (WITH AUTH)
// export const transcribeWithElevenLabs = async (req, res) => {
//     const { videoName } = req.body;
    
//     if (!videoName) {
//         console.log("❌ ElevenLabs Worker: No video name provided");
//         return res.status(400).json({ error: "videoName is required" });
//     }

//     console.log(`\n🎙️ ElevenLabs Worker: Starting transcription for ${videoName}`);

//     // ✅ AUTHENTICATION CHECK
//     const authHeader = req.headers.authorization;
//     const userToken = authHeader ? authHeader.split(' ')[1] : null;
//     const userId = extractUserIdFromToken(req);
    
//     if (!userId || !userToken) {
//         console.log("❌ ElevenLabs Worker: Authentication failed");
//         return res.status(401).json({ 
//             error: "Authentication failed. Please log in." 
//         });
//     }

//     console.log(`👤 ElevenLabs Worker: User ID: ${userId}`);

//     const videoPath = path.join(__dirname, "../uploads", videoName);
//     const audioPath = path.join(__dirname, "../uploads", `audio_for_11labs_${Date.now()}.mp3`);

//     try {
//         // ✅ CREATE AUTHENTICATED CLIENT FOR READING
//         const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
//             global: { 
//                 headers: { 
//                     Authorization: `Bearer ${userToken}` 
//                 } 
//             }
//         });

//         // Find metadata WITH USER CHECK
//         console.log(`🔍 ElevenLabs Worker: Looking for video: ${videoName}, user: ${userId}`);
        
//         const { data: metadataRows, error: metadataError } = await authClient
//             .from("metadata")
//             .select("*")
//             .eq("video_name", videoName)
//             .eq("user_id", userId)
//             .limit(1);

//         if (metadataError || !metadataRows || metadataRows.length === 0) {
//             console.log("❌ ElevenLabs Worker: No metadata found");
//             return res.status(404).json({ 
//                 error: "No metadata entry found for this video",
//                 videoName: videoName,
//                 userId: userId
//             });
//         }

//         const metadata = metadataRows[0];
//         console.log(`📋 ElevenLabs Worker: Found metadata ID: ${metadata.id}`);

//         console.log("☁️ ElevenLabs Worker: Downloading video...");
        
//         // Download video using authenticated client
//         const bucketPath = metadata.bucket_path || `videos/${videoName}`;
//         const { data, error: downloadError } = await authClient.storage
//             .from("projectai")
//             .download(bucketPath);

//         if (downloadError) {
//             console.log("❌ ElevenLabs Worker: Download failed", downloadError);
//             return res.status(500).json({ 
//                 error: "Failed to download video from Supabase: " + downloadError.message 
//             });
//         }

//         // Save video temporarily
//         const videoBuffer = Buffer.from(await data.arrayBuffer());
//         await fsp.writeFile(videoPath, videoBuffer);
//         console.log("📁 ElevenLabs Worker: Video saved temporarily");

//         // Extract audio using FFmpeg
//         const command = `ffmpeg -y -i "${videoPath}" -q:a 0 -map a "${audioPath}"`;
//         console.log("⚡ ElevenLabs Worker: Extracting audio...");
        
//         try {
//             await execPromise(command);
//             console.log("✅ ElevenLabs Worker: Audio extracted successfully");
//         } catch (ffmpegError) {
//             console.log("❌ ElevenLabs Worker: FFmpeg error", ffmpegError);
//             await fsp.unlink(videoPath).catch(() => {});
//             return res.status(500).json({ 
//                 error: "Audio extraction failed: " + ffmpegError.message 
//             });
//         }

//         // Check if audio file was created
//         if (!fs.existsSync(audioPath)) {
//             console.log("❌ ElevenLabs Worker: Audio file not created");
//             await fsp.unlink(videoPath).catch(() => {});
//             return res.status(500).json({ error: "Audio file was not created" });
//         }

//         try {
//             console.log("🎙️ ElevenLabs Worker: Sending to ElevenLabs API...");
            
//             // Check ElevenLabs client is initialized
//             if (!elevenlabs || !elevenlabs.speechToText) {
//                 console.log("❌ ElevenLabs Worker: Client not initialized");
//                 throw new Error("ElevenLabs client not properly initialized");
//             }

//             // Read audio and create blob for ElevenLabs
//             const buffer = fs.readFileSync(audioPath);
//             const audioBlob = new Blob([buffer], { type: "audio/mpeg" });

//             // Send to ElevenLabs for transcription
//             const transcriptionResult = await elevenlabs.speechToText.convert({
//                 file: audioBlob,
//                 modelId: "scribe_v1",
//                 tagAudioEvents: true,
//                 languageCode: "eng",
//                 diarize: true,
//             });

//             console.log("📄 ElevenLabs Worker: Transcription received");

//             // Process results with pause detection
//             let elevenLabsTranscript = "";
//             let wordCount = 0;

//             if (transcriptionResult && transcriptionResult.words && Array.isArray(transcriptionResult.words)) {
//                 const words = transcriptionResult.words;
//                 wordCount = words.length;
//                 let currentTranscriptParts = [];
                
//                 console.log(`📊 ElevenLabs Worker: Processing ${wordCount} words`);

//                 for (let i = 0; i < words.length; i++) {
//                     const word = words[i];
//                     if (i > 0) {
//                         const prevWord = words[i - 1];
//                         const gap = word.start - prevWord.end;
//                         if (gap > PAUSE_THRESHOLD) {
//                             currentTranscriptParts.push(`[PAUSE:${gap.toFixed(2)}s]`);
//                         }
//                     }
//                     currentTranscriptParts.push(word.text);
//                 }
//                 elevenLabsTranscript = currentTranscriptParts.join(' ');
//             } else if (transcriptionResult?.text) {
//                 elevenLabsTranscript = transcriptionResult.text;
//                 console.log("📝 ElevenLabs Worker: Using plain text result");
//             } else {
//                 elevenLabsTranscript = "No transcription available";
//                 console.log("⚠️ ElevenLabs Worker: Empty transcription result");
//             }

//             console.log("💾 ElevenLabs Worker: Saving to database...");

//             // ✅ USE SERVICE ROLE FOR UPDATE (BYPASSES RLS)
//             const serviceClient = createServiceClient();
//             const { error: updateError } = await serviceClient
//                 .from("metadata")
//                 .update({
//                     elevenlabs_transcript: elevenLabsTranscript,
//                     updated_at: new Date().toISOString()
//                 })
//                 .eq("id", metadata.id)
//                 .eq("user_id", userId); // Still verify ownership

//             if (updateError) {
//                 console.warn("⚠️ ElevenLabs Worker: Failed to update metadata", updateError);
//             }

//             console.log("✅ ElevenLabs Worker: Transcription completed!\n");
            
//             // Clean up temporary files before sending response
//             await fsp.unlink(audioPath).catch(e => console.log("Warning: Could not delete audio file", e));
//             await fsp.unlink(videoPath).catch(e => console.log("Warning: Could not delete video file", e));

//             res.json({ 
//                 success: true,
//                 message: "ElevenLabs transcription completed",
//                 transcript: elevenLabsTranscript,
//                 wordCount: wordCount,
//                 metadata: {
//                     service: "ElevenLabs",
//                     model: "scribe_v1",
//                     completedAt: new Date().toISOString()
//                 }
//             });
            
//         } catch (err) {
//             console.log("❌ ElevenLabs Worker: Processing failed", err);
            
//             // Clean up files on error
//             await fsp.unlink(audioPath).catch(() => {});
//             await fsp.unlink(videoPath).catch(() => {});
            
//             return res.status(500).json({ 
//                 error: "ElevenLabs processing failed: " + err.message,
//                 details: err.stack
//             });
//         }

//     } catch (err) {
//         console.log("❌ ElevenLabs Worker: Unexpected error", err);
        
//         // Clean up any remaining files
//         await fsp.unlink(audioPath).catch(() => {});
//         await fsp.unlink(videoPath).catch(() => {});
        
//         res.status(500).json({ 
//             error: "Server error: " + err.message,
//             details: err.stack
//         });
//     }
// };

// // HELPER: Get transcription status for a video (WITH AUTH)
// export const getTranscriptionStatus = async (req, res) => {
//     try {
//         const { videoName } = req.params;
        
//         console.log(`📋 Transcription Status Worker: Checking ${videoName}`);

//         // ✅ AUTHENTICATION CHECK
//         const authHeader = req.headers.authorization;
//         const userToken = authHeader ? authHeader.split(' ')[1] : null;
//         const userId = extractUserIdFromToken(req);
        
//         if (!userId || !userToken) {
//             return res.status(401).json({ 
//                 error: "Authentication required" 
//             });
//         }

//         // ✅ CREATE AUTHENTICATED CLIENT
//         const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
//             global: { 
//                 headers: { 
//                     Authorization: `Bearer ${userToken}` 
//                 } 
//             }
//         });

//         const { data, error } = await authClient
//             .from("metadata")
//             .select("deepgram_transcript, transcription_completed_at, video_name")
//             .eq("video_name", videoName)
//             .eq("user_id", userId)
//             .single();

//         if (error) {
//             console.log("❌ Transcription Status Worker: Database error", error);
//             return res.status(500).json({ error: "Database error: " + error.message });
//         }

//         if (!data) {
//             console.log("❌ Transcription Status Worker: Video not found");
//             return res.status(404).json({ error: "Video not found" });
//         }

//         const hasTranscript = !!data.deepgram_transcript;
        
//         res.json({
//             videoName: data.video_name,
//             hasTranscript,
//             transcriptionCompleted: hasTranscript,
//             completedAt: data.transcription_completed_at,
//             transcript: hasTranscript ? data.deepgram_transcript : null
//         });

//     } catch (err) {
//         console.log("❌ Transcription Status Worker: Error", err);
//         res.status(500).json({ 
//             error: "Failed to get transcription status: " + err.message 
//         });
//     }
// };

import dotenv from "dotenv";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import { createClient as createDeepgramClient } from "@deepgram/sdk";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import jwt from "jsonwebtoken";
import { Blob } from "buffer";

dotenv.config();

// === ENVIRONMENT VARIABLES ===
// Use fallback to REACT_APP_ variables if main variables are not set
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;

// === VALIDATE ENVIRONMENT VARIABLES ===
if (!SUPABASE_URL) {
  console.error("❌ CRITICAL: SUPABASE_URL is missing! Check your .env file.");
  throw new Error("SUPABASE_URL environment variable is required");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing! Check your .env file.");
  throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is required");
}

if (!DEEPGRAM_API_KEY) {
  console.error("⚠️ WARNING: DEEPGRAM_API_KEY is missing!");
}

if (!ELEVENLABS_API_KEY) {
  console.error("⚠️ WARNING: ELEVENLABS_API_KEY is missing!");
}

// === INITIALIZE CLIENTS ===
let deepgram = null;
if (DEEPGRAM_API_KEY) {
  try {
    deepgram = createDeepgramClient(DEEPGRAM_API_KEY);
    console.log("✅ Deepgram client initialized");
  } catch (err) {
    console.error("❌ Failed to initialize Deepgram client:", err.message);
  }
}

/**
 * Create Supabase client using service role key
 */
const createServiceClient = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("supabaseUrl is required. Please check your .env file for SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }
  
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

/**
 * Extract user ID from JWT token
 */
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

/**
 * TRANSCRIBE AUDIO WITH DEEPGRAM (v3 SDK) - Express Handler
 */
export const transcribeWithDeepgram = async (req, res) => {
  const { videoName } = req.body;

  if (!videoName) {
    return res.status(400).json({
      success: false,
      error: "Bad Request",
      message: "videoName is required in request body"
    });
  }

  // Authentication check
  const userId = extractUserIdFromToken(req);
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "Authentication required. Please provide a valid authorization token."
    });
  }

  console.log("🎙️ Starting Deepgram transcription for:", videoName);

  try {
    // Create service client
    const serviceClient = createServiceClient();

    // Fetch video metadata to get public URL
    const { data: metadata, error: metadataError } = await serviceClient
      .from("metadata")
      .select("public_url, video_name, user_id")
      .eq("video_name", videoName)
      .eq("user_id", userId)
      .single();

    if (metadataError || !metadata) {
      console.error("❌ Metadata not found:", metadataError);
      return res.status(404).json({
        success: false,
        error: "Not Found",
        message: `Video with name "${videoName}" not found for this user`
      });
    }

    const videoUrl = metadata.public_url;
    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        error: "Bad Request",
        message: "Video URL not found in metadata"
      });
    }

    // Validate Deepgram client
    if (!deepgram) {
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: "Deepgram API key is not configured"
      });
    }

    // Fetch video file
    console.log("📥 Fetching video from URL:", videoUrl);
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();

    // Transcribe with Deepgram
    console.log("🎤 Sending to Deepgram API...");
    const { result } = await deepgram.listen.prerecorded.transcribeFile(buffer, {
      model: "nova-2",
      smart_format: true,
      punctuate: true,
      paragraphs: true,
      detect_language: true,
      filler_words: true,
    });

    const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
    const allWords = result.results?.channels?.[0]?.alternatives?.[0]?.words || [];

    // Save transcript to database
    console.log("💾 Saving transcript to database...");
    const { error: updateError } = await serviceClient
      .from("metadata")
      .update({
        deepgram_transcript: transcript,
        deepgram_words: allWords,
        transcription_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("video_name", videoName)
      .eq("user_id", userId);

    if (updateError) {
      console.error("❌ Failed to update metadata:", updateError);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: "Failed to save transcript to database",
        details: updateError.message
      });
    }

    console.log("✅ Deepgram transcription complete for:", videoName);
    return res.status(200).json({
      success: true,
      message: "Transcription completed successfully",
      transcript,
      words: allWords,
      wordCount: allWords.length
    });

  } catch (err) {
    console.error("🚨 Deepgram transcription failed:", err);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: err.message || "Transcription failed"
    });
  }
};

/**
 * TRANSCRIBE AUDIO WITH ELEVENLABS - Express Handler
 */
export const transcribeWithElevenLabs = async (req, res) => {
  const { videoName } = req.body;

  if (!videoName) {
    return res.status(400).json({
      success: false,
      error: "Bad Request",
      message: "videoName is required in request body"
    });
  }

  // Authentication check
  const userId = extractUserIdFromToken(req);
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "Authentication required. Please provide a valid authorization token."
    });
  }

  console.log("🧠 Starting ElevenLabs transcription for:", videoName);

  try {
    // Create service client
    const serviceClient = createServiceClient();

    // Fetch video metadata to get public URL
    const { data: metadata, error: metadataError } = await serviceClient
      .from("metadata")
      .select("public_url, video_name, user_id")
      .eq("video_name", videoName)
      .eq("user_id", userId)
      .single();

    if (metadataError || !metadata) {
      console.error("❌ Metadata not found:", metadataError);
      return res.status(404).json({
        success: false,
        error: "Not Found",
        message: `Video with name "${videoName}" not found for this user`
      });
    }

    const videoUrl = metadata.public_url;
    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        error: "Bad Request",
        message: "Video URL not found in metadata"
      });
    }

    // Validate ElevenLabs API key
    if (!ELEVENLABS_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: "ElevenLabs API key is not configured"
      });
    }

    // Initialize ElevenLabs client
    const client = new ElevenLabsClient({
      apiKey: ELEVENLABS_API_KEY,
      environment: "https://api.elevenlabs.io",
    });

    // Fetch video file
    console.log("📥 Fetching video from URL:", videoUrl);
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.statusText}`);
    }
    const audioBuffer = await response.arrayBuffer();

    // Transcribe with ElevenLabs
    console.log("🎤 Sending to ElevenLabs API...");
    const result = await client.speechToText.convert({
      file: new Blob([audioBuffer]),
      model_id: "scribe_v1",
    });

    const transcript = result?.text || "";
    console.log("✅ ElevenLabs transcription completed successfully.");

    // Save transcript to database
    console.log("💾 Saving transcript to database...");
    const { error: updateError } = await serviceClient
      .from("metadata")
      .update({
        elevenlabs_transcript: transcript,
        updated_at: new Date().toISOString(),
      })
      .eq("video_name", videoName)
      .eq("user_id", userId);

    if (updateError) {
      console.error("❌ Failed to update metadata:", updateError);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: "Failed to save transcript to database",
        details: updateError.message
      });
    }

    console.log("💾 ElevenLabs transcript saved successfully for:", videoName);
    return res.status(200).json({
      success: true,
      message: "Transcription completed successfully",
      transcript,
      service: "ElevenLabs"
    });

  } catch (err) {
    console.error("🚨 ElevenLabs transcription failed:", err);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: err.message || "Transcription failed"
    });
  }
};
