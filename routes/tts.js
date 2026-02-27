const express = require("express");
const router = express.Router();
const {
    getStatus,
    getVoices,
    generateAudio,
    getHistory,
} = require("../controllers/ttsController");

router.get("/status", getStatus);
router.get("/voices", getVoices);
router.post("/generate", generateAudio);
router.get("/history", getHistory);

module.exports = router;