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

const allowedOrigins = [
  "http://localhost:3000",                // local dev
  "https://voicefrontend-4.onrender.com"  // deployed frontend
];

// 🔍 Log every incoming request (method + url)
app.use((req, res, next) => {
  console.log(`➡️ Incoming request: [${req.method}] ${req.originalUrl}`);
  next();
});

// 🛡️ SECURITY AND SETUP (CORS FIXED + DEBUG LOGS)
app.use(
  cors({
    origin: function (origin, callback) {
      console.log("🌍 Incoming request Origin:", origin);

      if (!origin || allowedOrigins.includes(origin)) {
        console.log("✅ Allowed Origin:", origin || "No origin (Postman/curl)");
        callback(null, true);
      } else {
        console.error("❌ Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// 📝 Log preflight (OPTIONS) requests explicitly
app.options("*", (req, res) => {
  console.log(`🟡 Preflight request received for ${req.originalUrl}`);
  res.sendStatus(200);
});

app.use(express.json()); // Parse JSON
app.use(express.urlencoded({ extended: true })); // Parse form data

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

// 🚦 API Routes with logging
app.use("/api", (req, res, next) => {
  console.log(`📡 API route accessed: ${req.method} ${req.originalUrl}`);
  next();
});
app.use("/api", uploadRoutes);
app.use("/api", framesRoutes);
app.use("/api", transcriptionRoutes);
app.use("/api", metadataRoutes);

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
