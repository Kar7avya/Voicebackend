// import express from 'express';
// import { 
//     getMetadata, 
//     getMetadataById, 
//     updateMetadata, 
//     deleteMetadata,
//     getMetadataByUser,
//     searchMetadata,
//     getUserVideoRelationships,
//     getAllUsersWithVideos
// } from '../controllers/metadata.controller.js';

// const router = express.Router();

// // Logging middleware
// router.use((req, res, next) => {
//     console.log(`🔍 Metadata Route: ${req.method} ${req.originalUrl}`);
//     next();
// });

// // ============================================
// // NO /metadata PREFIX - routes are relative to mount point
// // Mounted at /api/metadata in index.js
// // ============================================

// // SPECIFIC ROUTES FIRST
// router.get('/search', searchMetadata);                    // → /api/metadata/search
// router.get('/users/summary', getAllUsersWithVideos);      // → /api/metadata/users/summary
// router.get('/users/:userId/videos', getUserVideoRelationships); // → /api/metadata/users/:userId/videos
// router.get('/user/:userId', getMetadataByUser);           // → /api/metadata/user/:userId

// // ROOT ROUTE - THIS IS THE KEY ONE!
// router.get('/', getMetadata);                             // → /api/metadata

// // GENERIC ROUTES LAST
// router.get('/:id', getMetadataById);                      // → /api/metadata/:id
// router.put('/:id', updateMetadata);                       // → /api/metadata/:id
// router.delete('/:id', deleteMetadata);                    // → /api/metadata/:id

// export default router;

import express from 'express';
import { 
    getMetadata, 
    getMetadataById, 
    updateMetadata, 
    deleteMetadata,
    searchMetadata
    // getUserVideoRelationships, // ❌ REMOVED: RLS handles user filtering
    // getMetadataByUser,         // ❌ REMOVED: RLS handles user filtering
    // getAllUsersWithVideos      // ❌ REMOVED: Admin-only function, use Service Key
} from '../controllers/metadata.controller.js';

const router = express.Router();

// Logging middleware
router.use((req, res, next) => {
    console.log(`🔍 Metadata Route: ${req.method} ${req.originalUrl}`);
    next();
});

// ============================================
// RLS-SECURE ROUTES (Mounted at /api/metadata)
// ============================================

// SPECIFIC ROUTE
router.get('/search', searchMetadata);                    // → /api/metadata/search

// ROOT ROUTE - THIS IS THE KEY ONE!
// 🔑 When a user hits this, RLS automatically filters the results to ONLY their videos.
router.get('/', getMetadata);                             // → /api/metadata

// GENERIC ROUTES LAST (RLS still applies here)
router.get('/:id', getMetadataById);                      // → /api/metadata/:id
router.put('/:id', updateMetadata);                       // → /api/metadata/:id
router.delete('/:id', deleteMetadata);                    // → /api/metadata/:id

export default router;