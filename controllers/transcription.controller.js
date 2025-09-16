// controllers/transcription.controller.js - AUDIO TRANSCRIPTION WORKERS
// "We convert audio/video to text using AI services!"

import fs, { promises as fsp } from "fs";
import path from "path";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import { Blob } from "buffer";
import { supabase } from '../config/database.js';
import { elevenlabs, deepgram } from '../config/clients.js';
import { PAUSE_THRESHOLD } from '../utils/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// WORKER 1: Transcribe with Deepgram (Professional transcription service)
export const transcribeWithDeepgram = async (req, res) => {
    const { videoName } = req.body;

    if (!videoName) {
        console.log("❌ Deepgram Worker: No video name provided");
        return res.status(400).json({ error: "videoName is required" });
    }
    
    console.log(`🎤 Deepgram Worker: Starting transcription for ${videoName}`);

    // Find the metadata record for this video
    let { data: metadataRows, error: metadataError } = await supabase
        .from("metadata")
        .select("id")
        .eq("video_name", videoName)
        .limit(1);

    if (metadataError || !metadataRows || metadataRows.length === 0) {
        console.log("❌ Deepgram Worker: No metadata found for video");
        return res.status(404).json({ error: "No metadata entry found for this video" });
    }

    const metadataId = metadataRows[0].id;
    const videoPath = path.join(__dirname, "../uploads", videoName);
    const audioPath = path.join(__dirname, "../uploads", `audio_for_deepgram_${Date.now()}.mp3`);

    try {
        console.log("☁️ Deepgram Worker: Downloading video from cloud storage...");
        
        // Download video from cloud storage
        const { data, error } = await supabase.storage
            .from("projectai")
            .download(`videos/${videoName}`);

        if (error) {
            console.log("❌ Deepgram Worker: Failed to download video");
            return res.status(500).json({ error: "Failed to download video from Supabase" });
        }

        // Save video temporarily
        await fsp.writeFile(videoPath, Buffer.from(await data.arrayBuffer()));
        console.log("📁 Deepgram Worker: Video downloaded temporarily");

        // Extract audio using FFmpeg
        const command = `ffmpeg -y -i "${videoPath}" -q:a 0 -map a "${audioPath}"`;
        console.log("⚡ Deepgram Worker: Extracting audio with FFmpeg...");
        
        exec(command, async (error, _, stderr) => {
            if (error) {
                console.log("❌ Deepgram Worker: Audio extraction failed");
                return res.status(500).json({ error: "Audio extraction failed" });
            }

            try {
                console.log("🎤 Deepgram Worker: Sending audio to Deepgram API...");
                
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
                    console.log("❌ Deepgram Worker: API error");
                    return res.status(500).json({ error: "Deepgram API error: " + deepgramError.message });
                }

                // Process the transcription results
                const words = result?.results?.channels?.[0]?.alternatives?.[0]?.words || [];
                const fillerWords = result?.results?.channels?.[0]?.alternatives?.[0]?.filler_words || [];
                const allWords = [...words, ...fillerWords].sort((a, b) => a.start - b.start);
                
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
                    console.log("❌ Deepgram Worker: Database update failed");
                    return res.status(500).json({ error: "Failed to update metadata: " + updateError.message });
                }

                console.log("✅ Deepgram Worker: Transcription completed successfully!");
                res.json({ 
                    message: "Transcription completed successfully",
                    transcript, 
                    wordCount: allWords.length,
                    words: allWords 
                });

            } catch (err) {
                console.log("❌ Deepgram Worker: Processing failed");
                return res.status(500).json({ error: "Deepgram processing failed: " + err.message });
            } finally {
                // Clean up temporary files
                await fsp.unlink(audioPath).catch(e => console.log("Warning: Could not delete audio file"));
                await fsp.unlink(videoPath).catch(e => console.log("Warning: Could not delete video file"));
            }
        });
    } catch (err) {
        console.log("❌ Deepgram Worker: Unexpected error");
        res.status(500).json({ error: "Server error: " + err.message });
    }
};

