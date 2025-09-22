// // 🏢 controllers/upload.controller.js - THE UPLOAD WORKER
// // "I'm the person who actually handles your file uploads!"

// import { promises as fsp } from "fs";
// import path from "path";
// import { supabase } from '../config/database.js';  // Get database connection

// // 📤 THE MAIN UPLOAD WORKER FUNCTION
// export const uploadVideo = async (req, res) => {
//     try {
//         console.log("🏢 Upload Worker: Starting file processing...");
        
//         // 🔍 CHECK IF FILE EXISTS
//         const file = req.file;
//         if (!file) {
//             console.log("❌ Upload Worker: No file received");
//             return res.status(400).send("No file uploaded");
//         }

//         // 🔍 CHECK USER ID
//         const userId = req.body.user_id;
//         if (!userId) {
//             console.log("❌ Upload Worker: No user_id provided");
//             return res.status(400).send("user_id is required");
//         }
        
//         // 🔍 VALIDATE USER ID FORMAT
//         if (!userId.startsWith('user_') || userId.length < 20) {
//             console.log("❌ Upload Worker: Invalid user_id format:", userId);
//             return res.status(400).send("Invalid user_id format");
//         }
        
//         console.log("✅ Upload Worker: File received for user:", userId);
//         console.log("📄 Original filename:", file.originalname);
//         console.log("📁 Temporary path:", file.path);

//         // 📖 READ THE FILE FROM TEMPORARY LOCATION
//         const fileBuffer = await fsp.readFile(file.path);
//         console.log("📖 Upload Worker: File read successfully, size:", fileBuffer.length, "bytes");
        
//         // 🏷️ CREATE A UNIQUE, SAFE FILENAME
//         const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');  // 2024-01-15T10-30-45
//         const randomId = Math.random().toString(36).substring(2, 15);                 // abc123def456
//         const fileExtension = path.extname(file.originalname);                       // .mp4
//         const baseName = path.basename(file.originalname, fileExtension);            // myvideo
//         const renamedFilename = `${timestamp}-${randomId}-${baseName}${fileExtension}`;
        
//         console.log("🏷️ Upload Worker: New filename:", renamedFilename);

//         // ☁️ UPLOAD TO SUPABASE CLOUD STORAGE
//         console.log("☁️ Upload Worker: Uploading to cloud storage...");
//         const { error } = await supabase.storage
//             .from("projectai")                    // Storage bucket name
//             .upload(`videos/${renamedFilename}`, fileBuffer, {
//                 contentType: file.mimetype,
//                 upsert: true,                     // Replace if already exists
//             });

//         if (error) {
//             console.error("❌ Upload Worker: Supabase upload failed:", error);
//             return res.status(500).send("Upload to Supabase failed");
//         }
//         console.log("✅ Upload Worker: Cloud upload successful!");

//         // 🔗 GET PUBLIC URL FOR THE FILE
//         const { data: publicUrlData } = supabase
//             .storage
//             .from("projectai")
//             .getPublicUrl(`videos/${renamedFilename}`);
//         const publicUrl = publicUrlData.publicUrl;
//         console.log("🔗 Upload Worker: Public URL created:", publicUrl);

//         // 📝 SAVE FILE INFORMATION TO DATABASE
//         console.log("📝 Upload Worker: Saving metadata to database...");
//         const { data: insertData, error: insertError } = await supabase
//             .from("metadata")
//             .insert([{
//                 user_id: userId,
//                 video_name: renamedFilename,
//                 original_name: file.originalname,
//                 video_url: publicUrl,
//                 created_at: new Date().toISOString(),
//                 file_size: fileBuffer.length,
//                 mime_type: file.mimetype
//             }]);

//         if (insertError) {
//             console.error("❌ Upload Worker: Database save failed:", insertError);
//             return res.status(500).send("Failed to save metadata");
//         }
//         console.log("✅ Upload Worker: Metadata saved successfully!");
        
//         // 🧹 CLEAN UP TEMPORARY FILE
//         await fsp.unlink(file.path);
//         console.log("🧹 Upload Worker: Temporary file cleaned up");

//         // 🎉 SUCCESS! SEND RESPONSE TO USER
//         console.log("🎉 Upload Worker: Job complete! Sending success response");
//         res.status(200).json({
//             message: "Upload successful!",
//             videoName: renamedFilename,
//             originalName: file.originalname,
//             publicUrl: publicUrl,
//             fileSize: fileBuffer.length,
//             uploadedAt: new Date().toISOString()
//         });

//     } catch (err) {
//         console.error("💥 Upload Worker: Unexpected error:", err);
//         res.status(500).send("Server error during upload");
//     }
// };

// /*
// THE UPLOAD WORKER'S JOB:
// 1. 🔍 Check if file and user info is valid
// 2. 📖 Read the uploaded file from temporary storage  
// 3. 🏷️ Give it a unique, safe name
// 4. ☁️ Upload to cloud storage (Supabase)
// 5. 🔗 Get a public URL people can access
// 6. 📝 Save all the info to database
// 7. 🧹 Clean up temporary files
// 8. 🎉 Tell user it worked!

