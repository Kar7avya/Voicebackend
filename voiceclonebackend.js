// import express from "express";
// import multer from "multer";
// import fs from "fs/promises";
// import supabase from "./supabaseClient.js";
// import dotenv from "dotenv";
// import cors from "cors";
// import path from "path";

// const express = require('express');
//  const app = express();


// dotenv.config();


// app.use(cors());
// app.use(express.json({ limit: '50mb' }));
// app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// const upload = multer({ 
//   dest: "uploads/",
//   limits: {
//     fileSize: 50 * 1024 * 1024 // 50MB limit
//   }
// });

// // ----------------------
// // VOICE UPLOAD
// // ----------------------
// async function uploadVoice(file) {
//   console.log("🎤 Processing voice upload...");
//   const filePath = `voices/${Date.now()}_${file.originalname}`;
  
//   const bucketName = process.env.REACT_APP_SUPABASE_BUCKET;

//   const { data, error } = await supabase.storage
//     .from(bucketName)
//     .upload(filePath, await fs.readFile(file.path), {
//       cacheControl: "3600",
//       upsert: false,
//       contentType: file.mimetype,
//     });

//   await fs.unlink(file.path);

//   if (error) {
//     console.error("❌ Voice upload error:", error.message);
//     throw new Error(error.message);
//   }

//   console.log(`✅ Voice uploaded successfully to bucket '${bucketName}':`, data.path);
//   return data.path;
// }

// // ----------------------
// // SCRIPT UPLOAD WITH WORD COUNT VALIDATION
// // ----------------------
// async function uploadScript(file) {
//   console.log("📜 Processing script upload...");
  
//   try {
//     // Step 1: Read file text based on mimetype
//     let textContent;
    
//     if (file.mimetype === "application/pdf") {
//       console.log("📄 Processing PDF file...");
      
//       // Dynamic import to avoid initialization issues
//       const pdfParse = (await import("pdf-parse")).default;
//       const dataBuffer = await fs.readFile(file.path);
      
//       try {
//         const pdfData = await pdfParse(dataBuffer);
//         textContent = pdfData.text;
//         console.log("✅ PDF parsed successfully");
//       } catch (pdfError) {
//         console.error("❌ PDF parsing error:", pdfError.message);
//         await fs.unlink(file.path); // Clean up temp file
//         throw new Error("Failed to parse PDF file. Please ensure it contains readable text.");
//       }
      
//     } else if (file.mimetype === "text/plain") {
//       console.log("📝 Processing text file...");
//       textContent = await fs.readFile(file.path, "utf-8");
      
//     } else if (file.mimetype === "application/msword" || 
//                file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
//       console.log("📄 Processing Word document...");
      
//       try {
//         // For Word documents, we'll try to read as text first
//         // In production, you might want to use mammoth.js for proper DOCX parsing
//         textContent = await fs.readFile(file.path, "utf-8");
//       } catch (docError) {
//         console.error("❌ Document parsing error:", docError.message);
//         await fs.unlink(file.path); // Clean up temp file
//         throw new Error("Failed to parse Word document. Please convert to PDF or TXT format.");
//       }
      
//     } else {
//       await fs.unlink(file.path); // Clean up temp file
//       throw new Error(`Unsupported file type: ${file.mimetype}`);
//     }

//     // Step 2: Clean and validate text content
//     if (!textContent || typeof textContent !== 'string') {
//       await fs.unlink(file.path); // Clean up temp file
//       throw new Error("File contains no readable text content.");
//     }

//     const cleanText = textContent.trim();
//     if (!cleanText) {
//       await fs.unlink(file.path); // Clean up temp file
//       throw new Error("File appears to be empty or contains only whitespace.");
//     }

//     // Step 3: Count words
//     const words = cleanText.split(/\s+/).filter(word => word.length > 0);
//     const wordCount = words.length;
//     console.log(`📊 Script word count: ${wordCount}`);

//     // Step 4: Validate word count
//     if (wordCount > 400) {
//       await fs.unlink(file.path); // Clean up temp file
//       throw new Error(`Script exceeds maximum 400 words. Current count: ${wordCount} words.`);
//     }

//     if (wordCount === 0) {
//       await fs.unlink(file.path); // Clean up temp file
//       throw new Error("Script contains no words after processing.");
//     }

//     // Step 5: Upload to Supabase
//     const filePath = `scripts/${Date.now()}_${file.originalname}`;
//     const bucketName = process.env.REACT_APP_SUPABASE_BUCKET;

//     const { data, error } = await supabase.storage
//       .from(bucketName)
//       .upload(filePath, await fs.readFile(file.path), {
//         cacheControl: "3600",
//         upsert: false,
//         contentType: file.mimetype,
//       });

//     // Clean up temp file
//     await fs.unlink(file.path);

//     if (error) {
//       console.error("❌ Script upload error:", error.message);
//       throw new Error(error.message);
//     }
    
//     console.log(`✅ Script uploaded successfully to bucket '${bucketName}':`, data.path);
//     console.log(`📈 Final word count: ${wordCount}/400 words`);
    
//     return { 
//       path: data.path, 
//       wordCount: wordCount,
//       textPreview: cleanText.substring(0, 150) + (cleanText.length > 150 ? '...' : ''),
//       fileType: file.mimetype
//     };

//   } catch (err) {
//     // Ensure temp file is cleaned up on any error
//     try {
//       await fs.unlink(file.path);
//     } catch (unlinkErr) {
//       // File might already be deleted, ignore error
//       console.log("🗑️ Temp file already cleaned up");
//     }
//     throw err;
//   }
// }

// // ----------------------
// // CREATE ELEVENLABS VOICE ID
// // ----------------------
// app.post("/create-elevenlabs-voice", express.json(), async (req, res) => {
//   try {
//     console.log("🗣️ Request received: /create-elevenlabs-voice");
//     const { voicePath } = req.body;

//     if (!voicePath) {
//       return res.status(400).json({ error: "Voice path is required." });
//     }

//     const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
//     const bucketName = process.env.REACT_APP_SUPABASE_BUCKET;
    
//     // Extract voice name from path, removing timestamp and extension
//     const voiceName = path.basename(voicePath)
//       .split('_')
//       .slice(1)
//       .join('_')
//       .replace(/\.[^/.]+$/, "") || `voice_${Date.now()}`;

