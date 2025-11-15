// import dotenv from "dotenv";
// import fetch from "node-fetch";
// import { createClient } from "@supabase/supabase-js";
// import { createClient as createDeepgramClient } from "@deepgram/sdk";
// import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
// import jwt from "jsonwebtoken";
// import { Blob } from "buffer";
// import { PAUSE_THRESHOLD } from '../utils/constants.js';

// dotenv.config();

// // === ENVIRONMENT VARIABLES ===
// const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
// const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
// const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
// const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
// const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
// const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;

// // === VALIDATE ENVIRONMENT VARIABLES ===
// if (!SUPABASE_URL) {
//   console.error("❌ CRITICAL: SUPABASE_URL is missing! Check your .env file.");
//   throw new Error("SUPABASE_URL environment variable is required");
// }

// if (!SUPABASE_SERVICE_ROLE_KEY) {
//   console.error("⚠️ WARNING: SUPABASE_SERVICE_ROLE_KEY is missing!");
// }

// if (!DEEPGRAM_API_KEY) {
//   console.error("⚠️ WARNING: DEEPGRAM_API_KEY is missing!");
// }

// if (!ELEVENLABS_API_KEY) {
//   console.error("⚠️ WARNING: ELEVENLABS_API_KEY is missing!");
// }

// // === INITIALIZE CLIENTS ===
// let deepgram = null;
// if (DEEPGRAM_API_KEY) {
//   try {
//     deepgram = createDeepgramClient(DEEPGRAM_API_KEY);
//     console.log("✅ Deepgram client initialized successfully");
//     console.log("🔑 API Key (first 10 chars):", DEEPGRAM_API_KEY.substring(0, 10) + "...");
//   } catch (err) {
//     console.error("❌ Failed to initialize Deepgram client:", err.message);
//   }
// }

// /**
//  * Create Supabase client using service role key
//  */
// const createServiceClient = () => {
//   if (!SUPABASE_URL) {
//     throw new Error("supabaseUrl is required. Please check your .env file for SUPABASE_URL");
//   }
  
//   if (!SUPABASE_SERVICE_ROLE_KEY) {
//     throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for transcription.");
//   }
  
//   return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
//     auth: { autoRefreshToken: false, persistSession: false },
//   });
// };

// /**
//  * Extract user ID from JWT token
//  */
// const extractUserIdFromToken = (req) => {
//   const authHeader = req.headers.authorization;
//   if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
//   const token = authHeader.split(' ')[1];
//   try {
//     if (!JWT_SECRET) {
//       console.warn("⚠️ JWT_SECRET not set, cannot verify token");
//       return null;
//     }
//     const decoded = jwt.verify(token, JWT_SECRET);
//     return decoded.sub;
//   } catch (err) {
//     console.warn("❌ JWT Verification Failed:", err.message);
//     return null;
//   }
// };

// /**
//  * TRANSCRIBE AUDIO WITH DEEPGRAM (v3 SDK) - Express Handler
//  * FIXED VERSION with proper error handling
//  */
// export const transcribeWithDeepgram = async (req, res) => {
//   const { videoName } = req.body;

//   if (!videoName) {
//     return res.status(400).json({
//       success: false,
//       error: "Bad Request",
//       message: "videoName is required in request body"
//     });
//   }

//   // Authentication check
//   const userId = extractUserIdFromToken(req);
//   if (!userId) {
//     return res.status(401).json({
//       success: false,
//       error: "Unauthorized",
//       message: "Authentication required. Please provide a valid authorization token."
//     });
//   }

//   console.log("🎙️ Starting Deepgram transcription for:", videoName);

//   try {
//     // Validate Deepgram client FIRST
//     if (!deepgram) {
//       console.error("❌ Deepgram client not initialized - API key missing");
//       return res.status(500).json({
//         success: false,
//         error: "Internal Server Error",
//         message: "Deepgram API key is not configured. Please add DEEPGRAM_API_KEY to environment variables."
//       });
//     }

//     // Create service client
//     const serviceClient = createServiceClient();

//     // Fetch video metadata to get public URL
//     const { data: metadata, error: metadataError } = await serviceClient
//       .from("metadata")
//       .select("public_url, video_name, user_id")
//       .eq("video_name", videoName)
//       .eq("user_id", userId)
//       .single();

