// ============================================
// UPLOAD.CONTROLLER.JS - COPY-PASTE READY
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

    const authenticatedDbClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${userToken}`,
            },
        },
    });
    
    console.log("💾 Saving metadata to database...");
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
      processing_status: 'uploaded',
      uploaded_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      description: null,
      tags: null,
      frames: [],
      deepgram_words: {},
      custom_metadata: {},
      elevenlabs_transcript: null,
      deepgram_transcript: null,
      llm_analysis: null,
      gemini_analysis: null,
      frame_analysis: null,
      gemini_frame_analysis: null,
      error_message: null,
      transcription_completed_at: null,
      frame_extraction_completed_at: null,
      analysis_completed_at: null
    };

    const { data: insertData, error: insertError } = await authenticatedDbClient
      .from("metadata")
      .insert([insertPayload]) 
      .select();

    if (insertError) {
      console.error("❌ Database insert failed:", insertError);
      
      try {
        await supabase.storage.from("projectai").remove([storagePath]);
      } catch (cleanupErr) {
        console.warn("⚠️ Failed to cleanup storage:", cleanupErr);
      }
      
      if (uploadedFilePath) {
        try { await fsp.unlink(uploadedFilePath); } catch (e) {}
      }
      
      return res.status(500).json({
        success: false,
        error: "Failed to save metadata to database",
        details: insertError.message,
        hint: insertError.hint,
        code: insertError.code
      });
    }

    await fsp.unlink(uploadedFilePath);
    
    console.log("✅ Upload successful! ID:", insertData[0]?.id);
    
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
    return res.status(500).json({
      success: false,
      error: "Server error during upload",
      details: err.message
    });
  }
};