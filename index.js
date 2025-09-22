
// import fs from "fs";
// import { promises as fsp } from "fs";
// import express from "express";
// import multer from "multer";
// import path from "path";
// import cors from "cors";
// import { exec } from "child_process";
// import { fileURLToPath } from "url";
// import { GoogleGenerativeAI } from "@google/generative-ai";
// import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
// import { createClient as createDeepgramClient } from "@deepgram/sdk";
// import { Blob } from "buffer";
// import { createClient } from "@supabase/supabase-js";
// import pgp from 'pg-promise';
// import dotenv from 'dotenv';

// // Load environment variables from .env file
// dotenv.config();

// // Initialize Express app
// const app = express();
// const port = process.env.PORT || 8000;

// // Initialize DB and Supabase clients
// const pg = pgp({});
// const db = pg(process.env.DATABASE_URL);
// const supabase = createClient(
//     process.env.REACT_APP_SUPABASE_URL,
//     process.env.REACT_APP_SUPABASE_ANON_KEY
// );

// // Get __filename and __dirname for ES module compatibility
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // Define a constant for pause detection threshold (in seconds)
// const PAUSE_THRESHOLD = 0.5;

// // Middleware setup
// app.use(cors({
//     origin: 'http://localhost:3000',
//     credentials: true,
// }));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Ensure necessary upload directories exist
// ["uploads", "frames"].forEach((folder) => {
//     const dir = path.join(__dirname, folder);
//     if (!fs.existsSync(dir)) fs.mkdirSync(dir);
// });

// // Serve static files
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// app.use("/frames", express.static(path.join(__dirname, "frames")));

// // Multer storage configuration
// const videoUpload = multer({
//     storage: multer.diskStorage({
//         destination: (req, file, cb) => {
//             console.log("🔄 Upload started for:", file.originalname);
//             cb(null, path.join(__dirname, "uploads"));
//         },
//         filename: (req, file, cb) => {
//             const filename = `${Date.now()}-${file.originalname}`;
//             cb(null, filename);
//             console.log("✅ Upload finished with filename:", filename);
//         },
//     }),
// });

// // Initialize AI clients
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const elevenlabs = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
// const deepgram = createDeepgramClient(process.env.DEEPGRAM_API_KEY);
// console.log("✅ API keys loaded successfully");

// // The UPLOAD ROUTE
// app.post("/upload", videoUpload.single("myvideo"), async (req, res) => {
//     try {
//         const file = req.file;
//         if (!file) {
//             return res.status(400).send("No file uploaded");
//         }

//         const userId = req.body.user_id;
//         if (!userId) {
//             return res.status(400).send("user_id is required");
//         }
        
//         if (!userId.startsWith('user_') || userId.length < 20) {
//             return res.status(400).send("Invalid user_id format");
//         }
        
//         console.log("File received for upload for user:", userId);

//         const fileBuffer = await fsp.readFile(file.path);
        
//         const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
//         const randomId = Math.random().toString(36).substring(2, 15);
//         const fileExtension = path.extname(file.originalname);
//         const baseName = path.basename(file.originalname, fileExtension);
//         const renamedFilename = `${timestamp}-${randomId}-${baseName}${fileExtension}`;

//         const { error } = await supabase.storage
//             .from("projectai")
//             .upload(`videos/${renamedFilename}`, fileBuffer, {
//                 contentType: file.mimetype,
//                 upsert: true,
//             });

//         if (error) {
//             console.error("Supabase upload error:", error);
//             return res.status(500).send("Upload to Supabase failed");
//         }

//         const { data: publicUrlData } = supabase
//             .storage
//             .from("projectai")
//             .getPublicUrl(`videos/${renamedFilename}`);
//         const publicUrl = publicUrlData.publicUrl;

//         const { data: insertData, error: insertError } = await supabase
//             .from("metadata")
//             .insert([{
//                 user_id: userId,
//                 video_name: renamedFilename,
//                 original_name: file.originalname,
//                 video_url: publicUrl
//             }]);

