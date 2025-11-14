// 🚦 routes/transcription.routes.js - TRANSCRIPTION TRAFFIC DIRECTOR
// "Need audio converted to text? I know which service to use!"

import express from 'express';
import { transcribeWithDeepgram, transcribeWithElevenLabs } from '../controllers/transcription.controller.js';
import multer from 'multer';

// 🚦 Create transcription traffic director
const router = express.Router();

// Create multer instance for handling form data (no file upload, just form fields)
const upload = multer();

// 📋 TRAFFIC RULES FOR TRANSCRIPTION DEPARTMENT:

// 📝 Transcribe with Deepgram (high-quality service)
// POST /api/transcribeWithDeepgram
// Accepts both JSON (from express.json() global middleware) and FormData (from multer)
router.post('/transcribeWithDeepgram', upload.none(), transcribeWithDeepgram);
//                                     ^^^ Handles FormData with { videoName: "..." }

// 🎤 Transcribe with ElevenLabs (alternative service)  
// POST /api/transcribeWithElevenLabs
// Accepts both JSON (from express.json() global middleware) and FormData (from multer)
router.post('/transcribeWithElevenLabs', upload.none(), transcribeWithElevenLabs);

// 📊 Future transcription routes you might add:
// router.get('/transcripts/:videoId', getTranscript);           // Get saved transcript
// router.put('/transcripts/:videoId', updateTranscript);       // Edit transcript manually
// router.post('/transcripts/compare', compareTranscripts);     // Compare different service results
// router.get('/transcripts/:videoId/export', exportTranscript); // Export as different formats

// 📤 Export this traffic director
export default router;

/*
THE TRANSCRIPTION WORKFLOW:
1. User uploads video → upload.routes.js → video saved
2. User wants transcription → POST /api/transcribeWithDeepgram → this router → transcription worker
3. Worker downloads video, extracts audio, sends to AI service, saves transcript
4. User gets text back

WHY TWO TRANSCRIPTION SERVICES?
- Deepgram: Better for professional/clear audio
- ElevenLabs: Good backup option or different features
- User can choose which one to use!
*/