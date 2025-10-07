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
// 🛡️ FIXED CORS CONFIGURATION
// ============================================

const corsOptions = {
    origin: function (origin, callback) {
        console.log(`📡 CORS Request from: ${origin}`); 

        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) {
            console.log("✅ No origin - allowing");
            return callback(null, true);
        }

        // Allow all Vercel preview deployments automatically
        if (
            origin.includes('voicefrontend-b3te') && 
            origin.includes('vercel.app')
        ) {
            console.log("✅ Vercel deployment - allowing");
            return callback(null, true);
        }

        // Allow localhost for development
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            console.log("✅ Localhost - allowing");
            return callback(null, true);
        }

        // Check against explicit allowed origins from env
        const ALLOWED_ORIGINS = process.env.CORS_ORIGIN 
            ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
            : [];

        if (ALLOWED_ORIGINS.includes(origin)) {
            console.log("✅ Explicitly allowed origin");
            return callback(null, true);
        }

        console.error(`❌ Origin BLOCKED: ${origin}`);
        callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 600 // Cache preflight for 10 minutes
};

// Apply CORS BEFORE other middleware
app.use(cors(corsOptions));

// Handle preflight requests explicitly
// 🚀 FIX APPLIED HERE: Changed '*' to '/*' to resolve PathError.
app.options('/*', cors(corsOptions));

// ============================================
// 📦 OTHER MIDDLEWARE
// ============================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
// 🚦 ROUTES
// ============================================
app.use('/api', uploadRoutes);        
app.use('/api', framesRoutes);        
app.use('/api', transcriptionRoutes); 
app.use('/api', metadataRoutes);      

// 💓 Health check
app.get("/health", (req, res) => {
    console.log("💚 Health check endpoint hit");
    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        message: "Server is running perfectly! 🚀",
        cors: "All Vercel deployments allowed"
    });
});

// 🏢 Start server
app.listen(port, () => {
    console.log(`
    🏢 ===================================
    🚪 SERVER IS OPEN FOR BUSINESS! 
    🌐 Visit: http://localhost:${port}
    💚 Health Check: http://localhost:${port}/health
    🛡️  CORS: Vercel + Localhost allowed
    ===================================
    `);
});

export default app;