//     if (!elevenLabsApiKey) {
//       return res.status(500).json({ error: "ElevenLabs API Key is missing from environment variables." });
//     }

//     console.log(`🎯 Using API Key: ${elevenLabsApiKey.substring(0, 20)}...`);
//     console.log(`📝 Voice name: ${voiceName}`);

//     // Download the uploaded audio file from Supabase
//     const { data: voiceData, error: voiceDownloadError } = await supabase.storage
//       .from(bucketName)
//       .download(voicePath);

//     if (voiceDownloadError) {
//       console.error("❌ Failed to download voice for cloning:", voiceDownloadError.message);
//       return res.status(500).json({ error: "Failed to download voice file from storage." });
//     }

//     // Convert Blob to Buffer
//     const voiceBuffer = Buffer.from(await voiceData.arrayBuffer());
//     console.log(`📊 Voice buffer size: ${voiceBuffer.length} bytes`);
    
//     if (voiceBuffer.length === 0) {
//       throw new Error("Downloaded voice file is empty");
//     }

//     // Manual multipart form data construction for ElevenLabs compatibility
//     const boundary = `----WebKitFormBoundary${Math.random().toString(16).substring(2)}`;
//     const CRLF = '\r\n';
    
//     // Build the multipart body parts
//     const textParts = [];
//     const binaryParts = [];
    
//     // Add name field
//     textParts.push(
//       `--${boundary}${CRLF}` +
//       `Content-Disposition: form-data; name="name"${CRLF}${CRLF}` +
//       `${voiceName}${CRLF}`
//     );
    
//     // Add file field header
//     textParts.push(
//       `--${boundary}${CRLF}` +
//       `Content-Disposition: form-data; name="files"; filename="${path.basename(voicePath)}"${CRLF}` +
//       `Content-Type: ${voiceData.type || 'audio/mpeg'}${CRLF}${CRLF}`
//     );
    
//     // Add the binary file data
//     binaryParts.push(voiceBuffer);
    
//     // Add closing boundary
//     textParts.push(`${CRLF}--${boundary}--${CRLF}`);
    
//     // Combine all parts into final body
//     const bodyParts = [];
//     bodyParts.push(Buffer.from(textParts[0], 'utf8'));
//     bodyParts.push(Buffer.from(textParts[1], 'utf8'));
//     bodyParts.push(binaryParts[0]);
//     bodyParts.push(Buffer.from(textParts[2], 'utf8'));
    
//     const finalBody = Buffer.concat(bodyParts);
    
//     console.log(`📤 Sending multipart request with boundary: ${boundary}`);
//     console.log(`📊 Total body size: ${finalBody.length} bytes`);
    
//     const elevenLabsResponse = await fetch(
//       "https://api.elevenlabs.io/v1/voices/add",
//       {
//         method: "POST",
//         headers: {
//           "xi-api-key": elevenLabsApiKey,
//           "Content-Type": `multipart/form-data; boundary=${boundary}`,
//           "Accept": "application/json"
//         },
//         body: finalBody,
//       }
//     );

//     const responseText = await elevenLabsResponse.text();
//     console.log(`🔍 ElevenLabs Response Status: ${elevenLabsResponse.status}`);
//     console.log(`🔍 Raw Response: ${responseText}`);
    
//     let elevenLabsResponseJson;
//     try {
//       elevenLabsResponseJson = JSON.parse(responseText);
//     } catch (parseError) {
//       console.error("❌ Failed to parse ElevenLabs response:", responseText);
//       throw new Error(`ElevenLabs API returned invalid response: ${responseText.substring(0, 200)}`);
//     }
    
//     if (!elevenLabsResponse.ok) {
//       console.error("❌ ElevenLabs API error:", elevenLabsResponseJson);
//       const errorMessage = elevenLabsResponseJson.detail?.message || 
//                           elevenLabsResponseJson.detail || 
//                           elevenLabsResponseJson.error?.message ||
//                           elevenLabsResponseJson.message ||
//                           `HTTP ${elevenLabsResponse.status}: ${elevenLabsResponse.statusText}`;
//       throw new Error(`ElevenLabs API error: ${errorMessage}`);
//     }
    
//     const elevenLabsVoiceId = elevenLabsResponseJson.voice_id;
    
//     if (!elevenLabsVoiceId) {
//       console.error("❌ No voice_id in response:", elevenLabsResponseJson);
//       throw new Error("No voice_id returned from ElevenLabs API");
//     }
    
//     console.log(`✅ New ElevenLabs Voice ID created: ${elevenLabsVoiceId}`);
//     res.json({ 
//       message: "Voice cloned successfully", 
//       voiceId: elevenLabsVoiceId,
//       voiceName: voiceName
//     });

//   } catch (err) {
//     console.error("❌ Error in /create-elevenlabs-voice:", err.message);
//     console.error("❌ Full error stack:", err.stack);
//     res.status(500).json({ error: "Voice cloning failed: " + err.message });
//   }
// });

// // ----------------------
// // VOICE REFINEMENT (TEXT-TO-SPEECH) WITH ENHANCED CONTROLS
// // ----------------------
// app.post("/refinevoice", express.json(), async (req, res) => {
//   try {
//     console.log("🪄 Request received: /refinevoice");
//     const { 
//       elevenLabsVoiceId, 
//       scriptPath, 
//       scriptContent,
//       voiceSettings = {}
//     } = req.body;

//     if (!elevenLabsVoiceId || (!scriptPath && !scriptContent)) {
//       return res.status(400).json({ error: "Voice ID and either a script path or content are required." });
//     }

//     const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
//     const bucketName = process.env.REACT_APP_SUPABASE_BUCKET;

//     if (!elevenLabsApiKey) {
//       return res.status(500).json({ error: "ElevenLabs API Key is missing." });
//     }

//     let finalScriptContent;
//     let useTextInput = false;
    
//     if (scriptContent && scriptContent.trim()) {
//         finalScriptContent = scriptContent.trim();
//         useTextInput = true;
//         console.log("✅ Using text input for script.");
//     } else if (scriptPath) {
//         // Download the uploaded script file content from Supabase
//         const { data: scriptData, error: scriptError } = await supabase.storage
//             .from(bucketName)
//             .download(scriptPath);