//         if (insertError) {
//             console.error("❌ Error inserting metadata:", insertError);
//             return res.status(500).send("Failed to save metadata");
//         }
        
//         await fsp.unlink(file.path);

//         res.status(200).json({
//             message: "Upload successful!",
//             videoName: renamedFilename,
//             originalName: file.originalname,
//             publicUrl: publicUrl
//         });

//     } catch (err) {
//         console.error("Upload error:", err);
//         res.status(500).send("Server error");
//     }
// });

// // Extracts frames from a video in Supabase, uploads them back, and cleans up.
// app.post("/extractFrames", videoUpload.none(), async (req, res) => {
//     console.log("Extracting frames!");
//     const { videoName } = req.body;

//     if (!videoName) {
//         return res.status(400).send("videoName is required");
//     }

//     const videoPath = path.join(__dirname, "uploads", videoName);
//     const framesDir = path.join(__dirname, 'frames');

//     try {
//         const { data, error: downloadError } = await supabase.storage
//             .from('projectai')
//             .download(`videos/${videoName}`);

//         if (downloadError || !data) {
//             console.error("Failed to download video from Supabase", downloadError);
//             return res.status(404).send("Failed to download video from Supabase");
//         }

//         await fsp.writeFile(videoPath, Buffer.from(await data.arrayBuffer()));

//         const command = `ffmpeg -i "${videoPath}" -vf "fps=1/5" "${path.join(framesDir, 'frame_%04d.jpg')}"`;
        
//         exec(command, async (err) => {
//             if (err) {
//                 console.error("FFmpeg error:", err);
//                 await fsp.unlink(videoPath);
//                 return res.status(500).send("Failed to extract frames");
//             }

//             try {
//                 const frameMetadata = [];
//                 const frameFiles = fs.readdirSync(framesDir);
                
//                 for (const file of frameFiles) {
//                     const fullPath = path.join(framesDir, file);
//                     const fileBuffer = fs.readFileSync(fullPath);
//                     const storagePath = `frames/${file}`;

//                     const { error: uploadError } = await supabase.storage
//                         .from('projectai')
//                         .upload(storagePath, fileBuffer, {
//                             contentType: 'image/jpeg',
//                             upsert: true,
//                         });

//                     if (uploadError) {
//                         console.error(`Failed to upload ${file}`, uploadError);
//                         continue;
//                     }

//                     const { data: publicUrlData } = supabase
//                         .storage
//                         .from("projectai")
//                         .getPublicUrl(storagePath);

//                     frameMetadata.push({
//                         frame_id: file,
//                         frame_path: storagePath,
//                         frame_created_at: new Date().toISOString(),
//                         frame_analysis: null,
//                         frame_url: publicUrlData.publicUrl
//                     });
                    
//                     fs.unlinkSync(fullPath);
//                 }

//                 const { error: updateError } = await supabase
//                     .from("metadata")
//                     .update({ frames: frameMetadata })
//                     .eq("video_name", videoName);

//                 if (updateError) {
//                     console.error("Error updating metadata:", updateError);
//                     return res.status(500).send("Failed to update metadata");
//                 }

//                 await fsp.unlink(videoPath);

//                 res.json({
//                     message: "Frames extracted and metadata updated",
//                     frames: frameMetadata
//                 });

//             } catch (uploadErr) {
//                 console.error(uploadErr);
//                 res.status(500).send("Upload failed");
//             }
//         });
//     } catch (err) {
//         console.error("Error during frame extraction:", err);
//         res.status(500).send("Internal server error");
//     }
// });

// // Analyze frames endpoint
// app.get("/analyzeAllFrames", async (req, res) => {
//     try {
//         const { data: frameList, error: listError } = await supabase
//             .storage
//             .from("projectai")
//             .list("frames", { limit: 100 });

//         if (listError) {
//             console.error("Supabase list error:", listError);
//             return res.status(500).send("Could not list frames from Supabase.");
//         }

//         if (!frameList || frameList.length === 0) {
//             return res.status(404).send("No frames found to analyze.");
//         }