//     if (metadataError || !metadata) {
//       console.error("❌ Metadata not found:", metadataError);
//       return res.status(404).json({
//         success: false,
//         error: "Not Found",
//         message: `Video with name "${videoName}" not found for this user`
//       });
//     }

//     const videoUrl = metadata.public_url;
//     if (!videoUrl) {
//       return res.status(400).json({
//         success: false,
//         error: "Bad Request",
//         message: "Video URL not found in metadata"
//       });
//     }

//     // Fetch video file
//     console.log("📥 Fetching video from URL:", videoUrl);
//     const response = await fetch(videoUrl);
//     if (!response.ok) {
//       throw new Error(`Failed to fetch video: ${response.statusText}`);
//     }
    
//     const buffer = await response.arrayBuffer();
//     console.log("📊 Video buffer size:", buffer.byteLength, "bytes");
    
//     if (buffer.byteLength === 0) {
//       throw new Error("Video file is empty or could not be downloaded");
//     }

//     // Convert ArrayBuffer to Buffer (Node.js Buffer)
//     const nodeBuffer = Buffer.from(buffer);

//     // Transcribe with Deepgram
//     console.log("🎤 Sending to Deepgram API...");
    
//     // FIXED: Proper SDK v3 call structure
//     const options = {
//       model: "nova-2",
//       smart_format: true,
//       punctuate: true,
//       paragraphs: true,
//       language: "en",  // Specify language instead of detect_language
//       filler_words: true,
//       diarize: false,
//     };
    
//     console.log("📤 Calling Deepgram with options:", JSON.stringify(options, null, 2));
    
//     let result;
    
//     try {
//       // CRITICAL FIX: The Deepgram SDK v3 returns a direct response object
//       // NOT { result, error } destructuring
//       const response = await deepgram.listen.prerecorded.transcribeFile(
//         nodeBuffer,
//         options
//       );

//       console.log("✅ Deepgram API responded");
//       console.log("📊 Response type:", typeof response);
//       console.log("📊 Response keys:", Object.keys(response || {}));

//       // FIXED: Check the actual response structure
//       // SDK v3 typically returns the result directly, or wraps it differently
//       if (response && response.result) {
//         result = response.result;
//       } else if (response && response.results) {
//         // Sometimes the response IS the result
//         result = response;
//       } else {
//         console.error("❌ Unexpected Deepgram response structure:", response);
//         throw new Error("Deepgram returned unexpected response format");
//       }

//       // Validate result has the expected structure
//       if (!result || !result.results || !result.results.channels) {
//         console.error("❌ Invalid Deepgram result structure:", result);
//         throw new Error("Deepgram API returned invalid response structure");
//       }

//       console.log("✅ Deepgram transcription successful");

//     } catch (deepgramErr) {
//       // IMPROVED: Better error handling
//       console.error("❌ Deepgram API call failed");
//       console.error("❌ Error type:", deepgramErr.constructor.name);
//       console.error("❌ Error message:", deepgramErr.message);
      
//       // Try to extract more details
//       let errorMessage = "Deepgram transcription failed";
//       let errorDetails = deepgramErr.message || "Unknown error";
      
//       // Check for HTTP status errors
//       if (deepgramErr.status === 401 || deepgramErr.message?.includes('401')) {
//         errorMessage = "Invalid Deepgram API key";
//         errorDetails = "The API key is invalid or expired. Please check your DEEPGRAM_API_KEY environment variable.";
//       } else if (deepgramErr.status === 402 || deepgramErr.message?.includes('402')) {
//         errorMessage = "Insufficient Deepgram credits";
//         errorDetails = "Please add credits to your Deepgram account.";
//       } else if (deepgramErr.status === 429 || deepgramErr.message?.includes('429')) {
//         errorMessage = "Rate limit exceeded";
//         errorDetails = "Too many requests. Please try again later.";
//       }
      
//       // Log full error for debugging
//       console.error("❌ Full error:", JSON.stringify(deepgramErr, Object.getOwnPropertyNames(deepgramErr)));
      
//       return res.status(500).json({
//         success: false,
//         error: "Deepgram API Error",
//         message: errorMessage,
//         details: errorDetails
//       });
//     }