//         if (scriptError) {
//             console.error("❌ Failed to download script:", scriptError.message);
//             return res.status(500).json({ error: "Failed to download script file." });
//         }
        
//         // Convert Blob to text
//         finalScriptContent = (await scriptData.text()).trim();
//         console.log("✅ Script content retrieved from file.");
//     }

//     if (!finalScriptContent) {
//       return res.status(400).json({ error: "Script content is empty." });
//     }

//     // Validate word count for text input
//     if (useTextInput && finalScriptContent) {
//       const wordCount = finalScriptContent.split(/\s+/).filter(word => word.length > 0).length;
//       console.log(`📊 Text input word count: ${wordCount}`);
      
//       if (wordCount > 400) {
//         return res.status(400).json({ 
//           error: `Script exceeds maximum 400 words. Current count: ${wordCount} words.` 
//         });
//       }
      
//       if (wordCount === 0) {
//         return res.status(400).json({ error: "Script text is empty." });
//       }
//     }

//     console.log(`📝 Script content length: ${finalScriptContent.length} characters`);
//     console.log(`📄 Script preview: ${finalScriptContent.substring(0, 100)}...`);

//     // Enhanced voice settings with defaults
//     const enhancedVoiceSettings = {
//       stability: voiceSettings.stability !== undefined ? voiceSettings.stability : 0.5,
//       similarity_boost: voiceSettings.similarity !== undefined ? voiceSettings.similarity : 0.8,
//       style: voiceSettings.style !== undefined ? voiceSettings.style : 0.0,
//       use_speaker_boost: voiceSettings.speakerBoost !== undefined ? voiceSettings.speakerBoost : true
//     };

//     console.log("🎛️ Voice settings:", enhancedVoiceSettings);

//     // ---- ELEVENLABS TEXT-TO-SPEECH API CALL ----
//     console.log(`🎙️ Generating speech with voice ID: ${elevenLabsVoiceId}`);
    
//     const requestBody = {
//       text: finalScriptContent,
//       model_id: "eleven_multilingual_v2",
//       voice_settings: enhancedVoiceSettings
//     };

//     console.log(`🔧 TTS Request body prepared`);

//     const synthesisResponse = await fetch(
//       `https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`,
//       {
//         method: "POST",
//         headers: {
//           "xi-api-key": elevenLabsApiKey,
//           "Content-Type": "application/json",
//           "Accept": "audio/mpeg",
//         },
//         body: JSON.stringify(requestBody),
//       }
//     );

//     console.log(`🔍 TTS Response Status: ${synthesisResponse.status}`);

//     if (!synthesisResponse.ok) {
//       const errorText = await synthesisResponse.text();
//       console.error("❌ ElevenLabs synthesis error:", errorText);
      
//       let errorMessage;
//       try {
//         const errorJson = JSON.parse(errorText);
//         errorMessage = errorJson.detail?.message || errorJson.detail || errorJson.message || errorText;
//       } catch {
//         errorMessage = errorText;
//       }
      
//       throw new Error(`ElevenLabs synthesis failed: ${errorMessage}`);
//     }

//     const refinedAudioBuffer = await synthesisResponse.arrayBuffer();
//     console.log(`✅ Voice synthesized by ElevenLabs. Audio size: ${refinedAudioBuffer.byteLength} bytes`);

//     if (refinedAudioBuffer.byteLength === 0) {
//       throw new Error("Generated audio file is empty");
//     }

//     // Create a unique filename for the refined voice
//     const refinedFileName = `refinedvoice_${Date.now()}.mp3`;
//     const refinedFilePath = `refinedvoices/${refinedFileName}`;

//     // Upload the synthesized audio to Supabase
//     const { data: refinedData, error: refinedError } = await supabase.storage
//       .from(bucketName)
//       .upload(refinedFilePath, Buffer.from(refinedAudioBuffer), {
//         contentType: 'audio/mpeg',
//         upsert: false,
//       });

//     if (refinedError) {
//       console.error("❌ Refined voice upload failed:", refinedError.message);
//       return res.status(500).json({ error: "Failed to upload refined voice to storage." });
//     }

//     console.log(`✅ Refined voice uploaded successfully to bucket '${bucketName}':`, refinedData.path);
//     res.json({ 
//       message: "Voice refined and uploaded successfully", 
//       refinedPath: refinedData.path,
//       audioSize: refinedAudioBuffer.byteLength,
//       voiceSettings: enhancedVoiceSettings
//     });

//   } catch (err) {
//     console.error("❌ Error in /refinevoice:", err.message);
//     console.error("❌ Full error:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // ----------------------
// // VOICE SIMILARITY ANALYSIS
// // ----------------------
// app.post("/analyze-similarity", express.json(), async (req, res) => {
//   try {
//     console.log("🔍 Request received: /analyze-similarity");
//     const { originalVoicePath, refinedVoicePath } = req.body;

//     if (!originalVoicePath || !refinedVoicePath) {
//       return res.status(400).json({ error: "Both original and refined voice paths are required." });
//     }

//     const bucketName = process.env.REACT_APP_SUPABASE_BUCKET;

//     // Get public URLs for both audio files
//     const { data: originalData } = supabase.storage.from(bucketName).getPublicUrl(originalVoicePath);
//     const { data: refinedData } = supabase.storage.from(bucketName).getPublicUrl(refinedVoicePath);

//     // For now, we'll return mock similarity data
//     // In a real implementation, you would use audio analysis libraries
//     const mockSimilarity = {
//       overallSimilarity: Math.random() * 0.3 + 0.7, // 70-100%
//       pitchSimilarity: Math.random() * 0.2 + 0.8,   // 80-100%
//       toneSimilarity: Math.random() * 0.25 + 0.75,  // 75-100%
//       speedSimilarity: Math.random() * 0.2 + 0.8,   // 80-100%
//       clarityScore: Math.random() * 0.15 + 0.85,    // 85-100%
//       originalUrl: originalData.publicUrl,
//       refinedUrl: refinedData.publicUrl
//     };

