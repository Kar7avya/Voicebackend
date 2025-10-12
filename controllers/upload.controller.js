// // ============================================
// // UPLOAD.CONTROLLER.JS - FIXED FOR SUPABASE
// // ============================================

// import { promises as fsp } from "fs";
// import path from "path";
// import { supabase } from "../config/database.js";

// export const uploadVideo = async (req, res) => {
//   let uploadedFilePath = null;

//   try {
//     console.log("📥 Upload request received");
//     console.log("📦 Request body:", req.body);
//     console.log("📁 Request file:", req.file ? "File present" : "No file");

//     const file = req.file;
//     if (!file) {
//       console.error("❌ No file in request");
//       return res.status(400).json({
//         success: false,
//         error: "No file uploaded. Field name must be 'myvideo'."
//       });
//     }

//     console.log("✅ File received:", {
//       originalName: file.originalname,
//       mimetype: file.mimetype,
//       size: file.size,
//       path: file.path
//     });

//     uploadedFilePath = file.path;

//     // Get user_id from request body
//     const userId = req.body.user_id;
//     if (!userId) {
//       return res.status(400).json({
//         success: false,
//         error: "user_id is required"
//       });
//     }

//     console.log("👤 User ID:", userId);

//     // Validate user_id format
//     if (!userId.startsWith("user_") || userId.length < 20) {
//       return res.status(400).json({
//         success: false,
//         error: "Invalid user_id format. Must start with 'user_' and be at least 20 characters."
//       });
//     }

//     // Read file buffer
//     console.log("📖 Reading file from disk...");
//     const fileBuffer = await fsp.readFile(file.path);
//     console.log("✅ File read successfully, size:", fileBuffer.length, "bytes");

//     // Generate unique filename
//     const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
//     const randomId = Math.random().toString(36).substring(2, 15);
//     const fileExtension = path.extname(file.originalname);
//     const baseName = path.basename(file.originalname, fileExtension)
//       .replace(/[^a-zA-Z0-9-_]/g, '_'); // Sanitize filename
//     const renamedFilename = `${timestamp}-${randomId}-${baseName}${fileExtension}`;

//     console.log("📤 Uploading to Supabase Storage...");
//     console.log("🗂️ Bucket: projectai");
//     console.log("📁 Path: videos/" + renamedFilename);

//     // Upload to Supabase Storage
//     const { data: uploadData, error: uploadError } = await supabase.storage
//       .from("projectai")
//       .upload(`videos/${renamedFilename}`, fileBuffer, {
//         contentType: file.mimetype,
//         upsert: false // Don't overwrite if file exists
//       });

//     if (uploadError) {
//       console.error("❌ Storage upload failed:", uploadError);
//       return res.status(500).json({
//         success: false,
//         error: "Upload to Supabase Storage failed",
//         details: uploadError.message
//       });
//     }

//     console.log("✅ File uploaded to Supabase Storage:", uploadData.path);

//     // Get public URL
//     const { data: publicUrlData } = supabase.storage
//       .from("projectai")
//       .getPublicUrl(`videos/${renamedFilename}`);
//     const publicUrl = publicUrlData?.publicUrl || null;

//     console.log("🔗 Public URL:", publicUrl);

//     // Insert metadata into database
//     console.log("💾 Saving metadata to database...");
//     const insertPayload = {
//       user_id: userId,
//       user_id_string: userId, // For compatibility with metadata controller
//       video_name: renamedFilename,
//       original_name: file.originalname,
//       video_url: publicUrl,
//       file_size: fileBuffer.length,
//       mime_type: file.mimetype,
//       created_at: new Date().toISOString()
//     };

//     console.log("📝 Insert payload:", insertPayload);

//     const { data: insertData, error: insertError } = await supabase
//       .from("metadata")
//       .insert([insertPayload])
//       .select();

//     if (insertError) {
//       console.error("❌ Database insert failed:", insertError);
//       console.error("Error code:", insertError.code);
//       console.error("Error hint:", insertError.hint);
      
//       // Try to cleanup uploaded file from storage
//       await supabase.storage
//         .from("projectai")
//         .remove([`videos/${renamedFilename}`]);
      
//       return res.status(500).json({
//         success: false,
//         error: "Failed to save metadata to database",
//         details: insertError.message,
//         hint: insertError.hint,
//         code: insertError.code
//       });
//     }

//     console.log("✅ Metadata saved successfully:", insertData[0]);

//     // Cleanup temp file
//     try {
//       await fsp.unlink(uploadedFilePath);
//       console.log("🗑️ Temp file deleted:", uploadedFilePath);
//     } catch (unlinkErr) {
//       console.warn("⚠️ Failed to delete temp file:", unlinkErr.message);
//     }

//     // Return success response
//     return res.status(200).json({
//       success: true,
//       message: "Video uploaded successfully!",
//       videoName: renamedFilename,
//       publicUrl: publicUrl,
//       metadata: {
//         id: insertData[0]?.id,
//         originalName: file.originalname,
//         fileSize: fileBuffer.length,
//         mimeType: file.mimetype,
//         uploadedAt: insertData[0]?.created_at
//       }
//     });

//   } catch (err) {
//     console.error("💥 Unexpected error in uploadVideo:", err);
//     console.error("Stack trace:", err.stack);

