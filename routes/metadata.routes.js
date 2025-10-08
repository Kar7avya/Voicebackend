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

// CRITICAL: Specific routes FIRST, generic routes LAST
router.get('/search', searchMetadata);
router.get('/users/summary', getAllUsersWithVideos);
router.get('/users/:userId/videos', getUserVideoRelationships);
router.get('/user/:userId', getMetadataByUser);
router.get('/', getMetadata);
router.get('/:id', getMetadataById);
router.put('/:id', updateMetadata);
router.delete('/:id', deleteMetadata);

export default router;