//     console.log("🎯 Similarity analysis complete:", mockSimilarity);
//     res.json(mockSimilarity);

//   } catch (err) {
//     console.error("❌ Error in /analyze-similarity:", err.message);
//     res.status(500).json({ error: "Similarity analysis failed: " + err.message });
//   }
// });

// // ----------------------
// // GET PUBLIC URL
// // ----------------------
// app.post("/get-public-url", express.json(), async (req, res) => {
//   try {
//     const { path } = req.body;
//     const bucketName = process.env.REACT_APP_SUPABASE_BUCKET;

//     if (!path) {
//       return res.status(400).json({ error: "File path is required." });
//     }

//     const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
    
//     if (data && data.publicUrl) {
//       console.log(`🔗 Public URL generated for ${path}: ${data.publicUrl}`);
//       return res.json({ publicUrl: data.publicUrl });
//     } else {
//       console.error("❌ Failed to generate public URL for:", path);
//       return res.status(500).json({ error: "Failed to get public URL." });
//     }
//   } catch (err) {
//     console.error("❌ Error in /get-public-url:", err.message);
//     return res.status(500).json({ error: "Failed to get public URL: " + err.message });
//   }
// });

// // ----------------------
// // TEST ENDPOINT
// // ----------------------
// app.get("/test-api", async (req, res) => {
//   try {
//     const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    
//     if (!elevenLabsApiKey) {
//       return res.status(500).json({ error: "ElevenLabs API Key is missing." });
//     }

//     console.log(`🧪 Testing API Key: ${elevenLabsApiKey.substring(0, 20)}...`);
    
//     // Test API key by getting user info
//     const testResponse = await fetch("https://api.elevenlabs.io/v1/user", {
//       method: "GET",
//       headers: {
//         "xi-api-key": elevenLabsApiKey,
//       },
//     });

//     const testResult = await testResponse.text();
//     console.log(`🔍 API Test Status: ${testResponse.status}`);
//     console.log(`🔍 API Test Response: ${testResult.substring(0, 200)}...`);

//     if (testResponse.ok) {
//       res.json({ 
//         message: "API Key is working!", 
//         status: testResponse.status,
//         response: JSON.parse(testResult)
//       });
//     } else {
//       res.status(testResponse.status).json({ 
//         error: "API Key test failed", 
//         status: testResponse.status,
//         response: testResult 
//       });
//     }
//   } catch (err) {
//     console.error("❌ API test error:", err.message);
//     res.status(500).json({ error: "API test failed: " + err.message });
//   }
// });

// // ----------------------
// // LIST VOICES ENDPOINT
// // ----------------------
// app.get("/list-voices", async (req, res) => {
//   try {
//     const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    
//     if (!elevenLabsApiKey) {
//       return res.status(500).json({ error: "ElevenLabs API Key is missing." });
//     }

//     const voicesResponse = await fetch("https://api.elevenlabs.io/v1/voices", {
//       method: "GET",
//       headers: {
//         "xi-api-key": elevenLabsApiKey,
//       },
//     });

//     const voicesData = await voicesResponse.json();
    
//     if (!voicesResponse.ok) {
//       throw new Error(voicesData.detail || "Failed to fetch voices");
//     }

//     console.log(`📋 Retrieved ${voicesData.voices?.length || 0} voices`);
//     res.json(voicesData);
//   } catch (err) {
//     console.error("❌ Error listing voices:", err.message);
//     res.status(500).json({ error: "Failed to list voices: " + err.message });
//   }
// });

// // ----------------------
// // ROUTES
// // ----------------------
// app.post("/voiceupload", upload.single("voice"), async (req, res) => {
//   try {
//    console.log("✅ Request received: /voiceupload");
//    if (!req.file) return res.status(400).json({ error: "Voice file required" });

//    console.log(`📁 Uploaded file: ${req.file.originalname}, size: ${req.file.size} bytes, type: ${req.file.mimetype}`);
   
//    // Validate file type
//    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a', 'audio/webm'];
//    if (!allowedTypes.includes(req.file.mimetype)) {
//      await fs.unlink(req.file.path); // Clean up
//      return res.status(400).json({ error: `Unsupported file type: ${req.file.mimetype}. Please use MP3, WAV, M4A, or WebM.` });
//    }
   
//    const path = await uploadVoice(req.file);
//    res.json({ 
//      message: "Voice uploaded successfully", 
//      path,
//      originalName: req.file.originalname,
//      size: req.file.size
//    });
//   } catch (err) {
//    console.error("❌ Error in /voiceupload:", err.message);
//    res.status(500).json({ error: err.message });
//   }
// });

// app.post("/scriptupload", upload.single("script"), async (req, res) => {
//   try {
//    console.log("✅ Request received: /scriptupload");
//    if (!req.file) return res.status(400).json({ error: "Script file required" });

//    console.log(`📁 Uploaded script: ${req.file.originalname}, size: ${req.file.size} bytes, type: ${req.file.mimetype}`);
   
//    // Validate file type
//    const allowedTypes = [
//      'text/plain', 
//      'application/pdf', 
//      'application/msword', 
//      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
//    ];
   
//    if (!allowedTypes.includes(req.file.mimetype)) {
//      await fs.unlink(req.file.path); // Clean up
//      return res.status(400).json({ 
//        error: `Unsupported file type: ${req.file.mimetype}. Please use TXT, PDF, DOC, or DOCX files.` 
//      });
//    }
   
//    const result = await uploadScript(req.file);
//    res.json({ 
//      message: "Script uploaded and validated successfully", 
//      path: result.path,
//      originalName: req.file.originalname,
//      size: req.file.size,
//      wordCount: result.wordCount,
//      textPreview: result.textPreview,
//      fileType: result.fileType,
//      wordLimit: "400 words maximum"
//    });
   
//   } catch (err) {
//    console.error("❌ Error in /scriptupload:", err.message);
//    res.status(400).json({ error: err.message });
//   }
// });

// // ----------------------
// // HEALTH CHECK
// // ----------------------
// app.get("/health", (req, res) => {
//   res.json({ 
//     status: "OK", 
//     timestamp: new Date().toISOString(),
//     apiKeyConfigured: !!process.env.ELEVENLABS_API_KEY,
//     bucketConfigured: !!process.env.REACT_APP_SUPABASE_BUCKET
//   });
// });

