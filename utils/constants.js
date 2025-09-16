// 🧰 utils/constants.js - THE COMPANY TOOL SHED
// "Need a common tool or setting? It's probably here!"

// ⏰ TIME-RELATED CONSTANTS
// Think of these as stopwatches and timers everyone uses
export const PAUSE_THRESHOLD = 0.5;        // If audio is quiet for 0.5 seconds = pause
export const MAX_PROCESSING_TIME = 300000; // Don't let any job run longer than 5 minutes
export const RETRY_DELAY = 1000;           // If something fails, wait 1 second before trying again

// 📏 FILE SIZE LIMITS  
// Think of these as weight limits for your filing cabinets
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024;  // 100MB = don't accept huge videos
export const MAX_AUDIO_SIZE = 50 * 1024 * 1024;   // 50MB = reasonable audio file limit  
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;   // 10MB = big enough for high-quality photos

// 📼 SUPPORTED FILE TYPES
// Think of these as "approved supplier lists" - only these file types are allowed in

export const SUPPORTED_VIDEO_TYPES = [
    'video/mp4',    // Most common video format
    'video/avi',    // Old but still used
    'video/mov',    // Apple's format
    'video/wmv',    // Windows format
    'video/flv',    // Flash video (older web videos)
    'video/webm'    // Modern web video format
];

export const SUPPORTED_AUDIO_TYPES = [
    'audio/mp3',    // Most popular audio format
    'audio/wav',    // High quality, uncompressed
    'audio/m4a',    // Apple's audio format  
    'audio/ogg'     // Open source format
];

export const SUPPORTED_IMAGE_TYPES = [
    'image/jpeg',   // Most common photo format
    'image/jpg',    // Same as jpeg, different extension
    'image/png',    // Good for graphics with transparency
    'image/webp'    // Modern, smaller file sizes
];

// 🎬 VIDEO PROCESSING SETTINGS
// Think of these as your video editing presets
export const FRAMES_PER_SECOND = 1/5;           // Take 1 picture every 5 seconds of video
export const DEFAULT_VIDEO_QUALITY = 'high';    // Always aim for high quality
export const COMPRESSION_LEVEL = 0.8;           // Compress to 80% (balance of size vs quality)

// 🗃️ DATABASE TABLE NAMES
// Think of these as labels on your filing cabinets
export const TABLES = {
    METADATA: 'metadata',      // Cabinet for "file information cards"
    USERS: 'users',           // Cabinet for "user accounts" 
    FRAMES: 'frames',         // Cabinet for "extracted video pictures"
    TRANSCRIPTS: 'transcripts' // Cabinet for "audio-to-text conversions"
};

// ☁️ STORAGE BUCKET NAMES
// Think of these as different warehouses in the cloud
export const STORAGE_BUCKETS = {
    VIDEOS: 'videos',         // Warehouse for video files
    FRAMES: 'frames',         // Warehouse for extracted pictures
    AUDIO: 'audio',           // Warehouse for audio files  
    THUMBNAILS: 'thumbnails'  // Warehouse for small preview images
};

// 🤖 AI SERVICE SETTINGS
// Think of these as the "expert consultants" you hire for different jobs
export const AI_MODELS = {
    DEEPGRAM: 'nova-3',              // Best transcription expert  
    ELEVENLABS: 'scribe_v1',         // Alternative transcription expert
    HUGGINGFACE: 'google/gemma-7b-it' // Image analysis expert
};

// 📝 DEFAULT TRANSCRIPTION OPTIONS
// Think of these as "standard instructions" you give to transcription experts

// Instructions for Deepgram expert:
export const DEEPGRAM_CONFIG = {
    model: AI_MODELS.DEEPGRAM,    // Use the nova-3 expert
    smart_format: true,           // Make the text look nice (capitals, periods)
    disfluencies: true,           // Include "um", "uh", "like" 
    punctuate: true,              // Add commas, periods, question marks
    filler_words: true,           // Don't skip "um", "ah", etc.
    word_details: true,           // Tell me exactly when each word was spoken
};