// WORKER 2: Transcribe with ElevenLabs (Alternative transcription service)
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
            console.log("❌ ElevenLabs Worker: Download failed");
            return res.status(500).json({ error: "Failed to download video from Supabase" });
        }

        // Save video temporarily
        await fsp.writeFile(videoPath, Buffer.from(await data.arrayBuffer()));

        // Extract audio using FFmpeg
        const command = `ffmpeg -y -i "${videoPath}" -q:a 0 -map a "${audioPath}"`;
        console.log("⚡ ElevenLabs Worker: Extracting audio...");
        
        exec(command, async (error, _, stderr) => {
            if (error) {
                console.log("❌ ElevenLabs Worker: Audio extraction failed");
                return res.status(500).json({ error: "Audio extraction failed" });
            }
            
            try {
                console.log("🎙️ ElevenLabs Worker: Sending to ElevenLabs API...");
                
                // Read audio and create blob for ElevenLabs
                const buffer = fs.readFileSync(audioPath);
                const audioBlob = new Blob([buffer], { type: "audio/mp3" });

                // Send to ElevenLabs for transcription
                const transcriptionResult = await elevenlabs.speechToText.convert({
                    file: audioBlob,
                    modelId: "scribe_v1",
                    tagAudioEvents: true,
                    languageCode: "eng",
                    diarize: true,
                });

                // Process results with pause detection
                let elevenLabsTranscript = "";
                if (transcriptionResult && transcriptionResult.words) {
                    const words = transcriptionResult.words;
                    let currentTranscriptParts = [];
                    
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
                } else {
                    elevenLabsTranscript = transcriptionResult?.text || "No transcription available";
                }

                console.log("✅ ElevenLabs Worker: Transcription completed!");
                res.json({ 
                    message: "ElevenLabs transcription completed",
                    transcript: elevenLabsTranscript,
                    metadata: {
                        service: "ElevenLabs",
                        model: "scribe_v1",
                        completedAt: new Date().toISOString()
                    }
                });
                
            } catch (err) {
                console.log("❌ ElevenLabs Worker: Processing failed");
                return res.status(500).json({ error: "ElevenLabs processing failed: " + err.message });
            } finally {
                // Clean up temporary files
                await fsp.unlink(audioPath).catch(e => console.log("Warning: Could not delete audio file"));
                await fsp.unlink(videoPath).catch(e => console.log("Warning: Could not delete video file"));
            }
        });
    } catch (err) {
        console.log("❌ ElevenLabs Worker: Unexpected error");
        res.status(500).json({ error: "Server error: " + err.message });
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

        if (error || !data) {
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
        console.log("❌ Transcription Status Worker: Error");
        res.status(500).json({ error: "Failed to get transcription status" });
    }
};

/*
HOW THESE TRANSCRIPTION WORKERS FUNCTION:

DEEPGRAM WORKER:
1. 📥 Gets video name from request
2. ☁️ Downloads video from cloud storage
3. ⚡ Extracts audio using FFmpeg
4. 🎤 Sends audio to Deepgram AI service
5. 📝 Gets back transcript with word timing
6. 🔍 Adds pause detection markers
7. 💾 Saves complete transcript to database
8. 🧹 Cleans up temporary files

ELEVENLABS WORKER:
1. 📥 Gets video name from request  
2. ☁️ Downloads video from cloud storage
3. ⚡ Extracts audio using FFmpeg
4. 🎙️ Sends audio to ElevenLabs AI service
5. 📝 Gets back transcript (simpler format)
6. 🔍 Adds pause detection if word timing available
7. ✅ Returns transcript (doesn't save to DB by default)
8. 🧹 Cleans up temporary files

THESE WORKERS NEED:
- FFmpeg installed on system
- Deepgram API key in environment
- ElevenLabs API key in environment  
- Supabase storage access
- Proper temp file permissions
*/