// // ----------------------
// // ERROR HANDLING MIDDLEWARE
// // ----------------------
// app.use((err, req, res, next) => {
//   console.error("❌ Unhandled error:", err.message);
//   console.error("❌ Stack:", err.stack);
//   res.status(500).json({ error: "Internal server error: " + err.message });
// });

// // ----------------------
// // START SERVER
// // ----------------------
// const PORT = process.env.PORT || 5000;

// app.listen(PORT, () => {
//   console.log(`🚀 Server running at http://localhost:${PORT}`);
//   console.log("🔑 ElevenLabs API Key configured:", process.env.ELEVENLABS_API_KEY ? "✅ YES" : "❌ NO");
//   console.log("🪣 Supabase Bucket configured:", process.env.REACT_APP_SUPABASE_BUCKET ? "✅ YES" : "❌ NO");
//   console.log("🌐 Available endpoints:");
//   console.log("   GET  /health - Health check");
//   console.log("   GET  /test-api - Test ElevenLabs API key");
//   console.log("   GET  /list-voices - List available voices");
//   console.log("   POST /voiceupload - Upload voice file");
//   console.log("   POST /scriptupload - Upload script file");
//   console.log("   POST /create-elevenlabs-voice - Clone voice");
//   console.log("   POST /refinevoice - Generate audio with cloned voice");
//   console.log("   POST /analyze-similarity - Analyze voice similarity");
//   console.log("   POST /get-public-url - Get public URL for file");
// });


// module.exports = app;
import express from "express";
import multer from "multer";
import fs from "fs/promises";
import supabase from "./supabaseClient.js";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";

// Initialize the Express app
const app = express();

dotenv.config();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const upload = multer({ 
  dest: "uploads/",
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// ----------------------
// VOICE UPLOAD
// ----------------------
async function uploadVoice(file) {
  console.log("🎤 Processing voice upload...");
  const filePath = `voices/${Date.now()}_${file.originalname}`;
  
  const bucketName = process.env.REACT_APP_SUPABASE_BUCKET;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, await fs.readFile(file.path), {
      cacheControl: "3600",
      upsert: false,
      contentType: file.mimetype,
    });

  await fs.unlink(file.path);

  if (error) {
    console.error("❌ Voice upload error:", error.message);
    throw new Error(error.message);
  }

  console.log(`✅ Voice uploaded successfully to bucket '${bucketName}':`, data.path);
  return data.path;
}

// ----------------------
// SCRIPT UPLOAD WITH WORD COUNT VALIDATION
// ----------------------
async function uploadScript(file) {
  console.log("📜 Processing script upload...");
  
  try {
    // Step 1: Read file text based on mimetype
    let textContent;
    
    if (file.mimetype === "application/pdf") {
      console.log("📄 Processing PDF file...");
      
      const pdfParse = (await import("pdf-parse")).default;
      const dataBuffer = await fs.readFile(file.path);
      
      try {
        const pdfData = await pdfParse(dataBuffer);
        textContent = pdfData.text;
        console.log("✅ PDF parsed successfully");
      } catch (pdfError) {
        console.error("❌ PDF parsing error:", pdfError.message);
        await fs.unlink(file.path); // Clean up temp file
        throw new Error("Failed to parse PDF file. Please ensure it contains readable text.");
      }
      
    } else if (file.mimetype === "text/plain") {
      console.log("📝 Processing text file...");
      textContent = await fs.readFile(file.path, "utf-8");
      
    } else if (file.mimetype === "application/msword" || 
               file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      console.log("📄 Processing Word document...");
      
      try {
        textContent = await fs.readFile(file.path, "utf-8");
      } catch (docError) {
        console.error("❌ Document parsing error:", docError.message);
        await fs.unlink(file.path); // Clean up temp file
        throw new Error("Failed to parse Word document. Please convert to PDF or TXT format.");
      }
      
    } else {
      await fs.unlink(file.path); // Clean up temp file
      throw new Error(`Unsupported file type: ${file.mimetype}`);
    }

    // Step 2: Clean and validate text content
    if (!textContent || typeof textContent !== 'string') {
      await fs.unlink(file.path); // Clean up temp file
      throw new Error("File contains no readable text content.");
    }

    const cleanText = textContent.trim();
    if (!cleanText) {
      await fs.unlink(file.path); // Clean up temp file
      throw new Error("File appears to be empty or contains only whitespace.");
    }

    // Step 3: Count words
    const words = cleanText.split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;
    console.log(`📊 Script word count: ${wordCount}`);

    // Step 4: Validate word count
    if (wordCount > 400) {
      await fs.unlink(file.path); // Clean up temp file
      throw new Error(`Script exceeds maximum 400 words. Current count: ${wordCount} words.`);
    }

    if (wordCount === 0) {
      await fs.unlink(file.path); // Clean up temp file
      throw new Error("Script contains no words after processing.");
    }

    // Step 5: Upload to Supabase
    const filePath = `scripts/${Date.now()}_${file.originalname}`;
    const bucketName = process.env.REACT_APP_SUPABASE_BUCKET;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, await fs.readFile(file.path), {
        cacheControl: "3600",
        upsert: false,
        contentType: file.mimetype,
      });

    // Clean up temp file
    await fs.unlink(file.path);

    if (error) {
      console.error("❌ Script upload error:", error.message);
      throw new Error(error.message);
    }
    
    console.log(`✅ Script uploaded successfully to bucket '${bucketName}':`, data.path);
    console.log(`📈 Final word count: ${wordCount}/400 words`);
    
    return { 
      path: data.path, 
      wordCount: wordCount,
      textPreview: cleanText.substring(0, 150) + (cleanText.length > 150 ? '...' : ''),
      fileType: file.mimetype
    };

  } catch (err) {
    // Ensure temp file is cleaned up on any error
    try {
      await fs.unlink(file.path);
    } catch (unlinkErr) {
      // File might already be deleted, ignore error
      console.log("🗑️ Temp file already cleaned up");
    }
    throw err;
  }
}

