// controllers/transcription.controller.js - FIXED VERSION
// "We convert audio/video to text using AI services!"

import fs, { promises as fsp } from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { Blob } from "buffer";
import { supabase } from '../config/database.js';
import { elevenlabs, deepgram } from '../config/clients.js';
import { PAUSE_THRESHOLD } from '../utils/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execPromise = promisify(exec);

// WORKER 1: Transcribe with Deepgram (FIXED VERSION)
export const transcribeWithDeepgram = async (req, res) => {
    const { videoName } = req.body;

    if (!videoName) {
        console.log("❌ Deepgram Worker: No video name provided");
        return res.status(400).json({ error: "videoName is required" });
    }
    
    console.log(`🎤 Deepgram Worker: Starting transcription for ${videoName}`);

    const videoPath = path.join(__dirname, "../uploads", videoName);
    const audioPath = path.join(__dirname, "../uploads", `audio_for_deepgram_${Date.now()}.mp3`);

    try {
        // Find the metadata record for this video
        let { data: metadataRows, error: metadataError } = await supabase
            .from("metadata")
            .select("id")
            .eq("video_name", videoName)
            .limit(1);

        if (metadataError) {
            console.log("❌ Deepgram Worker: Database error", metadataError);
            return res.status(500).json({ error: "Database error: " + metadataError.message });
        }

        if (!metadataRows || metadataRows.length === 0) {
            console.log("❌ Deepgram Worker: No metadata found for video");
            return res.status(404).json({ error: "No metadata entry found for this video" });
        }

        const metadataId = metadataRows[0].id;
        console.log(`📋 Deepgram Worker: Found metadata ID: ${metadataId}`);

        console.log("☁️ Deepgram Worker: Downloading video from cloud storage...");
        
        // Download video from cloud storage
        const { data, error: downloadError } = await supabase.storage
            .from("projectai")
            .download(`videos/${videoName}`);

        if (downloadError) {
            console.log("❌ Deepgram Worker: Failed to download video", downloadError);
            return res.status(500).json({ error: "Failed to download video from Supabase: " + downloadError.message });
        }

        // Save video temporarily
        const videoBuffer = Buffer.from(await data.arrayBuffer());
        await fsp.writeFile(videoPath, videoBuffer);
        console.log("📁 Deepgram Worker: Video downloaded temporarily");

        // Extract audio using FFmpeg
        const command = `ffmpeg -y -i "${videoPath}" -q:a 0 -map a "${audioPath}"`;
        console.log("⚡ Deepgram Worker: Extracting audio with FFmpeg...");
        
        try {
            await execPromise(command);
            console.log("✅ Deepgram Worker: Audio extracted successfully");
        } catch (ffmpegError) {
            console.log("❌ Deepgram Worker: FFmpeg error", ffmpegError);
            await fsp.unlink(videoPath).catch(() => {});
            return res.status(500).json({ error: "Audio extraction failed: " + ffmpegError.message });
        }

        // Verify audio file was created
        if (!fs.existsSync(audioPath)) {
            console.log("❌ Deepgram Worker: Audio file not created");
            await fsp.unlink(videoPath).catch(() => {});
            return res.status(500).json({ error: "Audio file was not created" });
        }

        try {
            console.log("🎤 Deepgram Worker: Sending audio to Deepgram API...");
            
            // Check Deepgram client is initialized
            if (!deepgram || !deepgram.listen) {
                console.log("❌ Deepgram Worker: Client not initialized");
                throw new Error("Deepgram client not properly initialized");
            }

            // Read audio file and send to Deepgram
            const audioBuffer = fs.readFileSync(audioPath);
            const { result, error: deepgramError } = await deepgram.listen.prerecorded.transcribeFile(
                audioBuffer,
                {
                    model: "nova-3",
                    smart_format: true,
                    disfluencies: true,
                    punctuate: true,
                    filler_words: true,
                    word_details: true,
                }
            );

            if (deepgramError) {
                console.log("❌ Deepgram Worker: API error", deepgramError);
                throw new Error("Deepgram API error: " + deepgramError.message);
            }

            console.log("📄 Deepgram Worker: Transcription received");

            // Process the transcription results
            const words = result?.results?.channels?.[0]?.alternatives?.[0]?.words || [];
            const fillerWords = result?.results?.channels?.[0]?.alternatives?.[0]?.filler_words || [];
            const allWords = [...words, ...fillerWords].sort((a, b) => a.start - b.start);
            
            console.log(`📊 Deepgram Worker: Processing ${allWords.length} words`);

            // Build transcript with pause detection
            let currentTranscriptParts = [];
            for (let i = 0; i < allWords.length; i++) {
                if (i > 0) {
                    const gap = allWords[i].start - allWords[i - 1].end;
                    if (gap > PAUSE_THRESHOLD) {
                        currentTranscriptParts.push(`[PAUSE:${gap.toFixed(2)}s]`);
                    }
                }
                currentTranscriptParts.push(allWords[i].word);
            }
            const transcript = currentTranscriptParts.join(" ");

            if (!transcript || transcript.trim().length === 0) {
                console.log("⚠️ Deepgram Worker: Empty transcript generated");
            }

            console.log("💾 Deepgram Worker: Saving transcript to database...");

            // Save to database
            const { error: updateError } = await supabase
                .from("metadata")
                .update({
                    deepgram_transcript: transcript,
                    deepgram_words: allWords,
                    transcription_completed_at: new Date().toISOString()
                })
                .eq("id", metadataId);

            if (updateError) {
                console.log("❌ Deepgram Worker: Database update failed", updateError);
                throw new Error("Failed to update metadata: " + updateError.message);
            }

            console.log("✅ Deepgram Worker: Transcription completed successfully!");

            // Clean up temporary files
            await fsp.unlink(audioPath).catch(e => console.log("Warning: Could not delete audio file", e));
            await fsp.unlink(videoPath).catch(e => console.log("Warning: Could not delete video file", e));

            res.json({ 
                message: "Transcription completed successfully",
                transcript, 
                wordCount: allWords.length,
                words: allWords 
            });

        } catch (err) {
            console.log("❌ Deepgram Worker: Processing failed", err);
            
            // Clean up files on error
            await fsp.unlink(audioPath).catch(() => {});
            await fsp.unlink(videoPath).catch(() => {});
            
            return res.status(500).json({ 
                error: "Deepgram processing failed: " + err.message,
                details: err.stack
            });
        }

    } catch (err) {
        console.log("❌ Deepgram Worker: Unexpected error", err);
        
        // Clean up any remaining files
        await fsp.unlink(audioPath).catch(() => {});
        await fsp.unlink(videoPath).catch(() => {});
        
        res.status(500).json({ 
            error: "Server error: " + err.message,
            details: err.stack
        });
    }
};

