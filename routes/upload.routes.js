// // 🚦 routes/upload.routes.js - UPLOAD TRAFFIC DIRECTOR
// // Think of this as a traffic cop who says "Need to upload? Go to the upload worker!"

// import express from 'express';
// import { uploadVideo } from '../controllers/upload.controller.js';  // The actual worker
// import { videoUpload } from '../middleware/upload.js';              // The security guard

// // 🚦 Create a mini traffic director (router)
// const router = express.Router();

// // 📋 TRAFFIC RULES:
// // When someone comes to POST /api/upload:
// // 1. First, send them through security (videoUpload.single("myvideo"))
// // 2. Then, send them to the upload worker (uploadVideo)
// router.post('/upload', videoUpload.single("myvideo"), uploadVideo);

// // 📊 You can add more upload-related routes here later:
// // router.get('/upload/status/:id', getUploadStatus);
// // router.delete('/upload/:id', deleteUpload);

// // 📤 Export this traffic director so index.js can use it
// export default router;

// /*
// THE FLOW:
// 1. User sends POST request to /api/upload
// 2. index.js sees "/api" and sends to this router
// 3. This router sees "/upload" and activates this route
// 4. Security guard (videoUpload) checks the file
// 5. If safe, worker (uploadVideo) processes it
// 6. Response goes back to user
// */
















// 🚦 routes/upload.routes.js - UPLOAD TRAFFIC DIRECTOR
// Think of this as a traffic cop who says "Need to upload? Go to the upload worker!"

import express from 'express';
import { uploadVideo } from '../controllers/upload.controller.js';  // The actual worker
import { videoUpload } from '../middleware/upload.js';              // The security guard

// 🚦 Create a mini traffic director (router)
const router = express.Router();

// 📋 TRAFFIC RULES:
// When someone comes to POST /api/upload:
// 1. First, send them through security (videoUpload.single("myvideo"))
// 2. Then, send them to the upload worker (uploadVideo)
router.post('/upload', videoUpload.single("myvideo"), (req, res, next) => {
    console.log("➡️ Router: Sending the video to the controller to be uploaded.");
    uploadVideo(req, res, next);
});

// 📊 You can add more upload-related routes here later:
// router.get('/upload/status/:id', getUploadStatus);
// router.delete('/upload/:id', deleteUpload);

// 📤 Export this traffic director so index.js can use it
export default router;

/*
THE FLOW:
1. User sends POST request to /api/upload
2. index.js sees "/api" and sends to this router
3. This router sees "/upload" and activates this route
4. Security guard (videoUpload) checks the file
5. If safe, worker (uploadVideo) processes it
6. Response goes back to user
*/