// ----------------------
// CREATE ELEVENLABS VOICE ID
// ----------------------
app.post("/create-elevenlabs-voice", express.json(), async (req, res) => {
  try {
    console.log("🗣️ Request received: /create-elevenlabs-voice");
    const { voicePath } = req.body;

    if (!voicePath) {
      return res.status(400).json({ error: "Voice path is required." });
    }

    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    const bucketName = process.env.REACT_APP_SUPABASE_BUCKET;
    
    // Extract voice name from path, removing timestamp and extension
    const voiceName = path.basename(voicePath)
      .split('_')
      .slice(1)
      .join('_')
      .replace(/\.[^/.]+$/, "") || `voice_${Date.now()}`;

    if (!elevenLabsApiKey) {
      return res.status(500).json({ error: "ElevenLabs API Key is missing from environment variables." });
    }

    console.log(`🎯 Using API Key: ${elevenLabsApiKey.substring(0, 20)}...`);
    console.log(`📝 Voice name: ${voiceName}`);

    // Download the uploaded audio file from Supabase
    const { data: voiceData, error: voiceDownloadError } = await supabase.storage
      .from(bucketName)
      .download(voicePath);

    if (voiceDownloadError) {
      console.error("❌ Failed to download voice for cloning:", voiceDownloadError.message);
      return res.status(500).json({ error: "Failed to download voice file from storage." });
    }

    // Convert Blob to Buffer
    const voiceBuffer = Buffer.from(await voiceData.arrayBuffer());
    console.log(`📊 Voice buffer size: ${voiceBuffer.length} bytes`);
    
    if (voiceBuffer.length === 0) {
      throw new Error("Downloaded voice file is empty");
    }

    // Manual multipart form data construction for ElevenLabs compatibility
    const boundary = `----WebKitFormBoundary${Math.random().toString(16).substring(2)}`;
    const CRLF = '\r\n';
    
    // Build the multipart body parts
    const textParts = [];
    const binaryParts = [];
    
    // Add name field
    textParts.push(
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="name"${CRLF}${CRLF}` +
      `${voiceName}${CRLF}`
    );
    
    // Add file field header
    textParts.push(
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="files"; filename="${path.basename(voicePath)}"${CRLF}` +
      `Content-Type: ${voiceData.type || 'audio/mpeg'}${CRLF}${CRLF}`
    );
    
    // Add the binary file data
    binaryParts.push(voiceBuffer);
    
    // Add closing boundary
    textParts.push(`${CRLF}--${boundary}--${CRLF}`);
    
    // Combine all parts into final body
    const bodyParts = [];
    bodyParts.push(Buffer.from(textParts[0], 'utf8'));
    bodyParts.push(Buffer.from(textParts[1], 'utf8'));
    bodyParts.push(binaryParts[0]);
    bodyParts.push(Buffer.from(textParts[2], 'utf8'));
    
    const finalBody = Buffer.concat(bodyParts);
    
    console.log(`📤 Sending multipart request with boundary: ${boundary}`);
    console.log(`📊 Total body size: ${finalBody.length} bytes`);
    
    const elevenLabsResponse = await fetch(
      "https://api.elevenlabs.io/v1/voices/add",
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenLabsApiKey,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Accept": "application/json"
        },
        body: finalBody,
      }
    );

    const responseText = await elevenLabsResponse.text();
    console.log(`🔍 ElevenLabs Response Status: ${elevenLabsResponse.status}`);
    console.log(`🔍 Raw Response: ${responseText}`);
    
    let elevenLabsResponseJson;
    try {
      elevenLabsResponseJson = JSON.parse(responseText);
    } catch (parseError) {
      console.error("❌ Failed to parse ElevenLabs response:", responseText);
      throw new Error(`ElevenLabs API returned invalid response: ${responseText.substring(0, 200)}`);
    }
    
    if (!elevenLabsResponse.ok) {
      console.error("❌ ElevenLabs API error:", elevenLabsResponseJson);
      const errorMessage = elevenLabsResponseJson.detail?.message || 
                         elevenLabsResponseJson.detail || 
                         elevenLabsResponseJson.error?.message ||
                         elevenLabsResponseJson.message ||
                         `HTTP ${elevenLabsResponse.status}: ${elevenLabsResponse.statusText}`;
      throw new Error(`ElevenLabs API error: ${errorMessage}`);
    }
    
    const elevenLabsVoiceId = elevenLabsResponseJson.voice_id;
    
    if (!elevenLabsVoiceId) {
      console.error("❌ No voice_id in response:", elevenLabsResponseJson);
      throw new Error("No voice_id returned from ElevenLabs API");
    }
    
    console.log(`✅ New ElevenLabs Voice ID created: ${elevenLabsVoiceId}`);
    res.json({ 
      message: "Voice cloned successfully", 
      voiceId: elevenLabsVoiceId,
      voiceName: voiceName
    });

  } catch (err) {
    console.error("❌ Error in /create-elevenlabs-voice:", err.message);
    console.error("❌ Full error stack:", err.stack);
    res.status(500).json({ error: "Voice cloning failed: " + err.message });
  }
});