//         const analysisResults = [];

//         for (const item of frameList) {
//             const { data, error: downloadError } = await supabase
//                 .storage
//                 .from("projectai")
//                 .download(`frames/${item.name}`);

//             if (downloadError) {
//                 console.error(`Download error for ${item.name}:`, downloadError.message);
//                 continue;
//             }

//             const arrayBuffer = await data.arrayBuffer();
//             const buffer = Buffer.from(arrayBuffer);
//             const base64 = buffer.toString("base64");

//             if (!base64 || base64.length < 100) {
//                 console.warn(`Skipped ${item.name} due to empty or invalid image data.`);
//                 continue;
//             }

//             const prompt = `Describe this image in one or two sentences. The image is provided in base64 format:\n\n${base64}`;

//             const hfResponse = await fetch("https://api-inference.huggingface.co/models/google/gemma-7b-it", {
//                 method: "POST",
//                 headers: {
//                     "Content-Type": "application/json",
//                     "Authorization": `Bearer ${process.env.HF_API_KEY}`
//                 },
//                 body: JSON.stringify({ inputs: prompt })
//             });

//             const hfData = await hfResponse.json();
//             const description = Array.isArray(hfData) && hfData[0]?.generated_text
//                 ? hfData[0].generated_text
//                 : (hfData.generated_text || "No description");

//             analysisResults.push({ name: item.name, description });

//             try {
//                 const { data: allVideos, error: fetchError } = await supabase
//                     .from("metadata")
//                     .select("id, frames");

//                 if (fetchError) {
//                     console.error("Error fetching videos:", fetchError);
//                     continue;
//                 }

//                 const video = allVideos.find(v =>
//                     Array.isArray(v.frames) &&
//                     v.frames.some(f => f.frame_id === item.name)
//                 );

//                 if (!video) {
//                     console.warn("No video found for frame", item.name);
//                     continue;
//                 }

//                 const updatedFrames = video.frames.map(f =>
//                     f.frame_id === item.name
//                         ? { ...f, frame_analysis: description }
//                         : f
//                 );

//                 await supabase
//                     .from("metadata")
//                     .update({ frames: updatedFrames })
//                     .eq("id", video.id);

//             } catch (updateError) {
//                 console.error(`Error updating metadata for frame ${item.name}:`, updateError);
//             }
//         }

//         res.json({
//             message: "Analysis complete and metadata updated",
//             analysisResults
//         });

//     } catch (err) {
//         console.error("Frame analysis failed:", err);
//         res.status(500).json({ error: "Frame analysis failed: " + err.message });
//     }
// });

// // Transcribe video audio with Deepgram
// app.post("/transcribeWithDeepgram", videoUpload.none(), async (req, res) => {
//     const { videoName } = req.body;

//     if (!videoName) {
//         return res.status(400).json({ error: "videoName is required" });
//     }
    
//     let { data: metadataRows, error: metadataError } = await supabase
//         .from("metadata")
//         .select("id")
//         .eq("video_name", videoName)
//         .limit(1);

//     if (metadataError || !metadataRows || metadataRows.length === 0) {
//         return res.status(404).json({ error: "No metadata entry found for this video" });
//     }

//     const metadataId = metadataRows[0].id;
//     const videoPath = path.join(__dirname, "uploads", videoName);
//     const audioPath = path.join(__dirname, "uploads", `audio_for_deepgram_${Date.now()}.mp3`);

//     try {
//         const { data, error } = await supabase.storage
//             .from("projectai")
//             .download(`videos/${videoName}`);

//         if (error) {
//             return res.status(500).json({ error: "Failed to download video from Supabase" });
//         }

//         await fsp.writeFile(videoPath, Buffer.from(await data.arrayBuffer()));

//         const command = `ffmpeg -y -i "${videoPath}" -q:a 0 -map a "${audioPath}"`;
        
//         exec(command, async (error, _, stderr) => {
//             if (error) {
//                 return res.status(500).json({ error: "Audio extraction failed" });
//             }