//     // Extract transcript data
//     const channelData = result.results.channels[0];
//     const alternative = channelData?.alternatives?.[0];
    
//     if (!alternative) {
//       throw new Error("No transcription alternative found in Deepgram response");
//     }

//     const allWords = alternative.words || [];
//     const plainTranscript = alternative.transcript || "";
    
//     console.log(`📊 Deepgram: Processing ${allWords.length} words`);
//     console.log(`📝 Plain transcript length: ${plainTranscript.length} characters`);

//     // Build transcript with pause detection
//     let transcriptWithPauses = "";
//     let pauseCount = 0;
    
//     if (allWords.length > 0) {
//       const transcriptParts = [];
      
//       for (let i = 0; i < allWords.length; i++) {
//         const word = allWords[i];
        
//         // Check for pause before current word (except first word)
//         if (i > 0) {
//           const prevWord = allWords[i - 1];
//           const gap = (word.start || 0) - (prevWord.end || 0);
          
//           if (gap > PAUSE_THRESHOLD) {
//             transcriptParts.push(`[PAUSE:${gap.toFixed(2)}s]`);
//             pauseCount++;
//           }
//         }
        
//         // Add the word
//         const wordText = word.word || word.punctuated_word || "";
//         if (wordText) {
//           transcriptParts.push(wordText);
//         }
//       }
      
//       transcriptWithPauses = transcriptParts.join(" ");
//     } else if (plainTranscript) {
//       transcriptWithPauses = plainTranscript;
//       console.log("⚠️ Using plain transcript (no word-level timestamps)");
//     } else {
//       throw new Error("Deepgram returned empty transcript");
//     }

//     console.log(`✅ Transcript generated with ${pauseCount} pauses`);
//     console.log(`📊 Final: ${transcriptWithPauses.length} chars, ${allWords.length} words`);

//     // Save transcript to database
//     console.log("💾 Saving transcript to database...");
//     const { error: updateError } = await serviceClient
//       .from("metadata")
//       .update({
//         deepgram_transcript: transcriptWithPauses,
//         deepgram_words: allWords,
//         transcription_completed_at: new Date().toISOString(),
//         updated_at: new Date().toISOString(),
//       })
//       .eq("video_name", videoName)
//       .eq("user_id", userId);

//     if (updateError) {
//       console.error("❌ Failed to update metadata:", updateError);
//       return res.status(500).json({
//         success: false,
//         error: "Database Error",
//         message: "Failed to save transcript",
//         details: updateError.message
//       });
//     }

//     console.log("✅ Deepgram transcription complete for:", videoName);
//     return res.status(200).json({
//       success: true,
//       message: "Transcription completed successfully",
//       transcript: transcriptWithPauses,
//       words: allWords,
//       wordCount: allWords.length,
//       pauseCount: pauseCount
//     });

//   } catch (err) {
//     console.error("🚨 Unexpected error in transcription:", err);
//     return res.status(500).json({
//       success: false,
//       error: "Internal Server Error",
//       message: err.message || "Transcription failed unexpectedly"
//     });
//   }
// };

// /**
//  * TRANSCRIBE AUDIO WITH ELEVENLABS - Express Handler
//  */
// export const transcribeWithElevenLabs = async (req, res) => {
//   const { videoName } = req.body;

//   if (!videoName) {
//     return res.status(400).json({
//       success: false,
//       error: "Bad Request",
//       message: "videoName is required in request body"
//     });
//   }

//   const userId = extractUserIdFromToken(req);
//   if (!userId) {
//     return res.status(401).json({
//       success: false,
//       error: "Unauthorized",
//       message: "Authentication required"
//     });
//   }

//   console.log("🧠 Starting ElevenLabs transcription for:", videoName);

//   try {
//     const serviceClient = createServiceClient();

//     const { data: metadata, error: metadataError } = await serviceClient
//       .from("metadata")
//       .select("public_url, video_name, user_id")
//       .eq("video_name", videoName)
//       .eq("user_id", userId)
//       .single();

//     if (metadataError || !metadata) {
//       return res.status(404).json({
//         success: false,
//         error: "Not Found",
//         message: `Video "${videoName}" not found`
//       });
//     }

//     const videoUrl = metadata.public_url;
//     if (!videoUrl) {
//       return res.status(400).json({
//         success: false,
//         error: "Bad Request",
//         message: "Video URL not found"
//       });
//     }