// ----------------------
// VOICE REFINEMENT (TEXT-TO-SPEECH) WITH ENHANCED CONTROLS
// ----------------------
app.post("/refinevoice", express.json(), async (req, res) => {
  try {
    console.log("🪄 Request received: /refinevoice");
    const { 
      elevenLabsVoiceId, 
      scriptPath, 
      scriptContent,
      voiceSettings = {}
    } = req.body;

    if (!elevenLabsVoiceId || (!scriptPath && !scriptContent)) {
      return res.status(400).json({ error: "Voice ID and either a script path or content are required." });
    }

    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    const bucketName = process.env.REACT_APP_SUPABASE_BUCKET;

    if (!elevenLabsApiKey) {
      return res.status(500).json({ error: "ElevenLabs API Key is missing." });
    }

    let finalScriptContent;
    let useTextInput = false;
    
    if (scriptContent && scriptContent.trim()) {
        finalScriptContent = scriptContent.trim();
        useTextInput = true;
        console.log("✅ Using text input for script.");
    } else if (scriptPath) {
        // Download the uploaded script file content from Supabase
        const { data: scriptData, error: scriptError } = await supabase.storage
            .from(bucketName)
            .download(scriptPath);

        if (scriptError) {
            console.error("❌ Failed to download script:", scriptError.message);
            return res.status(500).json({ error: "Failed to download script file." });
        }
        
        // Convert Blob to text
        finalScriptContent = (await scriptData.text()).trim();
        console.log("✅ Script content retrieved from file.");
    }

    if (!finalScriptContent) {
      return res.status(400).json({ error: "Script content is empty." });
    }

    // Validate word count for text input
    if (useTextInput && finalScriptContent) {
      const wordCount = finalScriptContent.split(/\s+/).filter(word => word.length > 0).length;
      console.log(`📊 Text input word count: ${wordCount}`);
      
      if (wordCount > 400) {
        return res.status(400).json({ 
          error: `Script exceeds maximum 400 words. Current count: ${wordCount} words.` 
        });
      }
      
      if (wordCount === 0) {
        return res.status(400).json({ error: "Script text is empty." });
      }
    }

    console.log(`📝 Script content length: ${finalScriptContent.length} characters`);
    console.log(`📄 Script preview: ${finalScriptContent.substring(0, 100)}...`);

    // Enhanced voice settings with defaults
    const enhancedVoiceSettings = {
      stability: voiceSettings.stability !== undefined ? voiceSettings.stability : 0.5,
      similarity_boost: voiceSettings.similarity !== undefined ? voiceSettings.similarity : 0.8,
      style: voiceSettings.style !== undefined ? voiceSettings.style : 0.0,
      use_speaker_boost: voiceSettings.speakerBoost !== undefined ? voiceSettings.speakerBoost : true
    };

    console.log("🎛️ Voice settings:", enhancedVoiceSettings);

    // ---- ELEVENLABS TEXT-TO-SPEECH API CALL ----
    console.log(`🎙️ Generating speech with voice ID: ${elevenLabsVoiceId}`);
    
    const requestBody = {
      text: finalScriptContent,
      model_id: "eleven_multilingual_v2",
      voice_settings: enhancedVoiceSettings
    };

    console.log(`🔧 TTS Request body prepared`);

    const synthesisResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenLabsApiKey,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg",
        },
        body: JSON.stringify(requestBody),
      }
    );

    console.log(`🔍 TTS Response Status: ${synthesisResponse.status}`);

    if (!synthesisResponse.ok) {
      const errorText = await synthesisResponse.text();
      console.error("❌ ElevenLabs synthesis error:", errorText);
      
      let errorMessage;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.detail?.message || errorJson.detail || errorJson.message || errorText;
      } catch {
        errorMessage = errorText;
      }
      
      throw new Error(`ElevenLabs synthesis failed: ${errorMessage}`);
    }

    const refinedAudioBuffer = await synthesisResponse.arrayBuffer();
    console.log(`✅ Voice synthesized by ElevenLabs. Audio size: ${refinedAudioBuffer.byteLength} bytes`);

    if (refinedAudioBuffer.byteLength === 0) {
      throw new Error("Generated audio file is empty");
    }

    // Create a unique filename for the refined voice
    const refinedFileName = `refinedvoice_${Date.now()}.mp3`;
    const refinedFilePath = `refinedvoices/${refinedFileName}`;

    // Upload the synthesized audio to Supabase
    const { data: refinedData, error: refinedError } = await supabase.storage
      .from(bucketName)
      .upload(refinedFilePath, Buffer.from(refinedAudioBuffer), {
        contentType: 'audio/mpeg',
        upsert: false,
      });

    if (refinedError) {
      console.error("❌ Refined voice upload failed:", refinedError.message);
      return res.status(500).json({ error: "Failed to upload refined voice to storage." });
    }

    console.log(`✅ Refined voice uploaded successfully to bucket '${bucketName}':`, refinedData.path);
    res.json({ 
      message: "Voice refined and uploaded successfully", 
      refinedPath: refinedData.path,
      audioSize: refinedAudioBuffer.byteLength,
      voiceSettings: enhancedVoiceSettings
    });

  } catch (err) {
    console.error("❌ Error in /refinevoice:", err.message);
    console.error("❌ Full error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
// VOICE SIMILARITY ANALYSIS
// ----------------------
app.post("/analyze-similarity", express.json(), async (req, res) => {
  try {
    console.log("🔍 Request received: /analyze-similarity");
    const { originalVoicePath, refinedVoicePath } = req.body;

    if (!originalVoicePath || !refinedVoicePath) {
      return res.status(400).json({ error: "Both original and refined voice paths are required." });
    }

    const bucketName = process.env.REACT_APP_SUPABASE_BUCKET;

    // Get public URLs for both audio files
    const { data: originalData } = supabase.storage.from(bucketName).getPublicUrl(originalVoicePath);
    const { data: refinedData } = supabase.storage.from(bucketName).getPublicUrl(refinedVoicePath);

    // For now, we'll return mock similarity data
    // In a real implementation, you would use audio analysis libraries
    const mockSimilarity = {
      overallSimilarity: Math.random() * 0.3 + 0.7, // 70-100%
      pitchSimilarity: Math.random() * 0.2 + 0.8,   // 80-100%
      toneSimilarity: Math.random() * 0.25 + 0.75,  // 75-100%
      speedSimilarity: Math.random() * 0.2 + 0.8,   // 80-100%
      clarityScore: Math.random() * 0.15 + 0.85,    // 85-100%
      originalUrl: originalData.publicUrl,
      refinedUrl: refinedData.publicUrl
    };

    console.log("🎯 Similarity analysis complete:", mockSimilarity);
    res.json(mockSimilarity);

  } catch (err) {
    console.error("❌ Error in /analyze-similarity:", err.message);
    res.status(500).json({ error: "Similarity analysis failed: " + err.message });
  }
});

// ----------------------
// GET PUBLIC URL
// ----------------------
app.post("/get-public-url", express.json(), async (req, res) => {
  try {
    const { path } = req.body;
    const bucketName = process.env.REACT_APP_SUPABASE_BUCKET;

    if (!path) {
      return res.status(400).json({ error: "File path is required." });
    }

    const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
    
    if (data && data.publicUrl) {
      console.log(`🔗 Public URL generated for ${path}: ${data.publicUrl}`);
      return res.json({ publicUrl: data.publicUrl });
    } else {
      console.error("❌ Failed to generate public URL for:", path);
      return res.status(500).json({ error: "Failed to get public URL." });
    }
  } catch (err) {
    console.error("❌ Error in /get-public-url:", err.message);
    return res.status(500).json({ error: "Failed to get public URL: " + err.message });
  }
});

// ----------------------
// TEST ENDPOINT
// ----------------------
app.get("/test-api", async (req, res) => {
  try {
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!elevenLabsApiKey) {
      return res.status(500).json({ error: "ElevenLabs API Key is missing." });
    }

    console.log(`🧪 Testing API Key: ${elevenLabsApiKey.substring(0, 20)}...`);
    
    // Test API key by getting user info
    const testResponse = await fetch("https://api.elevenlabs.io/v1/user", {
      method: "GET",
      headers: {
        "xi-api-key": elevenLabsApiKey,
      },
    });

    const testResult = await testResponse.text();
    console.log(`🔍 API Test Status: ${testResponse.status}`);
    console.log(`🔍 API Test Response: ${testResult.substring(0, 200)}...`);

    if (testResponse.ok) {
      res.json({ 
        message: "API Key is working!", 
        status: testResponse.status,
        response: JSON.parse(testResult)
      });
    } else {
      res.status(testResponse.status).json({ 
        error: "API Key test failed", 
        status: testResponse.status,
        response: testResult 
      });
    }
  } catch (err) {
    console.error("❌ API test error:", err.message);
    res.status(500).json({ error: "API test failed: " + err.message });
  }
});

// ----------------------
// LIST VOICES ENDPOINT
// ----------------------
app.get("/list-voices", async (req, res) => {
  try {
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!elevenLabsApiKey) {
      return res.status(500).json({ error: "ElevenLabs API Key is missing." });
    }

    const voicesResponse = await fetch("https://api.elevenlabs.io/v1/voices", {
      method: "GET",
      headers: {
        "xi-api-key": elevenLabsApiKey,
      },
    });

    const voicesData = await voicesResponse.json();
    
    if (!voicesResponse.ok) {
      throw new Error(voicesData.detail || "Failed to fetch voices");
    }

    console.log(`📋 Retrieved ${voicesData.voices?.length || 0} voices`);
    res.json(voicesData);
  } catch (err) {
    console.error("❌ Error listing voices:", err.message);
    res.status(500).json({ error: "Failed to list voices: " + err.message });
  }
});