//             try {
//                 const audioBuffer = fs.readFileSync(audioPath);
//                 const { result, error: deepgramError } = await deepgram.listen.prerecorded.transcribeFile(
//                     audioBuffer,
//                     {
//                         model: "nova-3",
//                         smart_format: true,
//                         disfluencies: true,
//                         punctuate: true,
//                         filler_words: true,
//                         word_details: true,
//                     }
//                 );

//                 if (deepgramError) {
//                     return res.status(500).json({ error: "Deepgram API error: " + deepgramError.message });
//                 }

//                 const words = result?.results?.channels?.[0]?.alternatives?.[0]?.words || [];
//                 const fillerWords = result?.results?.channels?.[0]?.alternatives?.[0]?.filler_words || [];
//                 const allWords = [...words, ...fillerWords].sort((a, b) => a.start - b.start);
                
//                 let currentTranscriptParts = [];
//                 for (let i = 0; i < allWords.length; i++) {
//                     if (i > 0) {
//                         const gap = allWords[i].start - allWords[i - 1].end;
//                         if (gap > PAUSE_THRESHOLD) {
//                             currentTranscriptParts.push(`[PAUSE:${gap.toFixed(2)}s]`);
//                         }
//                     }
//                     currentTranscriptParts.push(allWords[i].word);
//                 }
//                 const transcript = currentTranscriptParts.join(" ");

//                 const { error: updateError } = await supabase
//                     .from("metadata")
//                     .update({
//                         deepgram_transcript: transcript,
//                         deepgram_words: allWords
//                     })
//                     .eq("id", metadataId);

//                 if (updateError) {
//                     return res.status(500).json({ error: "Failed to update metadata: " + updateError.message });
//                 }

//                 res.json({ transcript, words: allWords });

//             } catch (err) {
//                 return res.status(500).json({ error: "Deepgram failed: " + err.message });
//             } finally {
//                 await fsp.unlink(audioPath).catch(e => console.error("❌ Error deleting audio file", e));
//                 await fsp.unlink(videoPath).catch(e => console.error("❌ Error deleting video file", e));
//             }
//         });
//     } catch (err) {
//         res.status(500).json({ error: "Server error: " + err.message });
//     }
// });

// // Transcribe video audio with ElevenLabs
// app.post("/transcribeWithElevenLabs", videoUpload.none(), async (req, res) => {
//     const { videoName } = req.body;
//     if (!videoName) {
//         return res.status(400).json({ error: "videoName is required" });
//     }

//     const videoPath = path.join(__dirname, "uploads", videoName);
//     const audioPath = path.join(__dirname, "uploads", `audio_for_11labs_${Date.now()}.mp3`);

//     try {
//         const { data, error: downloadError } = await supabase.storage
//             .from("projectai")
//             .download(`videos/${videoName}`);

//         if (downloadError) {
//             return res.status(500).json({ error: "Failed to download video from Supabase" });
//         }

//         await fsp.writeFile(videoPath, Buffer.from(await data.arrayBuffer()));

//         const command = `ffmpeg -y -i "${videoPath}" -q:a 0 -map a "${audioPath}"`;
//         exec(command, async (error, _, stderr) => {
//             if (error) {
//                 return res.status(500).json({ error: "Audio extraction failed" });
//             }
//             try {
//                 const buffer = fs.readFileSync(audioPath);
//                 const audioBlob = new Blob([buffer], { type: "audio/mp3" });

//                 const transcriptionResult = await elevenlabs.speechToText.convert({
//                     file: audioBlob,
//                     modelId: "scribe_v1",
//                     tagAudioEvents: true,
//                     languageCode: "eng",
//                     diarize: true,
//                 });

