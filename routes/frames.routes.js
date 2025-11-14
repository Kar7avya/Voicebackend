// 🚦 routes/frames.routes.js - FRAMES TRAFFIC DIRECTOR  
// "Need to extract frames or analyze them? I know exactly where to send you!"

import express from 'express';
import { extractFrames, analyzeAllFrames } from '../controllers/frames.controller.js';
import multer from 'multer';

// 🚦 Create frames traffic director
const router = express.Router();

// Create multer instance for handling form data (no file upload, just form fields)
const upload = multer();

// 📋 TRAFFIC RULES FOR FRAMES DEPARTMENT:

// 🎬 Extract frames from video
// POST /api/extractFrames
// Accepts both JSON (from express.json() global middleware) and FormData (from multer)
router.post('/extractFrames', upload.none(), extractFrames);
//                            ^^^ Handles FormData with { videoName: "..." }
// Note: express.json() global middleware handles JSON, multer handles FormData

// 🔍 Analyze all existing frames  
// GET /api/analyzeAllFrames
router.get('/analyzeAllFrames', analyzeAllFrames);
//         ^^^ No security needed, just analyzing existing frames

// 📊 Future frame routes you might add:
// router.get('/frames/:videoId', getFramesByVideo);        // Get frames for specific video
// router.delete('/frames/:frameId', deleteFrame);         // Delete a specific frame
// router.get('/frames/:frameId/analysis', getFrameAnalysis); // Get analysis for specific frame

// 📤 Export this traffic director
export default router;

/*
THE FRAME WORKFLOW:
1. User uploads video → goes through upload.routes.js
2. User wants to extract frames → POST /api/extractFrames → this router → extractFrames worker
3. User wants to analyze frames → GET /api/analyzeAllFrames → this router → analyzeAllFrames worker
*/