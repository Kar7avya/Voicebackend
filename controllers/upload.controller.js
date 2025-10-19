// ============================================
// UPLOAD.CONTROLLER.JS - FINAL FIX FOR RLS INSERT VIOLATION (42501)
// ============================================

import { promises as fsp } from "fs";
import path from "path";
import { supabase } from "../config/database.js"; // This is the Anon Key client
import jwt from 'jsonwebtoken'; 

// CRITICAL: Must be set in Render environment
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
if (!JWT_SECRET) {
    console.error("CRITICAL: SUPABASE_JWT_SECRET is missing! RLS WILL FAIL.");
    process.exit(1); 
}

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
        console.error("❌ JWT Verification Failed:", err.message);
        return null;
    }
};

export const uploadVideo = async (req, res) => {
  let uploadedFilePath = null;
  let userToken = null; // Store the token here

  try {
    console.log("📥 Upload request received");
    
    // 1. AUTH & TOKEN EXTRACTION
    const authHeader = req.headers.authorization;
    if (authHeader) userToken = authHeader.split(' ')[1]; // Extract token for DB client
    
    const userId = extractUserIdFromToken(req); 
    
    if (!userId || !userToken) {
        return res.status(401).json({
            success: false,
            error: "Authentication failed. Invalid or missing token."
        });
    }

    // Validate UUID (omitted for brevity, assume valid logic)
    
    console.log("👤 User ID (Verified by JWT):", userId);
    
    const file = req.file;
    if (!file) { /* ... handle no file error ... */ }

    // --- File Handling and Storage Logic (omitted for brevity) ---
    uploadedFilePath = file.path;
    const fileBuffer = await fsp.readFile(file.path);
    // ... (calculate renamedFilename and storagePath) ...
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = path.extname(file.originalname);
    const sanitizedName = path.basename(file.originalname, fileExtension).replace(/[^a-zA-Z0-9-._]/g, '_');
    const renamedFilename = `${timestamp}-${randomId}-${sanitizedName}${fileExtension}`;
    const storagePath = `videos/${renamedFilename}`;
    
    // Upload to Supabase Storage (Uses Anon Client, RLS assumes public upload or Service Role)
    const { error: uploadError } = await supabase.storage
        .from("projectai")
        .upload(storagePath, fileBuffer, {
            contentType: file.mimetype,
            upsert: false
        });

    if (uploadError) { /* ... handle storage error ... */ }

    const { data: publicUrlData } = supabase.storage
        .from("projectai")
        .getPublicUrl(storagePath);
    const publicUrl = publicUrlData?.publicUrl || null;

    // 2. 🔑 CREATE AUTHENTICATED CLIENT FOR DB INSERT
    // We use the token to tell Supabase this query is being run by a specific user.
    const authenticatedSupabase = supabase.auth.setAuth(userToken);
    
    // Insert metadata into database
    console.log("💾 Saving metadata to database with authenticated client...");
    const insertPayload = {
      user_id: userId, // CRITICAL: This must match auth.uid() in the RLS policy
      
      // --- Minimal Data Fields for Insertion (The rest should be set to null/defaults) ---
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

      // --- Setting all other schema columns to NULL or defaults to prevent 500 error ---
      description: null, tags: null, frames: '[]', deepgram_words: '{}', custom_metadata: '{}',
      elevenlabs_transcript: null, deepgram_transcript: null, llm_analysis: null, gemini_analysis: null,
      frame_analysis: null, gemini_frame_analysis: null, processing_status: 'uploaded', error_message: null,
      transcription_completed_at: null, frame_extraction_completed_at: null, analysis_completed_at: null,
      uploaded_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    };

    const { data: insertData, error: insertError } = await authenticatedSupabase
      .from("metadata")
      .insert([insertPayload]) 
      .select();

    // 3. ⚠️ IMPORTANT: Clear the authentication from the client instance (optional but safe)
    // If you are using a transient client, you don't need this, but for a global client, it's safer.
    // authenticatedSupabase.auth.setAuth(null); 

    if (insertError) {
      console.error("❌ Database insert failed:", insertError);
      await fsp.unlink(uploadedFilePath); 
      
      return res.status(500).json({
        success: false,
        error: "Failed to save metadata to database",
        details: insertError.message,
        hint: insertError.hint,
        code: insertError.code
      });
    }

    // ... (rest of cleanup and success response) ...
    await fsp.unlink(uploadedFilePath);
    return res.status(200).json({
      success: true,
      message: "Video uploaded successfully!",
      metadata: { id: insertData[0]?.id, originalName: file.originalname },
      publicUrl: publicUrl,
      videoName: renamedFilename
    });

  } catch (err) {
    // ... (rest of error handling)
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