// 🚦 routes/frames.routes.js - FRAMES TRAFFIC DIRECTOR  
// "Need to extract frames or analyze them? I know exactly where to send you!"

import express from 'express';
import { extractFrames, analyzeAllFrames } from '../controllers/frames.controller.js';
import { videoUpload } from '../middleware/upload.js';
import Router from 'express';

// 🚦 Create frames traffic director
const router = express.Router();

// 📋 TRAFFIC RULES FOR FRAMES DEPARTMENT:

// 🎬 Extract frames from video
// POST /api/extractFrames
router.post('/extractFrames', videoUpload.none(), extractFrames);
//                            ^^^ Security guard (but no files uploaded, just form data)

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