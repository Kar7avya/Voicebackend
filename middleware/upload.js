// // 🛡️ middleware/upload.js - FILE SECURITY GUARD
// // Think of this as a security guard who checks all incoming files

// import multer from "multer";
// import path from "path";
// import { fileURLToPath } from "url";

// // Figure out where we are (security guard needs to know the building layout)
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // 🛡️ CREATE THE SECURITY GUARD (multer configuration)
// const videoUpload = multer({
//     storage: multer.diskStorage({
        
//         // 📁 WHERE TO PUT FILES (which storage room?)
//         destination: (req, file, cb) => {
//             console.log("🔄 Security Guard: Checking file:", file.originalname);
//             // Go up one level (..) from middleware folder to main project, then into uploads
//             const uploadPath = path.join(__dirname, "../uploads");
//             cb(null, uploadPath);
//         },
        
//         // 🏷️ WHAT TO NAME THE FILE (give it a safe, unique name)
//         filename: (req, file, cb) => {
//             // Create unique filename: timestamp + original name
//             const timestamp = Date.now();
//             const safeName = `${timestamp}-${file.originalname}`;
//             cb(null, safeName);
//             console.log("✅ Security Guard: File approved and renamed to:", safeName);
//         },
//     }),
    
//     // 📏 SECURITY RULES (optional - you can add file size limits, type checks, etc.)
//     limits: {
//         fileSize: 100 * 1024 * 1024, // 100MB max file size
//     },
    
//     // 🔍 FILE TYPE FILTER (optional - check if file type is allowed)
//     fileFilter: (req, file, cb) => {
//         // Accept video files
//         if (file.mimetype.startsWith('video/')) {
//             console.log("✅ Security Guard: Video file type approved");
//             cb(null, true);
//         } else {
//             console.log("❌ Security Guard: File type rejected:", file.mimetype);
//             cb(new Error('Only video files are allowed!'), false);
//         }
//     }
// });

// // 📤 Export the security guard so routes can use it
// export { videoUpload };

// /*
// HOW ROUTES USE THIS SECURITY GUARD:
// import { videoUpload } from '../middleware/upload.js';

// router.post('/upload', videoUpload.single("myvideo"), controllerFunction);
//                      ^^^ Security guard checks the file first!
// */

// 🛡️ middleware/upload.js - FILE SECURITY GUARD
// Think of this as a security guard who checks all incoming files

import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

// Figure out where we are (security guard needs to know the building layout)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🛡️ CREATE THE SECURITY GUARD (multer configuration)
const videoUpload = multer({
    storage: multer.diskStorage({
        
        // 📁 WHERE TO PUT FILES (which storage room?)
        destination: (req, file, cb) => {
            console.log("🔄 Multer: Video is arriving from the user.");
            // Go up one level (..) from middleware folder to main project, then into uploads
            const uploadPath = path.join(__dirname, "../uploads");
            console.log(`➡️ Multer: The video will be saved temporarily at this path: ${uploadPath}`);
            cb(null, uploadPath);
        },
        
        // 🏷️ WHAT TO NAME THE FILE (give it a safe, unique name)
        filename: (req, file, cb) => {
            // Create unique filename: timestamp + original name
            const timestamp = Date.now();
            const safeName = `${timestamp}-${file.originalname}`;
            cb(null, safeName);
            console.log(`✅ Multer: The temporary filename on the server is now: ${safeName}`);
        },
    }),
    
    // 📏 SECURITY RULES (optional - you can add file size limits, type checks, etc.)
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB max file size
    },
    
    // 🔍 FILE TYPE FILTER (optional - check if file type is allowed)
    fileFilter: (req, file, cb) => {
        // Accept video files
        if (file.mimetype.startsWith('video/')) {
            console.log("✅ Multer: Video file type approved.");
            cb(null, true);
        } else {
            console.log("❌ Multer: File type rejected:", file.mimetype);
            cb(new Error('Only video files are allowed!'), false);
        }
    }
});

// 📤 Export the security guard so routes can use it
export { videoUpload };

/*
HOW ROUTES USE THIS SECURITY GUARD:
import { videoUpload } from '../middleware/upload.js';

router.post('/upload', videoUpload.single("myvideo"), controllerFunction);
                     ^^^ Security guard checks the file first!
*/