// Instructions for ElevenLabs expert:
export const ELEVENLABS_CONFIG = {
    modelId: AI_MODELS.ELEVENLABS, // Use the scribe_v1 expert
    tagAudioEvents: true,          // Mark things like [LAUGHTER], [MUSIC]
    languageCode: "eng",           // We're speaking English
    diarize: true,                 // Tell me who is speaking (Speaker 1, Speaker 2)
};

// 🚨 ERROR MESSAGES
// Think of these as pre-written "rejection letters" with standard reasons
export const ERROR_MESSAGES = {
    NO_FILE: "No file uploaded",
    INVALID_USER: "user_id is required", 
    INVALID_FORMAT: "Invalid user_id format",
    FILE_TOO_LARGE: "File size exceeds limit",
    UNSUPPORTED_TYPE: "File type not supported",
    UPLOAD_FAILED: "Upload failed, please try again",
    PROCESSING_TIMEOUT: "Processing took too long and was cancelled",
    TRANSCRIPTION_FAILED: "Could not convert audio to text",
    FRAME_EXTRACTION_FAILED: "Could not extract frames from video",
    DATABASE_ERROR: "Database operation failed",
    STORAGE_ERROR: "Cloud storage operation failed",
    INVALID_VIDEO_NAME: "Video name is required",
    USER_NOT_FOUND: "User does not exist",
    VIDEO_NOT_FOUND: "Video does not exist"
};

// 🎨 SUCCESS MESSAGES  
// Think of these as pre-written "congratulations cards"
export const SUCCESS_MESSAGES = {
    UPLOAD_COMPLETE: "File uploaded successfully!",
    FRAMES_EXTRACTED: "Video frames extracted successfully!",
    TRANSCRIPTION_COMPLETE: "Audio transcribed successfully!",
    ANALYSIS_COMPLETE: "Frame analysis completed!",
    PROCESSING_COMPLETE: "All processing completed successfully!"
};

// 🔧 UTILITY FUNCTIONS
// Think of these as common tools everyone needs

// Convert bytes to human-readable format
export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Check if file type is supported
export const isVideoTypeSupported = (mimeType) => {
    return SUPPORTED_VIDEO_TYPES.includes(mimeType);
};

export const isAudioTypeSupported = (mimeType) => {
    return SUPPORTED_AUDIO_TYPES.includes(mimeType);
};

export const isImageTypeSupported = (mimeType) => {
    return SUPPORTED_IMAGE_TYPES.includes(mimeType);
};

// Validate file size
export const isFileSizeValid = (fileSize, fileType) => {
    if (fileType.startsWith('video/')) {
        return fileSize <= MAX_VIDEO_SIZE;
    } else if (fileType.startsWith('audio/')) {
        return fileSize <= MAX_AUDIO_SIZE;
    } else if (fileType.startsWith('image/')) {
        return fileSize <= MAX_IMAGE_SIZE;
    }
    return false;
};

/*
HOW OTHER FILES USE THIS TOOL SHED:

// In upload.controller.js:
import { MAX_VIDEO_SIZE, ERROR_MESSAGES, isVideoTypeSupported } from '../utils/constants.js';

if (!isVideoTypeSupported(file.mimetype)) {
    return res.status(400).send(ERROR_MESSAGES.UNSUPPORTED_TYPE);
}

// In transcription.controller.js:  
import { DEEPGRAM_CONFIG, PAUSE_THRESHOLD } from '../utils/constants.js';

const { result } = await deepgram.listen.prerecorded.transcribeFile(audioBuffer, DEEPGRAM_CONFIG);

// In middleware/upload.js:
import { MAX_VIDEO_SIZE } from '../utils/constants.js';

const videoUpload = multer({
    limits: { fileSize: MAX_VIDEO_SIZE }
});

WHY USE CONSTANTS?
✅ Change once, update everywhere - change PAUSE_THRESHOLD in one place, all files get updated
✅ No typos - instead of typing "metadata" 100 times, use TABLES.METADATA  
✅ Easy to understand - MAX_VIDEO_SIZE is clearer than "104857600"
✅ Easy to maintain - all settings in one place
✅ Consistency - everyone uses the same error messages
*/