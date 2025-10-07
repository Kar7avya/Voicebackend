// upload.routes.js

import express from "express";
import { uploadVideo } from "../controllers/upload.controller.js";
import { videoUpload } from "../middleware/upload.js";

const router = express.Router();

/**
 * @route POST /api/upload
 * @desc Handles video file upload to the server and subsequent upload to Supabase.
 * * Middleware Breakdown:
 * 1. videoUpload.single("myvideo"): This is the Multer middleware that processes 
 * the incoming multipart/form-data request. It saves the file temporarily to 
 * the 'uploads' folder and populates req.file.
 * - "myvideo" must match the name of the file field in the client-side form/request.
 * 2. uploadVideo: The controller function that handles the business logic 
 * (reading the temp file, uploading to Supabase, saving metadata, and cleanup).
 */
router.post(
  "/upload",
  videoUpload.single("myvideo"), // <-- The essential fix for the 'No filename received' error
  uploadVideo
);

export default router;