//     // Cleanup temp file if it exists
//     if (uploadedFilePath) {
//       try {
//         await fsp.unlink(uploadedFilePath);
//         console.log("🗑️ Cleaned up temp file after error");
//       } catch (cleanupErr) {
//         console.warn("⚠️ Could not cleanup temp file:", cleanupErr.message);
//       }
//     }

//     return res.status(500).json({
//       success: false,
//       error: "Server error during upload",
//       details: err.message
//     });
//   }
// };
// ============================================
// UPLOAD.CONTROLLER.JS - FIXED FOR SUPABASE UUID
// ============================================

import { promises as fsp } from "fs";
import path from "path";
import { supabase } from "../config/database.js";

export const uploadVideo = async (req, res) => {
  let uploadedFilePath = null;

  try {
    console.log("📥 Upload request received");
    console.log("📦 Request body:", req.body);
    console.log("📁 Request file:", req.file ? "File present" : "No file");

    const file = req.file;
    if (!file) {
      console.error("❌ No file in request");
      return res.status(400).json({
        success: false,
        error: "No file uploaded. Field name must be 'myvideo'."
      });
    }

    console.log("✅ File received:", {
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path
    });

    uploadedFilePath = file.path;

    // Get user_id from request body
    const userId = req.body.user_id;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "user_id is required"
      });
    }

    console.log("👤 User ID:", userId);

    // ===============================================
    // ✅ FIX: VALIDATE USER_ID AS STANDARD UUID
    // ===============================================
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(userId)) {
      console.error('❌ Invalid UUID format received:', userId);
      return res.status(400).json({
        success: false,
        error: 'Invalid user_id format. Must be a valid UUID.',
        received: userId 
      });
    }
    
    console.log('✅ User ID validated as UUID.');
    // ===============================================
    // END FIX
    // ===============================================

    // Read file buffer
    console.log("📖 Reading file from disk...");
    const fileBuffer = await fsp.readFile(file.path);
    console.log("✅ File read successfully, size:", fileBuffer.length, "bytes");

    // Generate unique filename
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, fileExtension)
      .replace(/[^a-zA-Z0-9-_]/g, '_'); // Sanitize filename
    const renamedFilename = `${timestamp}-${randomId}-${baseName}${fileExtension}`;

    console.log("📤 Uploading to Supabase Storage...");
    console.log("🗂️ Bucket: projectai");
    console.log("📁 Path: videos/" + renamedFilename);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("projectai")
      .upload(`videos/${renamedFilename}`, fileBuffer, {
        contentType: file.mimetype,
        upsert: false // Don't overwrite if file exists
      });

    if (uploadError) {
      console.error("❌ Storage upload failed:", uploadError);
      return res.status(500).json({
        success: false,
        error: "Upload to Supabase Storage failed",
        details: uploadError.message
      });
    }

    console.log("✅ File uploaded to Supabase Storage:", uploadData.path);

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("projectai")
      .getPublicUrl(`videos/${renamedFilename}`);
    const publicUrl = publicUrlData?.publicUrl || null;

    console.log("🔗 Public URL:", publicUrl);

    // Insert metadata into database
    console.log("💾 Saving metadata to database...");
    const insertPayload = {
      user_id: userId,
      user_id_string: userId, // For compatibility with metadata controller
      video_name: renamedFilename,
      original_name: file.originalname,
      video_url: publicUrl,
      file_size: fileBuffer.length,
      mime_type: file.mimetype,
      created_at: new Date().toISOString()
    };

    console.log("📝 Insert payload:", insertPayload);

    const { data: insertData, error: insertError } = await supabase
      .from("metadata")
      .insert([insertPayload])
      .select();

    if (insertError) {
      console.error("❌ Database insert failed:", insertError);
      console.error("Error code:", insertError.code);
      console.error("Error hint:", insertError.hint);
      
      // Try to cleanup uploaded file from storage
      await supabase.storage
        .from("projectai")
        .remove([`videos/${renamedFilename}`]);
      
      return res.status(500).json({
        success: false,
        error: "Failed to save metadata to database",
        details: insertError.message,
        hint: insertError.hint,
        code: insertError.code
      });
    }

    console.log("✅ Metadata saved successfully:", insertData[0]);

    // Cleanup temp file
    try {
      await fsp.unlink(uploadedFilePath);
      console.log("🗑️ Temp file deleted:", uploadedFilePath);
    } catch (unlinkErr) {
      console.warn("⚠️ Failed to delete temp file:", unlinkErr.message);
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: "Video uploaded successfully!",
      videoName: renamedFilename,
      publicUrl: publicUrl,
      metadata: {
        id: insertData[0]?.id,
        originalName: file.originalname,
        fileSize: fileBuffer.length,
        mimeType: file.mimetype,
        uploadedAt: insertData[0]?.created_at
      }
    });

  } catch (err) {
    console.error("💥 Unexpected error in uploadVideo:", err);
    console.error("Stack trace:", err.stack);

    // Cleanup temp file if it exists
    if (uploadedFilePath) {
      try {
        await fsp.unlink(uploadedFilePath);
        console.log("🗑️ Cleaned up temp file after error");
      } catch (cleanupErr) {
        console.warn("⚠️ Could not cleanup temp file:", cleanupErr.message);
      }
    }

    return res.status(500).json({
      success: false,
      error: "Server error during upload",
      details: err.message
    });
  }
};