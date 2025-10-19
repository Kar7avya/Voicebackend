// ============================================
// UPLOAD.CONTROLLER.JS - MINIMAL VERSION
// ============================================

import { promises as fsp } from "fs";
import path from "path";
import { supabase } from "../config/database.js"; 
import jwt from 'jsonwebtoken'; 
import { createClient } from '@supabase/supabase-js';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY; 

if (!JWT_SECRET || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("CRITICAL: Missing Supabase environment variables!");
    process.exit(1); 
}

const extractUserIdFromToken = (req) => {
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
    
    console.log("👤 User ID:", userId);
    
    const file = req.file;
    if (!file) { 
        return res.status(400).json({ 
            success: false, 
            error: "No file uploaded." 
        }); 
    }

    uploadedFilePath = file.path;
    const fileBuffer = await fsp.readFile(file.path);
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = path.extname(file.originalname);
    const sanitizedName = path.basename(file.originalname, fileExtension).replace(/[^a-zA-Z0-9-._]/g, '_');
    const renamedFilename = `${timestamp}-${randomId}-${sanitizedName}${fileExtension}`;
    const storagePath = `videos/${renamedFilename}`;
    
    console.log("📤 Uploading to Supabase Storage...");
    const { error: uploadError } = await supabase.storage
        .from("projectai")
        .upload(storagePath, fileBuffer, {
            contentType: file.mimetype,
            upsert: false
        });

    if (uploadError) { 
        console.error("❌ Storage upload failed:", uploadError);
        if (uploadedFilePath) {
            try { await fsp.unlink(uploadedFilePath); } catch (e) {}
        }
        return res.status(500).json({ 
            success: false, 
            error: "Upload to Supabase Storage failed", 
            details: uploadError.message 
        });
    }

    const { data: publicUrlData } = supabase.storage
        .from("projectai")
        .getPublicUrl(storagePath);
    const publicUrl = publicUrlData?.publicUrl || null;

    console.log("🔐 Creating authenticated client...");
    const authenticatedDbClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${userToken}`,
            },
        },
    });
    
    console.log("💾 Saving metadata to database...");
    
    // MINIMAL PAYLOAD - Only core fields
    const insertPayload = {
      user_id: userId,
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
      processing_status: 'uploaded'
    };

    console.log("📝 Inserting payload:", JSON.stringify(insertPayload, null, 2));

    const { data: insertData, error: insertError } = await authenticatedDbClient
      .from("metadata")
      .insert([insertPayload]) 
      .select();

    if (insertError) {
      console.error("❌ Database insert failed:", insertError);
      console.error("Full error object:", JSON.stringify(insertError, null, 2));
      
      // Cleanup storage
      try {
        await supabase.storage.from("projectai").remove([storagePath]);
        console.log("🗑️ Cleaned up storage file");
      } catch (cleanupErr) {
        console.warn("⚠️ Failed to cleanup storage:", cleanupErr);
      }
      
      // Cleanup temp file
      if (uploadedFilePath) {
        try { 
            await fsp.unlink(uploadedFilePath); 
            console.log("🗑️ Cleaned up temp file");
        } catch (e) {}
      }
      
      return res.status(500).json({
        success: false,
        error: "Failed to save metadata to database",
        details: insertError.message,
        hint: insertError.hint,
        code: insertError.code,
        fullError: insertError
      });
    }

    // Cleanup temp file on success
    await fsp.unlink(uploadedFilePath);
    
    console.log("✅ Upload successful! Metadata ID:", insertData[0]?.id);
    
    return res.status(200).json({
      success: true,
      message: "Video uploaded successfully!",
      metadata: { 
          id: insertData[0]?.id, 
          originalName: file.originalname 
      },
      publicUrl: publicUrl,
      videoName: renamedFilename
    });

  } catch (err) {
    if (uploadedFilePath) {
      try { await fsp.unlink(uploadedFilePath); } catch (e) {}
    }
    
    console.error("💥 Server error:", err);
    console.error("Stack trace:", err.stack);
    
    return res.status(500).json({
      success: false,
      error: "Server error during upload",
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};