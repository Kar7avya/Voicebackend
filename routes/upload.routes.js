import express from "express";
import { uploadVideo } from "../controllers/upload.controller.js";
import { videoUpload } from "../middleware/upload.js";

const router = express.Router();

router.post(
  "/upload",
  videoUpload.single("myvideo"),
  uploadVideo
);

export default router;
