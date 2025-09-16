// // 🚦 routes/metadata.routes.js - DATA INFO TRAFFIC DIRECTOR
// // "Need information about your files? This is the information desk!"

// import express from 'express';
// import { getMetadata, getMetadataById, updateMetadata, deleteMetadata } from '../controllers/metadata.controller.js';

// // 🚦 Create metadata traffic director  
// const router = express.Router();

// // 📋 TRAFFIC RULES FOR DATA INFORMATION DEPARTMENT:

// // 📄 Get all file information
// // GET /api/metadata
// router.get('/metadata', getMetadata);

// // 🔍 Get information for specific file
// // GET /api/metadata/123
// router.get('/metadata/:id', getMetadataById);

// // ✏️ Update file information  
// // PUT /api/metadata/123
// router.put('/metadata/:id', updateMetadata);

// // 🗑️ Delete file information
// // DELETE /api/metadata/123  
// router.delete('/metadata/:id', deleteMetadata);

// // 📊 Advanced metadata routes you might add:
//  router.get('/metadata/user/:userId', getMetadataByUser);     // Get all files for a user
//  router.get('/metadata/search', searchMetadata);              // Search files by name/date
// // router.get('/metadata/stats', getStorageStats);              // Storage usage statistics
// // router.post('/metadata/bulk-delete', bulkDeleteMetadata);    // Delete multiple files

// // 📤 Export this traffic director
// export default router;

// /*
// THE METADATA WORKFLOW:
// 1. When files are uploaded → metadata gets created automatically
// 2. User wants to see all files → GET /api/metadata → shows list of all files
// 3. User wants details about specific file → GET /api/metadata/123 → shows full details
// 4. User wants to update file info → PUT /api/metadata/123 → updates description, tags, etc.
// 5. User wants to delete file → DELETE /api/metadata/123 → removes file and data

// WHAT IS METADATA?
// Think of it as a "filing card" for each video that contains:
// - Video name and original name
// - When it was uploaded  
// - File size and type
// - Transcripts (if created)
// - Frame analysis (if done)
// - User who uploaded it
// - Public URL to access it
// */






// routes/metadata.routes.js - FIXED VERSION
import express from 'express';
import { 
    getMetadata, 
    getMetadataById, 
    updateMetadata, 
    deleteMetadata,
    getMetadataByUser,
    searchMetadata,
    getUserVideoRelationships,
    getAllUsersWithVideos
} from '../controllers/metadata.controller.js';

const router = express.Router();

// Basic metadata routes
router.get('/metadata', getMetadata);
router.get('/metadata/:id', getMetadataById);
router.put('/metadata/:id', updateMetadata);
router.delete('/metadata/:id', deleteMetadata);

// User-specific routes
router.get('/metadata/user/:userId', getMetadataByUser);
router.get('/users/:userId/videos', getUserVideoRelationships);
router.get('/users/summary', getAllUsersWithVideos);

// Search routes
router.get('/metadata/search', searchMetadata);

export default router;