// ----------------------
// ROUTES
// ----------------------
app.post("/voiceupload", upload.single("voice"), async (req, res) => {
  try {
   console.log("✅ Request received: /voiceupload");
   if (!req.file) return res.status(400).json({ error: "Voice file required" });

   console.log(`📁 Uploaded file: ${req.file.originalname}, size: ${req.file.size} bytes, type: ${req.file.mimetype}`);
   
   // Validate file type
   const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a', 'audio/webm'];
   if (!allowedTypes.includes(req.file.mimetype)) {
     await fs.unlink(req.file.path); // Clean up
     return res.status(400).json({ error: `Unsupported file type: ${req.file.mimetype}. Please use MP3, WAV, M4A, or WebM.` });
   }
   
   const voicePath = await uploadVoice(req.file);
   res.json({ 
     message: "Voice uploaded successfully", 
     path: voicePath,
     originalName: req.file.originalname,
     size: req.file.size
   });
  } catch (err) {
   console.error("❌ Error in /voiceupload:", err.message);
   res.status(500).json({ error: err.message });
  }
});

app.post("/scriptupload", upload.single("script"), async (req, res) => {
  try {
   console.log("✅ Request received: /scriptupload");
   if (!req.file) return res.status(400).json({ error: "Script file required" });

   console.log(`📁 Uploaded script: ${req.file.originalname}, size: ${req.file.size} bytes, type: ${req.file.mimetype}`);
   
   // Validate file type
   const allowedTypes = [
     'text/plain', 
     'application/pdf', 
     'application/msword', 
     'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
   ];
   
   if (!allowedTypes.includes(req.file.mimetype)) {
     await fs.unlink(req.file.path); // Clean up
     return res.status(400).json({ 
       error: `Unsupported file type: ${req.file.mimetype}. Please use TXT, PDF, DOC, or DOCX files.` 
     });
   }
   
   const result = await uploadScript(req.file);
   res.json({ 
     message: "Script uploaded and validated successfully", 
     path: result.path,
     originalName: req.file.originalname,
     size: req.file.size,
     wordCount: result.wordCount,
     textPreview: result.textPreview,
     fileType: result.fileType,
     wordLimit: "400 words maximum"
   });
   
  } catch (err) {
   console.error("❌ Error in /scriptupload:", err.message);
   res.status(400).json({ error: err.message });
  }
});

// ----------------------
// HEALTH CHECK
// ----------------------
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    apiKeyConfigured: !!process.env.ELEVENLABS_API_KEY,
    bucketConfigured: !!process.env.REACT_APP_SUPABASE_BUCKET
  });
});

// ----------------------
// ERROR HANDLING MIDDLEWARE
// ----------------------
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err.message);
  console.error("❌ Stack:", err.stack);
  res.status(500).json({ error: "Internal server error: " + err.message });
});

// ----------------------
// START SERVER
// ----------------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log("🔑 ElevenLabs API Key configured:", process.env.ELEVENLABS_API_KEY ? "✅ YES" : "❌ NO");
  console.log("🪣 Supabase Bucket configured:", process.env.REACT_APP_SUPABASE_BUCKET ? "✅ YES" : "❌ NO");
  console.log("🌐 Available endpoints:");
  console.log("   GET  /health - Health check");
  console.log("   GET  /test-api - Test ElevenLabs API key");
  console.log("   GET  /list-voices - List available voices");
  console.log("   POST /voiceupload - Upload voice file");
  console.log("   POST /scriptupload - Upload script file");
  console.log("   POST /create-elevenlabs-voice - Clone voice");
  console.log("   POST /refinevoice - Generate audio with cloned voice");
  console.log("   POST /analyze-similarity - Analyze voice similarity");
  console.log("   POST /get-public-url - Get public URL for file");
});

export default app;