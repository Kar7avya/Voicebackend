import express from "express";
import {
    saveSession,
    getSessions,
    getSessionById,
    getUserStats,
    deleteSession,
} from "../controllers/Speakwell.controller.js";

const router = express.Router();

// POST   /api/speakwell/sessions     → save session (SQL + bucket)
// GET    /api/speakwell/sessions     → get all sessions
// GET    /api/speakwell/sessions/:id → single session + bucket metadata
// GET    /api/speakwell/stats        → aggregate stats (RPC)
// DELETE /api/speakwell/sessions/:id → delete session + bucket file

router.post("/sessions", saveSession);
router.get("/sessions", getSessions);
router.get("/sessions/:id", getSessionById);
router.get("/stats", getUserStats);
router.delete("/sessions/:id", deleteSession);

export default router;