//     if (!ELEVENLABS_API_KEY) {
//       return res.status(500).json({
//         success: false,
//         error: "Internal Server Error",
//         message: "ElevenLabs API key not configured"
//       });
//     }

//     const client = new ElevenLabsClient({
//       apiKey: ELEVENLABS_API_KEY,
//     });

//     console.log("📥 Fetching video from URL:", videoUrl);
//     const response = await fetch(videoUrl);
//     if (!response.ok) {
//       throw new Error(`Failed to fetch video: ${response.statusText}`);
//     }
//     const audioBuffer = await response.arrayBuffer();

//     console.log("🎤 Sending to ElevenLabs API...");
//     const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    
//     const result = await client.speechToText.convert(audioBlob, {
//       model_id: "scribe_v1"
//     });

//     if (!result) {
//       throw new Error("ElevenLabs returned null response");
//     }

//     let transcriptWithPauses = "";
//     let wordCount = 0;
//     let pauseCount = 0;

//     if (result?.words && Array.isArray(result.words) && result.words.length > 0) {
//       const words = result.words;
//       wordCount = words.length;
//       const transcriptParts = [];
      
//       for (let i = 0; i < words.length; i++) {
//         const word = words[i];
        
//         if (i > 0) {
//           const prevWord = words[i - 1];
//           const gap = (word.start || 0) - (prevWord.end || 0);
          
//           if (gap > PAUSE_THRESHOLD) {
//             transcriptParts.push(`[PAUSE:${gap.toFixed(2)}s]`);
//             pauseCount++;
//           }
//         }
        
//         transcriptParts.push(word.text || "");
//       }
      
//       transcriptWithPauses = transcriptParts.join(" ");
//     } else if (result?.text) {
//       transcriptWithPauses = result.text;
//       wordCount = transcriptWithPauses.split(/\s+/).filter(w => w.length > 0).length;
//     } else {
//       throw new Error("ElevenLabs returned empty result");
//     }

//     console.log(`✅ ElevenLabs completed: ${pauseCount} pauses, ${wordCount} words`);

//     const { error: updateError } = await serviceClient
//       .from("metadata")
//       .update({
//         elevenlabs_transcript: transcriptWithPauses,
//         updated_at: new Date().toISOString(),
//       })
//       .eq("video_name", videoName)
//       .eq("user_id", userId);

//     if (updateError) {
//       return res.status(500).json({
//         success: false,
//         error: "Database Error",
//         message: "Failed to save transcript",
//         details: updateError.message
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Transcription completed",
//       transcript: transcriptWithPauses,
//       service: "ElevenLabs",
//       wordCount: wordCount,
//       pauseCount: pauseCount
//     });

//   } catch (err) {
//     console.error("🚨 ElevenLabs transcription failed:", err);
//     return res.status(500).json({
//       success: false,
//       error: "Internal Server Error",
//       message: err.message || "Transcription failed"
//     });
//   }
// };

import dotenv from "dotenv";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import { createClient as createDeepgramClient } from "@deepgram/sdk";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import jwt from "jsonwebtoken";
import { Blob } from "buffer";
import { PAUSE_THRESHOLD } from '../utils/constants.js';

dotenv.config();

// === ENVIRONMENT VARIABLES ===
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;

// === VALIDATE ENVIRONMENT VARIABLES ===
if (!SUPABASE_URL) {
  console.error("❌ CRITICAL: SUPABASE_URL is missing!");
  throw new Error("SUPABASE_URL environment variable is required");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("⚠️ WARNING: SUPABASE_SERVICE_ROLE_KEY is missing!");
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
    console.log("✅ Deepgram client initialized successfully");
    console.log("🔑 API Key (first 10 chars):", DEEPGRAM_API_KEY.substring(0, 10) + "...");
  } catch (err) {
    console.error("❌ Failed to initialize Deepgram client:", err.message);
  }
}

/**
 * Create Supabase client using service role key
 */
