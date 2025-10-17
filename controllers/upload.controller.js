// ============================================
// UPLOAD.CONTROLLER.JS - FINAL SCHEMA FIX
// Fixes: Removed 'original_name' column name mismatch.
// ============================================

import { promises as fsp } from "fs";
import path from "path";
// Assumes supabase client is initialized with SUPABASE_ANON_KEY
import { supabase } from "../config/database.js"; 
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
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded.sub; // 'sub' field holds the user ID (UUID)
    } catch (err) {
        console.error("❌ JWT Verification Failed:", err.message);
        return null;
    }
};

export const uploadVideo = async (req, res) => {
  let uploadedFilePath = null;

  try {
    console.log("📥 Upload request received");
    
    // 🚨 SECURITY FIX: Extract user ID from the JWT token
    const userId = extractUserIdFromToken(req); 
    
    if (!userId) {
        return res.status(401).json({
            success: false,
            error: "Authentication failed. Invalid or missing token."
        });
    }

    // Validate the extracted user ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid user ID derived from token. Must be a valid UUID.',
            received: userId
        });
    }

    console.log("👤 User ID (Verified by JWT):", userId);
    
    const file = req.file;
    if (!file) {
        return res.status(400).json({
            success: false,
            error: "No file uploaded. Field name must be 'myvideo'."
        });
    }

    // --- File Handling and Storage Logic ---
    uploadedFilePath = file.path;
    const fileBuffer = await fsp.readFile(file.path);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = path.extname(file.originalname);
    // Use the renamed filename for storage (contains timestamp/ID)
    const renamedFilename = `${timestamp}-${randomId}-${path.basename(file.originalname, fileExtension).replace(/[^a-zA-Z0-9-._]/g, '_')}${fileExtension}`;
    
    // Upload to Supabase Storage logic...
    const { error: uploadError } = await supabase.storage
        .from("projectai")
        .upload(`videos/${renamedFilename}`, fileBuffer, {
            contentType: file.mimetype,
            upsert: false
        });

    if (uploadError) {
        console.error("❌ Storage upload failed:", uploadError);
        return res.status(500).json({
            success: false,
            error: "Upload to Supabase Storage failed",
            details: uploadError.message
        });
    }

    const { data: publicUrlData } = supabase.storage
        .from("projectai")
        .getPublicUrl(`videos/${renamedFilename}`);
    const publicUrl = publicUrlData?.publicUrl || null;

    // Insert metadata into database
    console.log("💾 Saving metadata to database...");
    const insertPayload = {
      user_id: userId, // Securely verified UUID
      
      // ✅ FIX: Using the single, clean filename for video_name/title 
      // instead of the problematic 'original_name'
      video_name: renamedFilename,
      
      // RETAIN THE ORIGINAL DISPLAY NAME IN A SAFE COLUMN (e.g., file_name or description)
      // Since your SQL schema included a 'file_name' and 'video_name' column:
      file_name: file.originalname, // Using file_name for the original display name
      
      video_url: publicUrl,
      file_size: fileBuffer.length,
      file_type: file.mimetype, 
      created_at: new Date().toISOString()
    };

    const { data: insertData, error: insertError } = await supabase
      .from("metadata")
      .insert([insertPayload]) 
      .select();

    if (insertError) {
      console.error("❌ Database insert failed:", insertError);
      await fsp.unlink(uploadedFilePath); // Clean up temp file on database failure
      
      return res.status(500).json({
        success: false,
        error: "Failed to save metadata to database",
        details: insertError.message,
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
