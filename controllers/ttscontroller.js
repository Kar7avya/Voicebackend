const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const colabURL = () => {
    const url = process.env.COLAB_TTS_URL;
    if (!url) throw new Error("COLAB_TTS_URL not set in .env");
    return url.replace(/\/$/, "");
};

// ── GET /api/tts/status ──────────────────────────────
const getStatus = async (req, res) => {
    try {
        const response = await axios.get(`${colabURL()}/`, { timeout: 8000 });
        return res.json({ online: true, ...response.data });
    } catch {
        return res.json({ online: false });
    }
};

// ── GET /api/tts/voices ──────────────────────────────
const getVoices = async (req, res) => {
    try {
        const response = await axios.get(`${colabURL()}/voices`, { timeout: 10000 });
        return res.json(response.data);
    } catch (err) {
        return res.status(502).json({
            error: "Could not reach TTS server",
            detail: err.message
        });
    }
};

// ── POST /api/tts/generate ───────────────────────────
const generateAudio = async (req, res) => {
    const {
        text,
        voice_key = "hindi_male",
        mood = "neutral",
        save_history = true,
        user_id = null,
    } = req.body;

    // Validate
    if (!text || !text.trim())
        return res.status(400).json({ error: "text is required" });
    if (text.trim().length > 5000)
        return res.status(400).json({ error: "text exceeds 5000 characters" });

    try {
        // 1 — Call Colab to generate audio
        const colabRes = await axios.post(
            `${colabURL()}/generate`,
            { text, voice_key, mood },
            { timeout: 60000 }
        );

        if (!colabRes.data.success)
            return res.status(500).json({ error: "TTS generation failed" });

        const { filename, audio_url } = colabRes.data;

        // 2 — Download audio bytes from Colab
        const audioRes = await axios.get(`${colabURL()}${audio_url}`, {
            responseType: "arraybuffer",
            timeout: 30000,
        });

        const buffer = Buffer.from(audioRes.data);
        const contentType = audioRes.headers["content-type"];
        const ext = contentType.includes("wav") ? "wav" : "mp3";
        const storagePath = `${user_id || "anon"}/${Date.now()}.${ext}`;

        // 3 — Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from("tts-audio")
            .upload(storagePath, buffer, { contentType, upsert: false });

        if (uploadError)
            throw new Error(`Supabase upload failed: ${uploadError.message}`);

        // 4 — Get public URL
        const { data: urlData } = supabase.storage
            .from("tts-audio")
            .getPublicUrl(storagePath);

        const publicUrl = urlData.publicUrl;

        // 5 — Save to tts_history
        if (save_history) {
            await supabase.from("tts_history").insert([{
                user_id,
                text: text.substring(0, 500),
                voice_key,
                mood,
                audio_url: publicUrl,
                storage_path: storagePath,
                created_at: new Date().toISOString(),
            }]);
        }

        return res.json({
            success: true,
            audio_url: publicUrl,
            voice_key,
            mood,
            filename,
        });

    } catch (err) {
        console.error("Generate error:", err.message);
        return res.status(500).json({ error: err.message });
    }
};

// ── GET /api/tts/history ─────────────────────────────
const getHistory = async (req, res) => {
    const { user_id, limit = 20, offset = 0 } = req.query;

    let query = supabase
        .from("tts_history")
        .select("*")
        .order("created_at", { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (user_id) query = query.eq("user_id", user_id);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ history: data });
};

module.exports = { getStatus, getVoices, generateAudio, getHistory };