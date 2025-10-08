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

// ============================================
// 🔍 DEBUG: Check if routes are imported correctly
// ============================================
console.log("\n🔍 === ROUTES DEBUG INFO ===");
console.log("📦 Upload Routes:", typeof uploadRoutes, uploadRoutes ? "✅ Loaded" : "❌ Failed");
console.log("📦 Frames Routes:", typeof framesRoutes, framesRoutes ? "✅ Loaded" : "❌ Failed");
console.log("📦 Transcription Routes:", typeof transcriptionRoutes, transcriptionRoutes ? "✅ Loaded" : "❌ Failed");
console.log("📦 Metadata Routes:", typeof metadataRoutes, metadataRoutes ? "✅ Loaded" : "❌ Failed");
console.log("=========================\n");

// ============================================
// 🛡️ CORS CONFIGURATION
// ============================================

const corsOptions = {
  origin: function (origin, callback) {
    console.log(`📡 CORS Request from: ${origin || 'NO ORIGIN'}`);

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      console.log("✅ No origin - allowing");
      return callback(null, true);
    }

    // Allow all Vercel preview deployments automatically
    if (origin.includes("voicefrontend-b3te") && origin.includes("vercel.app")) {
      console.log("✅ Vercel deployment - allowing");
      return callback(null, true);
    }

    // Allow localhost for development
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
      console.log("✅ Localhost - allowing");
      return callback(null, true);
    }

    // Check against explicit allowed origins from env
    const ALLOWED_ORIGINS = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
      : [];

    if (ALLOWED_ORIGINS.includes(origin)) {
      console.log("✅ Explicitly allowed origin");
      return callback(null, true);
    }

    console.error(`❌ Origin BLOCKED: ${origin}`);
    callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  maxAge: 600, // Cache preflight for 10 minutes
};

// Apply CORS BEFORE other middleware
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// ============================================
// 📦 OTHER MIDDLEWARE
// ============================================
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📨 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// 📁 Ensure folders exist
["uploads", "frames"].forEach((folder) => {
  const dir = path.join(__dirname, folder);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created ${folder} directory`);
  }
});

// 🖼️ Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/frames", express.static(path.join(__dirname, "frames")));

// ============================================
// 🚦 ROUTES - CRITICAL: ORDER MATTERS!
// ============================================

// Health check (no /api prefix)
app.get("/health", (req, res) => {
  console.log("💚 Health check endpoint hit");
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    message: "Server is running perfectly! 🚀",
    cors: "All Vercel deployments allowed",
  });
});

// ============================================
// 🔍 DEBUG METADATA ROUTES BEFORE MOUNTING
// ============================================
console.log("\n🔍 === METADATA ROUTES MOUNTING ===");
console.log("🔍 Metadata Routes Type:", typeof metadataRoutes);
console.log("🔍 Is Function?", typeof metadataRoutes === 'function');
console.log("🔍 Has stack?", metadataRoutes?.stack ? `Yes (${metadataRoutes.stack.length} routes)` : "No");

if (metadataRoutes && typeof metadataRoutes === 'function') {
  console.log("✅ Metadata routes is a valid Express router");
  
  // List all routes if available
  if (metadataRoutes.stack) {
    console.log("📋 Registered routes in metadata router:");
    metadataRoutes.stack.forEach((layer, index) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
        console.log(`   ${index + 1}. ${methods} ${layer.route.path}`);
      }
    });
  }
} else {
  console.error("❌ Metadata routes is NOT a valid router!");
  console.error("❌ Actual value:", metadataRoutes);
}
console.log("================================\n");

// Mount metadata routes
app.use("/api/metadata", metadataRoutes);
console.log("✅ Mounted: /api/metadata");

// Other routes with /api prefix
app.use("/api", uploadRoutes);
console.log("✅ Mounted: /api (upload routes)");

app.use("/api", framesRoutes);
console.log("✅ Mounted: /api (frames routes)");

app.use("/api", transcriptionRoutes);
console.log("✅ Mounted: /api (transcription routes)");

// ============================================
// 🚨 404 FALLBACK - MUST BE LAST!
// ============================================
app.use((req, res) => {
  console.log(`❌ 404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ 
    success: false,
    error: "Route not found",
    requestedUrl: req.url,
    method: req.method,
    availableRoutes: {
      health: "GET /health",
      metadata: "GET /api/metadata",
      metadataById: "GET /api/metadata/:id",
      search: "GET /api/metadata/search",
      upload: "POST /api/upload",
      frames: "POST /api/extractFrames",
      transcription: "POST /api/transcribeWithDeepgram"
    }
  });
});

// 🏢 Start server
app.listen(port, () => {
  console.log(`
  🏢 ===================================
  🚪 SERVER IS OPEN FOR BUSINESS! 
  🌐 Port: ${port}
  💚 Health: http://localhost:${port}/health
  📋 Metadata: http://localhost:${port}/api/metadata
  🛡️  CORS: Vercel + Localhost allowed
  ===================================
  
  📍 Available Routes:
  ✅ GET  /health
  ✅ GET  /api/metadata
  ✅ GET  /api/metadata/:id
  ✅ GET  /api/metadata/search
  ✅ GET  /api/metadata/user/:userId
  ✅ POST /api/upload
  ✅ POST /api/extractFrames
  ✅ POST /api/transcribeWithDeepgram
  ===================================
  `);
});

export default app;