

import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from 'dotenv';

// 📋 Import all our department routes (like phone directories)
import uploadRoutes from './routes/upload.routes.js';
import framesRoutes from './routes/frames.routes.js';
import transcriptionRoutes from './routes/transcription.routes.js';
import metadataRoutes from './routes/metadata.routes.js';

// Load environment variables (like getting the building's Wi-Fi password)
dotenv.config();

// Get file paths (figure out where we are in the building)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create our building (Express app)
const app = express();
const port = process.env.PORT || 7000;

// 🛡️ SECURITY AND SETUP (Building rules)
app.use(cors({
    origin: ['http://localhost:3000', 'https://voicefrontend-4.onrender.com'], // Allow both development and production origins
    credentials: true,
}));
app.use(express.json());  // Understand JSON messages
app.use(express.urlencoded({ extended: true }));  // Understand form data

// 📁 Make sure we have storage rooms (create folders if they don't exist)
["uploads", "frames"].forEach((folder) => {
    const dir = path.join(__dirname, folder);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
        console.log(`✅ Created ${folder} directory`);
    }
});

// 🖼️ Let people see files in these folders (like a public gallery)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/frames", express.static(path.join(__dirname, "frames")));

// 🚦 TRAFFIC DIRECTIONS (Tell people which department handles what)
app.use('/api', uploadRoutes);        // "Need to upload? Go to upload department"
app.use('/api', framesRoutes);        // "Need frames? Go to frames department"  
app.use('/api', transcriptionRoutes); // "Need transcription? Go to transcription department"
app.use('/api', metadataRoutes);      // "Need data info? Go to metadata department"

// 💓 Health check (like a "We're Open" sign)
app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        message: "Server is running perfectly! 🚀"
    });
});

// 🏢 OPEN THE BUILDING (start the server)
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






///////////////
////////////////
const server =http.createServer(app);
const io  = new Server(server);

io.on('connection',(socket)=>{
    console.log('Connection done',socket.id);
});
/////////////
//////////////