// WHAT HAPPENS NEXT?
// - User gets success message with file URL
// - File is safely stored in cloud
// - Other parts of app can now process this file (extract frames, transcribe, etc.)
// */

// 🏢 controllers/upload.controller.js - THE UPLOAD WORKER
// "I'm the person who actually handles your file uploads!"

import { promises as fsp } from "fs";
import path from "path";
import { supabase } from '../config/database.js';  // Get database connection

// 📤 THE MAIN UPLOAD WORKER FUNCTION
export const uploadVideo = async (req, res) => {
    try {
        console.log("🏢 Controller: The video has arrived and is ready for final processing.");
        
        // 🔍 CHECK IF FILE EXISTS
        const file = req.file;
        if (!file) {
            console.log("❌ Controller: No file received");
            return res.status(400).send("No file uploaded");
        }

        // 🔍 CHECK USER ID
        const userId = req.body.user_id;
        if (!userId) {
            console.log("❌ Controller: No user_id provided");
            return res.status(400).send("user_id is required");
        }
        
        // 🔍 VALIDATE USER ID FORMAT
        if (!userId.startsWith('user_') || userId.length < 20) {
            console.log("❌ Controller: Invalid user_id format:", userId);
            return res.status(400).send("Invalid user_id format");
        }
        
        console.log(`➡️ Controller: Current temporary server path of the video: ${file.path}`);

        // 📖 READ THE FILE FROM TEMPORARY LOCATION
        const fileBuffer = await fsp.readFile(file.path);
        console.log("📖 Controller: Video file successfully read from the temporary path.");
        
        // 🏷️ CREATE A UNIQUE, SAFE FILENAME
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');  // 2024-01-15T10-30-45
        const randomId = Math.random().toString(36).substring(2, 15);                 // abc123def456
        const fileExtension = path.extname(file.originalname);                       // .mp4
        const baseName = path.basename(file.originalname, fileExtension);            // myvideo
        const renamedFilename = `${timestamp}-${randomId}-${baseName}${fileExtension}`;
        
        console.log(`➡️ Controller: The video's new, permanent name will be: ${renamedFilename}`);
        console.log("☁️ Controller: Uploading the video to Supabase...");

        // ☁️ UPLOAD TO SUPABASE CLOUD STORAGE
        const { error } = await supabase.storage
            .from("projectai")                    // Storage bucket name
            .upload(`videos/${renamedFilename}`, fileBuffer, {
                contentType: file.mimetype,
                upsert: true,                     // Replace if already exists
            });

        if (error) {
            console.error("❌ Controller: Supabase upload failed:", error);
            return res.status(500).send("Upload to Supabase failed");
        }
        console.log("✅ Controller: Cloud upload successful!");

        // 🔗 GET PUBLIC URL FOR THE FILE
        const { data: publicUrlData } = supabase
            .storage
            .from("projectai")
            .getPublicUrl(`videos/${renamedFilename}`);
        const publicUrl = publicUrlData.publicUrl;
        console.log(`🎉 Controller: The video's final public URL is: ${publicUrl}`);

        // 📝 SAVE FILE INFORMATION TO DATABASE
        console.log("📝 Controller: Saving video information to the database...");
        const { data: insertData, error: insertError } = await supabase
            .from("metadata")
            .insert([{
                user_id: userId,
                video_name: renamedFilename,
                original_name: file.originalname,
                video_url: publicUrl,
                created_at: new Date().toISOString(),
                file_size: fileBuffer.length,
                mime_type: file.mimetype
            }]);

        if (insertError) {
            console.error("❌ Controller: Database save failed:", insertError);
            return res.status(500).send("Failed to save metadata");
        }
        console.log("✅ Controller: Metadata saved successfully!");
        
        // 🧹 CLEAN UP TEMPORARY FILE
        await fsp.unlink(file.path);
        console.log("🧹 Controller: Temporary server file has been cleaned up.");

        // 🎉 SUCCESS! SEND RESPONSE TO USER
        console.log("🎉 Controller: Upload complete! Sending success response to the user.");
        res.status(200).json({
            message: "Upload successful!",
            videoName: renamedFilename,
            originalName: file.originalname,
            publicUrl: publicUrl,
            fileSize: fileBuffer.length,
            uploadedAt: new Date().toISOString()
        });

    } catch (err) {
        console.error("💥 Controller: An unexpected error occurred:", err);
        res.status(500).send("Server error during upload");
    }
};

/*
THE UPLOAD WORKER'S JOB:
1. 🔍 Check if file and user info is valid
2. 📖 Read the uploaded file from temporary storage  
3. 🏷️ Give it a unique, safe name
4. ☁️ Upload to cloud storage (Supabase)
5. 🔗 Get a public URL people can access
6. 📝 Save all the info to database
7. 🧹 Clean up temporary files
8. 🎉 Tell user it worked!

WHAT HAPPENS NEXT?
- User gets success message with file URL
- File is safely stored in cloud
- Other parts of app can now process this file (extract frames, transcribe, etc.)
*/