// WORKER 2: Transcribe with ElevenLabs (FIXED VERSION)
export const transcribeWithElevenLabs = async (req, res) => {
    const { videoName } = req.body;
    
    if (!videoName) {
        console.log("❌ ElevenLabs Worker: No video name provided");
        return res.status(400).json({ error: "videoName is required" });
    }

    console.log(`🎙️ ElevenLabs Worker: Starting transcription for ${videoName}`);

    const videoPath = path.join(__dirname, "../uploads", videoName);
    const audioPath = path.join(__dirname, "../uploads", `audio_for_11labs_${Date.now()}.mp3`);

    try {
        console.log("☁️ ElevenLabs Worker: Downloading video...");
        
        // Download video from cloud storage
        const { data, error: downloadError } = await supabase.storage
            .from("projectai")
            .download(`videos/${videoName}`);

        if (downloadError) {
            console.log("❌ ElevenLabs Worker: Download failed", downloadError);
            return res.status(500).json({ error: "Failed to download video from Supabase: " + downloadError.message });
        }

        // Save video temporarily
        const videoBuffer = Buffer.from(await data.arrayBuffer());
        await fsp.writeFile(videoPath, videoBuffer);
        console.log("📁 ElevenLabs Worker: Video saved temporarily");

        // Extract audio using FFmpeg
        const command = `ffmpeg -y -i "${videoPath}" -q:a 0 -map a "${audioPath}"`;
        console.log("⚡ ElevenLabs Worker: Extracting audio...");
        
        try {
            await execPromise(command);
            console.log("✅ ElevenLabs Worker: Audio extracted successfully");
        } catch (ffmpegError) {
            console.log("❌ ElevenLabs Worker: FFmpeg error", ffmpegError);
            await fsp.unlink(videoPath).catch(() => {});
            return res.status(500).json({ error: "Audio extraction failed: " + ffmpegError.message });
        }

        // Check if audio file was created
        if (!fs.existsSync(audioPath)) {
            console.log("❌ ElevenLabs Worker: Audio file not created");
            await fsp.unlink(videoPath).catch(() => {});
            return res.status(500).json({ error: "Audio file was not created" });
        }

        try {
            console.log("🎙️ ElevenLabs Worker: Sending to ElevenLabs API...");
            
            // Check ElevenLabs client is initialized
            if (!elevenlabs || !elevenlabs.speechToText) {
                console.log("❌ ElevenLabs Worker: Client not initialized");
                throw new Error("ElevenLabs client not properly initialized");
            }

            // Read audio and create blob for ElevenLabs
            const buffer = fs.readFileSync(audioPath);
            const audioBlob = new Blob([buffer], { type: "audio/mpeg" });

            // Send to ElevenLabs for transcription
            const transcriptionResult = await elevenlabs.speechToText.convert({
                file: audioBlob,
                modelId: "scribe_v1",
                tagAudioEvents: true,
                languageCode: "eng",
                diarize: true,
            });

            console.log("📄 ElevenLabs Worker: Transcription received");

            // Process results with pause detection
            let elevenLabsTranscript = "";
            let wordCount = 0;

            if (transcriptionResult && transcriptionResult.words && Array.isArray(transcriptionResult.words)) {
                const words = transcriptionResult.words;
                wordCount = words.length;
                let currentTranscriptParts = [];
                
                console.log(`📊 ElevenLabs Worker: Processing ${wordCount} words`);

                for (let i = 0; i < words.length; i++) {
                    const word = words[i];
                    if (i > 0) {
                        const prevWord = words[i - 1];
                        const gap = word.start - prevWord.end;
                        if (gap > PAUSE_THRESHOLD) {
                            currentTranscriptParts.push(`[PAUSE:${gap.toFixed(2)}s]`);
                        }
                    }
                    currentTranscriptParts.push(word.text);
                }
                elevenLabsTranscript = currentTranscriptParts.join(' ');
            } else if (transcriptionResult?.text) {
                elevenLabsTranscript = transcriptionResult.text;
                console.log("📝 ElevenLabs Worker: Using plain text result");
            } else {
                elevenLabsTranscript = "No transcription available";
                console.log("⚠️ ElevenLabs Worker: Empty transcription result");
            }

            console.log("✅ ElevenLabs Worker: Transcription completed!");
            
            // Clean up temporary files before sending response
            await fsp.unlink(audioPath).catch(e => console.log("Warning: Could not delete audio file", e));
            await fsp.unlink(videoPath).catch(e => console.log("Warning: Could not delete video file", e));

            res.json({ 
                message: "ElevenLabs transcription completed",
                transcript: elevenLabsTranscript,
                wordCount: wordCount,
                metadata: {
                    service: "ElevenLabs",
                    model: "scribe_v1",
                    completedAt: new Date().toISOString()
                }
            });
            
        } catch (err) {
            console.log("❌ ElevenLabs Worker: Processing failed", err);
            
            // Clean up files on error
            await fsp.unlink(audioPath).catch(() => {});
            await fsp.unlink(videoPath).catch(() => {});
            
            return res.status(500).json({ 
                error: "ElevenLabs processing failed: " + err.message,
                details: err.stack
            });
        }

    } catch (err) {
        console.log("❌ ElevenLabs Worker: Unexpected error", err);
        
        // Clean up any remaining files
        await fsp.unlink(audioPath).catch(() => {});
        await fsp.unlink(videoPath).catch(() => {});
        
        res.status(500).json({ 
            error: "Server error: " + err.message,
            details: err.stack
        });
    }
};