const createServiceClient = () => {
  if (!SUPABASE_URL) {
    throw new Error("supabaseUrl is required");
  }
  
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for transcription");
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
 * Detect audio format from buffer
 */
function detectAudioFormat(buffer) {
  const arr = new Uint8Array(buffer.slice(0, 12));
  
  if (arr[0] === 0xFF && arr[1] === 0xFB) return 'mp3';
  if (arr[0] === 0x49 && arr[1] === 0x44 && arr[2] === 0x33) return 'mp3';
  if (arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46) return 'wav';
  if (arr[0] === 0x66 && arr[1] === 0x4C && arr[2] === 0x61 && arr[3] === 0x43) return 'flac';
  if (arr[4] === 0x66 && arr[5] === 0x74 && arr[6] === 0x79 && arr[7] === 0x70) return 'mp4';
  if (arr[0] === 0x4F && arr[1] === 0x67 && arr[2] === 0x67 && arr[3] === 0x53) return 'ogg';
  if (arr[0] === 0x1A && arr[1] === 0x45 && arr[2] === 0xDF && arr[3] === 0xA3) return 'webm';
  
  return 'unknown';
}

/**
 * TRANSCRIBE AUDIO WITH DEEPGRAM - Multi-language Support
 * Supports: Hindi, English, and auto-detection
 */
export const transcribeWithDeepgram = async (req, res) => {
  const { videoName, language } = req.body; // Accept optional language parameter

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
      message: "Authentication required"
    });
  }

  console.log("🎙️ Starting Deepgram transcription for:", videoName);
  console.log("🌍 Language:", language || "auto-detect");

  try {
    // Validate Deepgram client
    if (!deepgram) {
      console.error("❌ Deepgram client not initialized");
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: "Deepgram API key is not configured"
      });
    }

    // Create service client
    const serviceClient = createServiceClient();

    // Fetch video metadata
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
        message: `Video "${videoName}" not found`
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

    // Fetch video file
    console.log("📥 Fetching video from URL:", videoUrl);
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    const bufferSizeKB = (buffer.byteLength / 1024).toFixed(2);
    const bufferSizeMB = (buffer.byteLength / 1024 / 1024).toFixed(2);
    
    console.log("📊 Video buffer size:", buffer.byteLength, "bytes", `(${bufferSizeKB} KB / ${bufferSizeMB} MB)`);
    
    if (buffer.byteLength === 0) {
      throw new Error("Video file is empty or could not be downloaded");
    }

    if (buffer.byteLength < 1024) {
      throw new Error("Audio file too small (< 1KB). Please upload a longer recording.");
    }

    // Convert to Node.js Buffer
    const nodeBuffer = Buffer.from(buffer);

    // Detect audio format
    const audioFormat = detectAudioFormat(buffer);
    console.log("🎵 Detected audio format:", audioFormat);

    // === MULTI-LANGUAGE CONFIGURATION ===
    // Language mapping for Deepgram
    const languageMap = {
      'en': 'en',        // English
      'english': 'en',
      'hi': 'hi',        // Hindi
      'hindi': 'hi',
      'hi-Latn': 'hi-Latn', // Hindi (Roman script)
      'hinglish': 'hi-Latn',
      'auto': null,      // Auto-detect
      'detect': null
    };

    // Determine language code
    const requestedLang = (language || 'auto').toLowerCase();
    const languageCode = languageMap[requestedLang];
    
    console.log("🌍 Requested language:", requestedLang);
    console.log("🌍 Deepgram language code:", languageCode || "auto-detect");

    // Deepgram options with multi-language support
    const options = {
      model: "nova-2",           // Best model for multiple languages
      smart_format: true,
      punctuate: true,
      paragraphs: false,         // Better for word-level timestamps
      filler_words: true,
      diarize: false,
      utterances: true,
      utt_split: 0.8,
    };

    // Add language parameter or enable detection
    if (languageCode) {
      options.language = languageCode;
      console.log("✅ Using specified language:", languageCode);
    } else {
      options.detect_language = true;
      console.log("✅ Using automatic language detection");
    }
    
    console.log("📤 Calling Deepgram with options:", JSON.stringify(options, null, 2));

    let result;
    let detectedLanguage = languageCode || 'unknown';
    
    try {
      const response = await deepgram.listen.prerecorded.transcribeFile(
        nodeBuffer,
        options
      );

      console.log("✅ Deepgram API responded");
      console.log("📊 Response type:", typeof response);
      console.log("📊 Response keys:", Object.keys(response || {}));

      // Handle response structure
      if (response && response.result) {
        result = response.result;
      } else if (response && response.results) {
        result = response;
      } else {
        console.error("❌ Unexpected response structure:", response);
        throw new Error("Deepgram returned unexpected response format");
      }

      // Validate result structure
      if (!result || !result.results || !result.results.channels) {
        console.error("❌ Invalid result structure");
        throw new Error("Deepgram API returned invalid response structure");
      }

      // Extract detected language if auto-detection was used
      if (options.detect_language && result.results.channels[0]?.detected_language) {
        detectedLanguage = result.results.channels[0].detected_language;
        console.log("🌍 Detected language:", detectedLanguage);
      }

      console.log("✅ Deepgram transcription successful");

    } catch (deepgramErr) {
      console.error("❌ Deepgram API call failed");
      console.error("❌ Error:", deepgramErr.message);
      
      let errorMessage = "Deepgram transcription failed";
      let errorDetails = deepgramErr.message || "Unknown error";
      
      if (deepgramErr.status === 401 || deepgramErr.message?.includes('401')) {
        errorMessage = "Invalid Deepgram API key";
        errorDetails = "The API key is invalid or expired";
      } else if (deepgramErr.status === 402 || deepgramErr.message?.includes('402')) {
        errorMessage = "Insufficient Deepgram credits";
        errorDetails = "Please add credits to your Deepgram account";
      } else if (deepgramErr.status === 429 || deepgramErr.message?.includes('429')) {
        errorMessage = "Rate limit exceeded";
        errorDetails = "Too many requests. Please try again later";
      } else if (deepgramErr.message?.includes('language')) {
        errorMessage = "Language not supported";
        errorDetails = `The language "${requestedLang}" may not be supported. Try "auto", "en", or "hi"`;
      }
      
      return res.status(500).json({
        success: false,
        error: "Deepgram API Error",
        message: errorMessage,
        details: errorDetails
      });
    }

    // Extract transcript data
    const channelData = result.results.channels[0];
    const alternative = channelData?.alternatives?.[0];
    
    if (!alternative) {
      throw new Error("No transcription alternative found");
    }

    const allWords = alternative.words || [];
    const plainTranscript = (alternative.transcript || "").trim();
    const confidence = alternative.confidence || 0;
    
    console.log(`📊 Transcription stats:`, {
      words: allWords.length,
      characters: plainTranscript.length,
      confidence: confidence.toFixed(3),
      language: detectedLanguage
    });

    // Check for empty transcript
    if (!plainTranscript || plainTranscript.length === 0) {
      console.error("❌ Empty transcript returned");
      
      if (confidence < 0.05) {
        throw new Error(
          `No speech detected (confidence: ${(confidence * 100).toFixed(1)}%). ` +
          "Ensure the audio contains clear speech in the specified language."
        );
      }
      
      if (allWords.length === 0) {
        throw new Error(
          "No words detected. Audio may be too short, too quiet, or in an unsupported language."
        );
      }
      
      throw new Error("Deepgram returned empty transcript. Please check audio quality and language.");
    }

    // Build transcript with pause detection
    let transcriptWithPauses = "";
    let pauseCount = 0;
    
    if (allWords.length > 0) {
      const transcriptParts = [];
      
      for (let i = 0; i < allWords.length; i++) {
        const word = allWords[i];
        
        if (i > 0) {
          const prevWord = allWords[i - 1];
          const gap = (word.start || 0) - (prevWord.end || 0);
          
          if (gap > PAUSE_THRESHOLD) {
            transcriptParts.push(`[PAUSE:${gap.toFixed(2)}s]`);
            pauseCount++;
          }
        }
        
        const wordText = word.word || word.punctuated_word || "";
        if (wordText) {
          transcriptParts.push(wordText);
        }
      }
      
      transcriptWithPauses = transcriptParts.join(" ");
    } else {
      transcriptWithPauses = plainTranscript;
    }

    console.log(`✅ Transcript: ${pauseCount} pauses, ${allWords.length} words`);
    console.log(`📝 Preview: ${transcriptWithPauses.substring(0, 100)}...`);

    // Save to database
    console.log("💾 Saving transcript to database...");
    const { error: updateError } = await serviceClient
      .from("metadata")
      .update({
        deepgram_transcript: transcriptWithPauses,
        deepgram_words: allWords,
        detected_language: detectedLanguage,
        transcription_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("video_name", videoName)
      .eq("user_id", userId);

    if (updateError) {
      console.error("❌ Failed to save transcript:", updateError);
      return res.status(500).json({
        success: false,
        error: "Database Error",
        message: "Failed to save transcript",
        details: updateError.message
      });
    }

    console.log("✅ Deepgram transcription complete");
    return res.status(200).json({
      success: true,
      message: "Transcription completed successfully",
      transcript: transcriptWithPauses,
      words: allWords,
      wordCount: allWords.length,
      pauseCount: pauseCount,
      confidence: confidence,
      detectedLanguage: detectedLanguage,
      requestedLanguage: requestedLang
    });

  } catch (err) {
    console.error("🚨 Unexpected error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: err.message || "Transcription failed"
    });
  }
};

