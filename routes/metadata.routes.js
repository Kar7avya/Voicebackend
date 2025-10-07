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

// Search routes (must come BEFORE parameterized routes to avoid conflicts)
router.get('/search', searchMetadata);

// User summary route (must come BEFORE /users/:userId to avoid conflicts)
router.get('/users/summary', getAllUsersWithVideos);

// Basic metadata routes
router.get('/', getMetadata);
router.get('/:id', getMetadataById);
router.put('/:id', updateMetadata);
router.delete('/:id', deleteMetadata);

// User-specific routes
router.get('/user/:userId', getMetadataByUser);
router.get('/users/:userId/videos', getUserVideoRelationships);

export default router;