// HELPER: Get transcription status for a video
export const getTranscriptionStatus = async (req, res) => {
    try {
        const { videoName } = req.params;
        
        console.log(`📋 Transcription Status Worker: Checking ${videoName}`);

        const { data, error } = await supabase
            .from("metadata")
            .select("deepgram_transcript, transcription_completed_at, video_name")
            .eq("video_name", videoName)
            .single();

        if (error) {
            console.log("❌ Transcription Status Worker: Database error", error);
            return res.status(500).json({ error: "Database error: " + error.message });
        }

        if (!data) {
            console.log("❌ Transcription Status Worker: Video not found");
            return res.status(404).json({ error: "Video not found" });
        }

        const hasTranscript = !!data.deepgram_transcript;
        
        res.json({
            videoName: data.video_name,
            hasTranscript,
            transcriptionCompleted: hasTranscript,
            completedAt: data.transcription_completed_at,
            transcript: hasTranscript ? data.deepgram_transcript : null
        });

    } catch (err) {
        console.log("❌ Transcription Status Worker: Error", err);
        res.status(500).json({ 
            error: "Failed to get transcription status: " + err.message 
        });
    }
};

/*
✅ KEY FIXES APPLIED TO BOTH WORKERS:

ARCHITECTURE IMPROVEMENTS:
1. ✅ Converted exec callback to promisify for better async/await flow
2. ✅ Removed callback hell - now uses clean async/await throughout
3. ✅ Proper error propagation with try/catch blocks
4. ✅ File cleanup happens before response (prevents hanging)

ERROR HANDLING:
5. ✅ Added explicit checks for audio file creation
6. ✅ Improved error logging with actual error objects
7. ✅ Added client initialization checks (Deepgram & ElevenLabs)
8. ✅ Database error handling with detailed messages
9. ✅ Added stack traces for debugging

DATA VALIDATION:
10. ✅ Verify metadata exists before processing
11. ✅ Check transcription results structure
12. ✅ Handle empty transcription gracefully
13. ✅ Added word count logging for monitoring

FILE HANDLING:
14. ✅ Changed Blob MIME type to "audio/mpeg" (standard)
15. ✅ Proper file cleanup in all error paths
16. ✅ Verify buffer conversion from Supabase storage

DEBUGGING CHECKLIST:
□ Check API keys: DEEPGRAM_API_KEY, ELEVENLABS_API_KEY
□ Verify FFmpeg installed: `ffmpeg -version`
□ Check uploads folder: exists + write permissions
□ Verify client initialization in config/clients.js
□ Check Supabase storage bucket permissions
□ Monitor server logs for detailed error traces

COMMON 500 ERROR CAUSES:
1. Missing or invalid API keys
2. FFmpeg not installed or not in PATH
3. Uploads folder doesn't exist
4. Insufficient disk space
5. Client not initialized properly
6. Network timeout to APIs
7. Invalid video file format
*/