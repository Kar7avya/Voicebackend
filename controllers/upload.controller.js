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
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!JWT_SECRET || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("CRITICAL: Missing environment variables!");
    process.exit(1); 
}

// Create service client for storage operations (bypasses RLS)
const createServiceClient = () => {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        // Fallback to regular supabase client if service role not available
        return supabase;
    }
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
};

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
    
    // Upload to storage using service client (has proper permissions)
    const serviceClient = createServiceClient();
    const { error: uploadError } = await serviceClient.storage
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

    const { data: publicUrlData } = serviceClient.storage
        .from("projectai")
        .getPublicUrl(storagePath);
    const publicUrl = publicUrlData?.publicUrl || null;

    // Use service client for database insert to ensure it works even if RLS blocks authenticated inserts
    // We explicitly set user_id from JWT token to ensure unique metadata per user
    const dbServiceClient = createServiceClient();
    
    // ABSOLUTE MINIMAL PAYLOAD - user_id is extracted from JWT token
    const payload = {
      user_id: userId,  // Explicitly set from JWT token - ensures unique metadata per user
      video_name: renamedFilename,
      file_name: file.originalname,
      original_name: file.originalname,
      bucket_path: storagePath,
      public_url: publicUrl,
      file_size: fileBuffer.length,
      mime_type: file.mimetype
    };

    console.log("💾 Inserting metadata for user:", userId);
    console.log("💾 Payload (without user_id):", { 
      video_name: payload.video_name,
      file_name: payload.file_name,
      bucket_path: payload.bucket_path,
      file_size: payload.file_size,
      mime_type: payload.mime_type
    });  // Log payload without user_id for security

    const { data, error } = await dbServiceClient
      .from("metadata")
      .insert([payload]) 
      .select();

    if (error) {
      console.error("❌ DB insert failed:", error);
      
      // Cleanup storage using service client
      try {
        const serviceClient = createServiceClient();
        await serviceClient.storage.from("projectai").remove([storagePath]);
      } catch (e) {
        console.warn("⚠️ Could not cleanup storage:", e);
      }
      
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