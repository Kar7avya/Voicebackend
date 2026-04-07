import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// 📋 Import all routes
import uploadRoutes from "./routes/upload.routes.js";
import framesRoutes from "./routes/frames.routes.js";
import transcriptionRoutes from "./routes/transcription.routes.js";
import metadataRoutes from "./routes/metadata.routes.js";
import ttsRoutes from "./routes/tts.js";
import speakwellRoutes from "./routes/Speakwell.routes.js";   // ← ADD THIS

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 7000;

// ============================================
// 🛡️ CORS CONFIGURATION - MUST BE FIRST!
// ============================================
const ALLOWED_ORIGINS = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : [];

console.log("\n🛡️ === CORS CONFIGURATION ===");
console.log("📝 Explicitly Allowed Origins:");
ALLOWED_ORIGINS.forEach((origin, i) => console.log(`   ${i + 1}. ${origin}`));
console.log("=========================\n");

const corsOptions = {
  origin: function (origin, callback) {
    console.log(`\n📡 ========== CORS REQUEST ==========`);
    console.log(`📍 Origin: ${origin || 'NO ORIGIN'}`);

    if (!origin) {
      console.log("✅ ALLOWING: No origin header");
      console.log(`=====================================\n`);
      return callback(null, true);
    }

    if (ALLOWED_ORIGINS.includes(origin)) {
      console.log("✅ ALLOWING: In CORS_ORIGIN list");
      console.log(`=====================================\n`);
      return callback(null, true);
    }

    if (origin.includes("voicefrontend") && origin.includes("vercel.app")) {
      console.log("✅ ALLOWING: Vercel voicefrontend deployment");
      console.log(`=====================================\n`);
      return callback(null, true);
    }

    if (
      process.env.ALLOW_LOCALHOST === "true" &&
      (origin.includes("localhost") || origin.includes("127.0.0.1"))
    ) {
      console.log("✅ ALLOWING: Localhost (explicitly enabled)");
      console.log(`=====================================\n`);
      return callback(null, true);
    }

    console.error(`❌ BLOCKING: "${origin}"`);
    console.error(`❌ Not in: ${ALLOWED_ORIGINS.join(', ')}`);
    console.log(`=====================================\n`);
    callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// ============================================
// 🔥 CORS FIRST
// ============================================
app.use(cors(corsOptions));

// Manual CORS backup
app.use((req, res, next) => {
  const origin = req.headers.origin;

  console.log(`🔧 Manual CORS check for: ${req.method} ${req.path}`);
  console.log(`   Origin header: ${origin || 'none'}`);

  if (origin) {
    const isLocalhost = process.env.ALLOW_LOCALHOST === "true" &&
      (origin.includes("localhost") || origin.includes("127.0.0.1"));
    const isAllowed =
      ALLOWED_ORIGINS.includes(origin) ||
      (origin.includes("voicefrontend") && origin.includes("vercel.app")) ||
      isLocalhost;

    if (isAllowed) {
      console.log(`   ✅ Setting CORS headers manually for: ${origin}`);
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range,X-Content-Range');
    } else {
      console.log(`   ❌ Origin not allowed: ${origin}`);
    }
  }

  if (req.method === 'OPTIONS') {
    console.log(`   🔄 Handling OPTIONS preflight request`);
    return res.status(204).end();
  }

  next();
});

// ============================================
// 📦 OTHER MIDDLEWARE
// ============================================
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use((req, res, next) => {
  console.log(`📨 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log(`   Origin: ${req.headers.origin || 'No origin'}`);
  next();
});

// ============================================
// 🔍 ROUTES DEBUG
// ============================================
console.log("\n🔍 === ROUTES DEBUG INFO ===");
console.log("📦 Upload Routes:", typeof uploadRoutes, uploadRoutes ? "✅" : "❌");
console.log("📦 Frames Routes:", typeof framesRoutes, framesRoutes ? "✅" : "❌");
console.log("📦 Transcription Routes:", typeof transcriptionRoutes, transcriptionRoutes ? "✅" : "❌");
console.log("📦 Metadata Routes:", typeof metadataRoutes, metadataRoutes ? "✅" : "❌");
console.log("📦 TTS Routes:", typeof ttsRoutes, ttsRoutes ? "✅" : "❌");
console.log("📦 SpeakWell Routes:", typeof speakwellRoutes, speakwellRoutes ? "✅" : "❌");
console.log("=========================\n");

// 📁 Ensure folders exist
["uploads", "frames"].forEach((folder) => {
  const dir = path.join(__dirname, folder);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created ${folder} directory`);
  }
});

// 🖼️ Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/frames", express.static(path.join(__dirname, "frames")));

// ============================================
// 🚦 ROUTES
// ============================================
app.get("/health", (req, res) => {
  console.log("💚 Health check endpoint hit");
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    message: "Server is running! 🚀",
    cors: "Enabled for all Vercel + explicit origins",
    allowedOrigins: ALLOWED_ORIGINS.length,
  });
});