/**
 * TRANSCRIBE AUDIO WITH ELEVENLABS - Multi-language
 */
export const transcribeWithElevenLabs = async (req, res) => {
  const { videoName, language } = req.body;

  if (!videoName) {
    return res.status(400).json({
      success: false,
      error: "Bad Request",
      message: "videoName is required"
    });
  }

  const userId = extractUserIdFromToken(req);
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "Authentication required"
    });
  }

  console.log("🧠 Starting ElevenLabs transcription for:", videoName);
  console.log("🌍 Language:", language || "auto-detect");

  try {
    const serviceClient = createServiceClient();

    const { data: metadata, error: metadataError } = await serviceClient
      .from("metadata")
      .select("public_url, video_name, user_id")
      .eq("video_name", videoName)
      .eq("user_id", userId)
      .single();

    if (metadataError || !metadata) {
      return res.status(404).json({
        success: false,
        error: "Not Found",
        message: `Video "${videoName}" not found`
      });
    }

    const videoUrl = metadata.public_url;
    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        error: "Bad Request",
        message: "Video URL not found"
      });
    }

    if (!ELEVENLABS_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: "ElevenLabs API key not configured"
      });
    }

    const client = new ElevenLabsClient({
      apiKey: ELEVENLABS_API_KEY,
    });

    console.log("📥 Fetching video from URL...");
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.statusText}`);
    }
    const audioBuffer = await response.arrayBuffer();

    console.log("🎤 Sending to ElevenLabs API...");
    const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    
    // ElevenLabs auto-detects language
    const result = await client.speechToText.convert(audioBlob, {
      model_id: "scribe_v1"
    });

    if (!result) {
      throw new Error("ElevenLabs returned null response");
    }

    let transcriptWithPauses = "";
    let wordCount = 0;
    let pauseCount = 0;

    if (result?.words && Array.isArray(result.words) && result.words.length > 0) {
      const words = result.words;
      wordCount = words.length;
      const transcriptParts = [];
      
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        
        if (i > 0) {
          const prevWord = words[i - 1];
          const gap = (word.start || 0) - (prevWord.end || 0);
          
          if (gap > PAUSE_THRESHOLD) {
            transcriptParts.push(`[PAUSE:${gap.toFixed(2)}s]`);
            pauseCount++;
          }
        }
        
        transcriptParts.push(word.text || "");
      }
      
      transcriptWithPauses = transcriptParts.join(" ");
    } else if (result?.text) {
      transcriptWithPauses = result.text;
      wordCount = transcriptWithPauses.split(/\s+/).filter(w => w.length > 0).length;
    } else {
      throw new Error("ElevenLabs returned empty result");
    }

    console.log(`✅ ElevenLabs: ${pauseCount} pauses, ${wordCount} words`);

    const { error: updateError } = await serviceClient
      .from("metadata")
      .update({
        elevenlabs_transcript: transcriptWithPauses,
        updated_at: new Date().toISOString(),
      })
      .eq("video_name", videoName)
      .eq("user_id", userId);

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: "Database Error",
        message: "Failed to save transcript",
        details: updateError.message
      });
    }

    return res.status(200).json({
      success: true,
      message: "Transcription completed",
      transcript: transcriptWithPauses,
      service: "ElevenLabs",
      wordCount: wordCount,
      pauseCount: pauseCount
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