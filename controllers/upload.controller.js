// ============================================
// 1. UPLOAD.CONTROLLER.JS - FIXED
// ============================================

import { promises as fsp } from "fs";
import path from "path";
import { supabase } from "../config/database.js";

export const uploadVideo = async (req, res) => {
  let uploadedFilePath = null;

  try {
    const file = req.file;
    if (!file) {
      return res.status(400).send("No file uploaded. Field name must be 'myvideo'.");
    }
    uploadedFilePath = file.path;

    const userId = req.body.user_id;
    if (!userId) {
      return res.status(400).send("user_id is required");
    }
    if (!userId.startsWith("user_") || userId.length < 20) {
      return res.status(400).send("Invalid user_id format");
    }

    const fileBuffer = await fsp.readFile(file.path);

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, fileExtension);
    const renamedFilename = `${timestamp}-${randomId}-${baseName}${fileExtension}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("projectai")
      .upload(`videos/${renamedFilename}`, fileBuffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      console.error("❌ Storage upload failed:", uploadError.message);
      return res.status(500).json({ 
        error: "Upload to Supabase failed", 
        details: uploadError.message 
      });
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("projectai")
      .getPublicUrl(`videos/${renamedFilename}`);
    const publicUrl = publicUrlData?.publicUrl || null;

    // Insert metadata - use both user_id and user_id_string for compatibility
    console.log("💾 Saving metadata to database...");
    const insertPayload = {
      user_id: userId,           // For compatibility
      user_id_string: userId,    // For your metadata controller
      video_name: renamedFilename,
      original_name: file.originalname,
      video_url: publicUrl,
      file_size: fileBuffer.length,
      mime_type: file.mimetype
    };

    console.log("📝 Insert payload:", insertPayload);

    const { data: insertData, error: insertError } = await supabase
      .from("metadata")
      .insert([insertPayload])
      .select();

    console.log("📊 Insert result:", { data: insertData, error: insertError });

    if (insertError) {
      console.error("❌ Database insert failed:", insertError);
      console.error("Error details:", JSON.stringify(insertError, null, 2));
      return res.status(500).json({ 
        error: "Failed to save metadata", 
        details: insertError.message,
        hint: insertError.hint,
        code: insertError.code
      });
    }

    // Cleanup temp file
    try {
      await fsp.unlink(uploadedFilePath);
    } catch (unlinkErr) {
      console.warn("Failed to delete temp file:", unlinkErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Upload successful!",
      data: {
        id: insertData[0]?.id,
        videoName: renamedFilename,
        publicUrl,
        fileSize: fileBuffer.length,
        uploadedAt: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error("💥 Unexpected error:", err);
    console.error("Stack:", err.stack);
    
    if (uploadedFilePath) {
      try {
        await fsp.unlink(uploadedFilePath);
      } catch {}
    }
    
    return res.status(500).json({ 
      error: "Server error during upload", 
      details: err.message 
    });
  }
};

