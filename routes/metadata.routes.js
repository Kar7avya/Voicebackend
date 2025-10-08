// ============================================
// metadata.routes.js - FOR app.use("/api", routes)
// ============================================

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

// Logging middleware
router.use((req, res, next) => {
    console.log(`🔍 Metadata Route: ${req.method} ${req.originalUrl}`);
    next();
});

// ============================================
// ALL ROUTES MUST START WITH /metadata
// Because server has: app.use("/api", metadataRoutes)
// ============================================

// SPECIFIC ROUTES FIRST (with /metadata prefix)
router.get('/metadata/search', searchMetadata);
router.get('/metadata/users/summary', getAllUsersWithVideos);
router.get('/metadata/users/:userId/videos', getUserVideoRelationships);
router.get('/metadata/user/:userId', getMetadataByUser);

// ROOT METADATA ROUTE
router.get('/metadata', getMetadata);  // GET /api/metadata

// GENERIC ROUTES LAST (with /metadata prefix)
router.get('/metadata/:id', getMetadataById);    // GET /api/metadata/:id
router.put('/metadata/:id', updateMetadata);     // PUT /api/metadata/:id
router.delete('/metadata/:id', deleteMetadata);  // DELETE /api/metadata/:id

export default router;


// ============================================
// ROUTE MAPPING EXAMPLES:
// ============================================
// With app.use("/api", metadataRoutes):
//
// Frontend calls:                    →  Backend route:
// GET /api/metadata                  →  router.get('/metadata', ...)
// GET /api/metadata/search           →  router.get('/metadata/search', ...)
// GET /api/metadata/user/123         →  router.get('/metadata/user/:userId', ...)
// GET /api/metadata/uuid-here        →  router.get('/metadata/:id', ...)
// ============================================