console.log("🔧 Mounting routes...");

app.use("/api/metadata", metadataRoutes);
console.log("✅ Mounted: /api/metadata");

app.use("/api", uploadRoutes);
console.log("✅ Mounted: /api (upload routes)");

app.use("/api", framesRoutes);
console.log("✅ Mounted: /api (frames routes)");

app.use("/api", transcriptionRoutes);
console.log("✅ Mounted: /api (transcription routes)");

app.use("/api/tts", ttsRoutes);
console.log("✅ Mounted: /api/tts");

app.use("/api/speakwell", speakwellRoutes);         // ← ADD THIS
console.log("✅ Mounted: /api/speakwell");            // ← ADD THIS

// ============================================
// 🚨 404 FALLBACK
// ============================================
app.use((req, res) => {
  console.log(`❌ 404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    error: "Route not found",
    requestedUrl: req.url,
    method: req.method,
    hint: "Check if the route is correct and the server has the route registered",
  });
});

// ============================================
// 🚨 ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
  console.error("🚨 Error Handler Triggered:");
  console.error("   Error:", err.message);
  console.error("   Stack:", err.stack);

  if (err.message.includes('Not allowed by CORS')) {
    return res.status(403).json({
      success: false,
      error: 'CORS Error',
      message: err.message,
      origin: req.headers.origin,
      hint: 'This origin is not in the allowed list',
    });
  }

  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message,
  });
});

// 🏢 Start server
app.listen(port, () => {
  console.log(`
  🏢 ===================================
  🚪 SERVER IS RUNNING!
  🌐 Port: ${port}
  💚 Health: http://localhost:${port}/health
  📋 Metadata: http://localhost:${port}/api/metadata
  🎤 SpeakWell: http://localhost:${port}/api/speakwell
  🛡️  CORS: ${ALLOWED_ORIGINS.length} explicit origins + Vercel deployments${process.env.ALLOW_LOCALHOST === "true" ? " + Localhost" : ""}
  ===================================

  📍 Available Routes:
  ✅ GET    /health
  ✅ GET    /api/metadata
  ✅ GET    /api/metadata/:id
  ✅ GET    /api/metadata/search
  ✅ POST   /api/upload
  ✅ POST   /api/extractFrames
  ✅ POST   /api/transcribeWithDeepgram
  ✅ GET    /api/tts
  ✅ POST   /api/speakwell/sessions
  ✅ GET    /api/speakwell/sessions
  ✅ GET    /api/speakwell/sessions/:id
  ✅ GET    /api/speakwell/stats
  ✅ DELETE /api/speakwell/sessions/:id
  ===================================
  `);

  console.log("Environment check:");
  console.log("SUPABASE_URL:", process.env.REACT_APP_SUPABASE_URL ? "✅ Found" : "❌ Missing");
  console.log("SUPABASE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ Found" : "❌ Missing");
  console.log("DEEPGRAM_API_KEY:", process.env.DEEPGRAM_API_KEY ? "✅ Found" : "❌ Missing");
  console.log("ELEVENLABS_API_KEY:", process.env.ELEVENLABS_API_KEY ? "✅ Found" : "❌ Missing");
});

export default app;