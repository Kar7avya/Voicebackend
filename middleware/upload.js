import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadPath = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
  console.log(`📁 Created uploads directory at: ${uploadPath}`);
}

const videoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      console.log("🔄 Multer: Saving video to uploads folder.");
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      const safeName = `${timestamp}-${file.originalname}`;
      cb(null, safeName);
      console.log(`✅ Multer: Saved file as ${safeName}`);
    },
  }),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("video/")) {
      console.log("✅ Multer: Video file type approved.");
      cb(null, true);
    } else {
      console.log("❌ Multer: Rejected file type:", file.mimetype);
      cb(new Error("Only video files are allowed!"), false);
    }
  },
});

export { videoUpload };
