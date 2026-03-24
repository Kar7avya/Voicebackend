import express from "express";
import axios from "axios";

const router = express.Router();

// Your Colab ngrok URL
const TTS_API = "https://inaudible-unwatchfully-pandora.ngrok-free.dev";

// GET /api/tts/voices
router.get("/voices", async (req, res) => {
    try {
        const response = await axios.get(TTS_API + "/voices", {
            headers: { "ngrok-skip-browser-warning": "true" }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({
            error: "Failed to get voices",
            detail: error.message
        });
    }
});

// POST /api/tts/generate
router.post("/generate", async (req, res) => {
    try {
        const { text, voice_key, mood } = req.body;

        if (!text) {
            return res.status(400).json({ error: "Text is required" });
        }

        const response = await axios.post(
            TTS_API + "/generate",
            {
                text: text,
                voice_key: voice_key || "hindi_male",
                mood: mood || "neutral"
            },
            {
                headers: {
                    "ngrok-skip-browser-warning": "true",
                    "Content-Type": "application/json"
                }
            }
        );

        const data = response.data;
        const audioUrl = TTS_API + "/audio/" + data.filename;

        res.json({
            success: true,
            audio_url: audioUrl,
            filename: data.filename,
            voice_key: voice_key,
            mood: mood
        });

    } catch (error) {
        res.status(500).json({
            error: "TTS generation failed",
            detail: error.message
        });
    }
});

export default router;  // ✅ This is what was missing