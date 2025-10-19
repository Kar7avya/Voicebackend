// ============================================
// UPLOAD.CONTROLLER.JS - ULTRA MINIMAL
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
    console.error("CRITICAL: Missing environment variables!");
    process.exit(1); 
}

const extractUserIdFromToken = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded.sub; 
    } catch (err) {
        console.warn("❌ JWT Failed:", err.message);
        return null;
    }
};

export const uploadVideo = async (req, res) => {
  let uploadedFilePath = null;

  try {
    const authHeader = req.headers.authorization;
    const userToken = authHeader ? authHeader.split(' ')[1] : null;
    const userId = extractUserIdFromToken(req); 
    
    if (!userId || !userToken) {
        return res.status(401).json({
            success: false,
            error: "Authentication failed"
        });
    }
    
    const file = req.file;
    if (!file) { 
        return res.status(400).json({ 
            success: false, 
            error: "No file uploaded" 
        }); 
    }

    uploadedFilePath = file.path;
    const fileBuffer = await fsp.readFile(file.path);
    
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const fileExtension = path.extname(file.originalname);
    const sanitizedName = path.basename(file.originalname, fileExtension)
        .replace(/[^a-zA-Z0-9-._]/g, '_')
        .substring(0, 50);
    const renamedFilename = `${timestamp}-${randomId}-${sanitizedName}${fileExtension}`;
    const storagePath = `videos/${renamedFilename}`;
    
    // Upload to storage
    const { error: uploadError } = await supabase.storage
        .from("projectai")
        .upload(storagePath, fileBuffer, {
            contentType: file.mimetype,
            upsert: false
        });

    if (uploadError) { 
        console.error("❌ Storage failed:", uploadError);
        if (uploadedFilePath) {
            try { await fsp.unlink(uploadedFilePath); } catch (e) {}
        }
        return res.status(500).json({ 
            success: false, 
            error: "Storage upload failed", 
            details: uploadError.message 
        });
    }

    const { data: publicUrlData } = supabase.storage
        .from("projectai")
        .getPublicUrl(storagePath);
    const publicUrl = publicUrlData?.publicUrl || null;

    // Create authenticated client
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${userToken}` } }
    });
    
    // ABSOLUTE MINIMAL PAYLOAD
    const payload = {
      user_id: userId,
      video_name: renamedFilename,
      file_name: file.originalname,
      original_name: file.originalname,
      bucket_path: storagePath,
      public_url: publicUrl,
      file_size: fileBuffer.length,
      mime_type: file.mimetype
    };

    console.log("💾 Inserting:", payload);

    const { data, error } = await authClient
      .from("metadata")
      .insert([payload]) 
      .select();

    if (error) {
      console.error("❌ DB insert failed:", error);
      
      // Cleanup storage
      try {
        await supabase.storage.from("projectai").remove([storagePath]);
      } catch (e) {}
      
      if (uploadedFilePath) {
        try { await fsp.unlink(uploadedFilePath); } catch (e) {}
      }
      
      return res.status(500).json({
        success: false,
        error: "Database insert failed",
        details: error.message,
        code: error.code,
        hint: error.hint
      });
    }

    // Success cleanup
    await fsp.unlink(uploadedFilePath);
    
    console.log("✅ Success! ID:", data[0]?.id);
    
    return res.status(200).json({
      success: true,
      message: "Upload successful",
      metadata: { id: data[0]?.id },
      publicUrl: publicUrl,
      videoName: renamedFilename
    });

  } catch (err) {
    if (uploadedFilePath) {
      try { await fsp.unlink(uploadedFilePath); } catch (e) {}
    }
    
    console.error("💥 Error:", err);
    return res.status(500).json({
      success: false,
      error: "Server error",
      details: err.message
    });
  }
};