//                 let elevenLabsTranscript = "";
//                 if (transcriptionResult && transcriptionResult.words) {
//                     const words = transcriptionResult.words;
//                     let currentTranscriptParts = [];
//                     for (let i = 0; i < words.length; i++) {
//                         const word = words[i];
//                         if (i > 0) {
//                             const prevWord = words[i - 1];
//                             const gap = word.start - prevWord.end;
//                             if (gap > PAUSE_THRESHOLD) {
//                                 currentTranscriptParts.push(`[PAUSE:${gap.toFixed(2)}s]`);
//                             }
//                         }
//                         currentTranscriptParts.push(word.text);
//                     }
//                     elevenLabsTranscript = currentTranscriptParts.join(' ');
//                 } else {
//                     elevenLabsTranscript = transcriptionResult?.text || "";
//                 }
//                 res.json({ transcript: elevenLabsTranscript });
//             } catch (err) {
//                 return res.status(500).json({ error: "ElevenLabs failed: " + err.message });
//             } finally {
//                 await fsp.unlink(audioPath).catch(e => console.error("Error deleting audio file", e));
//                 await fsp.unlink(videoPath).catch(e => console.error("Error deleting video file", e));
//             }
//         });
//     } catch (err) {
//         res.status(500).json({ error: "Server error: " + err.message });
//     }
// });


// // FIXED: Complete metadata endpoint
// app.get('/api/metadata', async (req, res) => {
//     try {
//         const { data, error } = await supabase
//             .from('metadata')
//             .select('*')
//             .order('created_at', { ascending: false });

//         if (error) {
//             return res.status(500).json({ 
//                 success: false, 
//                 error: error.message 
//             });
//         }

//         res.json({ 
//             success: true, 
//             data: data || [] 
//         });

//     } catch (error) {
//         res.status(500).json({ 
//             success: false, 
//             error: error.message 
//         });
//     }
// });

// // Add a test endpoint to check if the server is running properly
// app.get("/health", (req, res) => {
//     res.json({
//         status: "OK",
//         timestamp: new Date().toISOString(),
//         message: "Server is running"
//     });
// });

// // Start the server
// app.listen(port, () => {
//     console.log(`✅ Server running at http://localhost:${port}`);
// });

// 🚪 index.js - THE MAIN RECEPTION DESK
// This is where EVERYTHING starts!

import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from 'dotenv';

// 📋 Import all our department routes (like phone directories)
import uploadRoutes from './routes/upload.routes.js';
import framesRoutes from './routes/frames.routes.js';
import transcriptionRoutes from './routes/transcription.routes.js';
import metadataRoutes from './routes/metadata.routes.js';

// Load environment variables (like getting the building's Wi-Fi password)
dotenv.config();

// Get file paths (figure out where we are in the building)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create our building (Express app)
const app = express();
const port = process.env.PORT || 7000;

// 🛡️ SECURITY AND SETUP (Building rules)
app.use(cors({
    origin: true, // Allows any origin - TEMPORARY FIX ONLY!
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());  // Understand JSON messages
app.use(express.urlencoded({ extended: true }));  // Understand form data

// 📁 Make sure we have storage rooms (create folders if they don't exist)
["uploads", "frames"].forEach((folder) => {
    const dir = path.join(__dirname, folder);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
        console.log(`✅ Created ${folder} directory`);
    }
});

// 🖼️ Let people see files in these folders (like a public gallery)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/frames", express.static(path.join(__dirname, "frames")));

// 🚦 TRAFFIC DIRECTIONS (Tell people which department handles what)
app.use('/api', uploadRoutes);        // "Need to upload? Go to upload department"
app.use('/api', framesRoutes);        // "Need frames? Go to frames department"  
app.use('/api', transcriptionRoutes); // "Need transcription? Go to transcription department"
app.use('/api', metadataRoutes);      // "Need data info? Go to metadata department"

// 💓 Health check (like a "We're Open" sign)
app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        message: "Server is running perfectly! 🚀"
    });
});

// 🏢 OPEN THE BUILDING (start the server)
app.listen(port, () => {
    console.log(`
    🏢 ===================================
    🚪 SERVER IS OPEN FOR BUSINESS! 
    🌐 Visit: http://localhost:${port}
    💚 Health Check: http://localhost:${port}/health
    ===================================
    `);
});

export default app;
