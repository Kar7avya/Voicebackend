import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// 📋 Import all our department routes
import uploadRoutes from "./routes/upload.routes.js";
import framesRoutes from "./routes/frames.routes.js";
import transcriptionRoutes from "./routes/transcription.routes.js";
import metadataRoutes from "./routes/metadata.routes.js";

// Load environment variables
dotenv.config();

// Get file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();
const port = process.env.PORT || 7000;

// 🛡️ SECURITY AND SETUP (Building rules)
app.use(cors({
    origin: true, // Allows any origin - TEMPORARY FIX ONLY!
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());  // Understand JSON messages
app.use(express.urlencoded({ extended: true }));  // Understand form data

// 📁 Ensure folders exist
["uploads", "frames"].forEach((folder) => {
  const dir = path.join(__dirname, folder);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
    console.log(`✅ Created ${folder} directory`);
  }
});

// 🖼️ Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/frames", express.static(path.join(__dirname, "frames")));

// 🚦 TRAFFIC DIRECTIONS (Tell people which department handles what)
app.use('/api', uploadRoutes);        // "Need to upload? Go to upload department"
app.use('/api', framesRoutes);        // "Need frames? Go to frames department"  
app.use('/api', transcriptionRoutes); // "Need transcription? Go to transcription department"
app.use('/api', metadataRoutes);      // "Need data info? Go to metadata department"

// 💓 Health check
app.get("/health", (req, res) => {
  console.log("💚 Health check endpoint hit");
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    message: "Server is running perfectly! 🚀",
  });
});

// 🏢 Start server
app.listen(port, () => {
  console.log(`
    🏢 ===================================
    🚪 SERVER IS OPEN FOR BUSINESS! 
    🌐 Visit: http://localhost:${port}
    💚 Health Check: http://localhost:${port}/health
    ===================================
  `);
});

export default app;