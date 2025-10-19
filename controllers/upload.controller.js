// ============================================
// UPLOAD.CONTROLLER.JS - FINAL FIXED VERSION
// Fixes the permission denied error by creating a fresh, authenticated client.
// ============================================

import { promises as fsp } from "fs";
import path from "path";
// Assuming supabase client is initialized in database.js for storage only
import { supabase } from "../config/database.js"; 
import jwt from 'jsonwebtoken'; 
import { createClient } from '@supabase/supabase-js'; // 👈 CRITICAL: Import createClient

// --- Environment Variables (MUST be accessible in your backend) ---
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
// Assuming these are available in your backend environment
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY; 

if (!JWT_SECRET || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("CRITICAL: Missing Supabase environment variables! Cannot proceed.");
    process.exit(1); 
}
// -------------------------------------------------------------------

/**
 * Extracts the Supabase User ID (UUID) by verifying the JWT (Bearer Token)
 */
const extractUserIdFromToken = (req) => {
// ... (Your extraction logic remains the same)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded.sub; 
    } catch (err) {
        console.warn("❌ JWT Verification Failed:", err.message);
        return null;
    }
};

export const uploadVideo = async (req, res) => {
  let uploadedFilePath = null;
  let userToken = null; 

  try {
    console.log("📥 Upload request received");
    
    const authHeader = req.headers.authorization;
    if (authHeader) userToken = authHeader.split(' ')[1]; 
    
    const userId = extractUserIdFromToken(req); 
    
    if (!userId || !userToken) {
        return res.status(401).json({
            success: false,
            error: "Authentication failed. Invalid or missing token."
        });
    }
    
    console.log("👤 User ID (Verified by JWT):", userId);
    
    const file = req.file;
    if (!file) { return res.status(400).json({ success: false, error: "No file uploaded." }); }

    // --- File Handling and Storage Logic ---
    uploadedFilePath = file.path;
    const fileBuffer = await fsp.readFile(file.path);
    // (calculate renamedFilename and storagePath)
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = path.extname(file.originalname);
    const sanitizedName = path.basename(file.originalname, fileExtension).replace(/[^a-zA-Z0-9-._]/g, '_');
    const renamedFilename = `${timestamp}-${randomId}-${sanitizedName}${fileExtension}`;
    const storagePath = `videos/${renamedFilename}`;
    
    // Upload to Supabase Storage (Uses Anon Client, which is fine for storage policies)
    const { error: uploadError } = await supabase.storage
        .from("projectai")
        .upload(storagePath, fileBuffer, {
            contentType: file.mimetype,
            upsert: false
        });

    if (uploadError) { 
        console.error("❌ Storage upload failed:", uploadError);
        return res.status(500).json({ success: false, error: "Upload to Supabase Storage failed", details: uploadError.message });
    }

    const { data: publicUrlData } = supabase.storage
        .from("projectai")
        .getPublicUrl(storagePath);
    const publicUrl = publicUrlData?.publicUrl || null;

    // 🛑 CRITICAL FIX: Replace the unreliable global auth call 🛑
    // Create a NEW, dedicated client for the insert operation.
    const authenticatedDbClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${userToken}`, // Inject the user's token directly
            },
        },
    });
    
    // Insert metadata into database
    console.log("💾 Saving metadata to database with fresh authenticated client...");
    const insertPayload = {
      user_id: userId, 
      
      // --- File Metadata ---
      video_name: renamedFilename,
      file_name: file.originalname,
      original_name: file.originalname, 
      title: file.originalname, 
      video_url: publicUrl,
      public_url: publicUrl, 
      file_size: fileBuffer.length,
      file_type: file.mimetype, 
      mime_type: file.mimetype,
      bucket_path: storagePath,

      // --- Setting all other schema columns to NULL or defaults ---
      description: null, tags: null, frames: '[]', deepgram_words: '{}', custom_metadata: '{}',
      elevenlabs_transcript: null, deepgram_transcript: null, llm_analysis: null, gemini_analysis: null,
      frame_analysis: null, gemini_frame_analysis: null, processing_status: 'uploaded', error_message: null,
      transcription_completed_at: null, frame_extraction_completed_at: null, analysis_completed_at: null,
      uploaded_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    };

    // Use the FRESH, authenticated client for the RLS-protected insert
    const { data: insertData, error: insertError } = await authenticatedDbClient
      .from("metadata")
      .insert([insertPayload]) 
      .select();

    if (insertError) {
      console.error("❌ Database insert failed:", insertError);
      await fsp.unlink(uploadedFilePath); 
      
      return res.status(500).json({
        success: false,
        error: "Failed to save metadata to database",
        details: insertError.message, // Provide full details for debugging
        hint: insertError.hint,
        code: insertError.code
      });
    }

    // Clean up temp file
    await fsp.unlink(uploadedFilePath);
    return res.status(200).json({
      success: true,
      message: "Video uploaded successfully!",
      metadata: { id: insertData[0]?.id, originalName: file.originalname },
      publicUrl: publicUrl,
      videoName: renamedFilename
    });

  } catch (err) {
    if (uploadedFilePath) {
      try { await fsp.unlink(uploadedFilePath); } catch (e) { console.warn("Could not cleanup temp file:", e); }
    }
    console.error("💥 Server error during upload:", err);
    return res.status(500).json({
      success: false,
      error: "Server error during upload",
      details: err.message
    });
  }
};