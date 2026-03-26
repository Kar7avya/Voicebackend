import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET  = "projectai";
const USER_ID = "guest";

// ── Save session ──────────────────────────────────────────────────
export const saveSession = async (req, res) => {
  try {
    const body = req.body;
    if (body.avg_score === undefined || body.avg_score === null) {
      return res.status(400).json({ success: false, error: "avg_score is required" });
    }

    console.log("📝 Saving session:", body.name || "Untitled");

    const { data, error } = await supabase
      .from("sessions")
      .insert([{
        user_id:          USER_ID,
        name:             body.name             || `Session ${new Date().toLocaleString()}`,
        created_at:       body.created_at       || new Date().toISOString(),
        duration_seconds: body.duration_seconds || 0,
        avg_score:        body.avg_score,
        max_score:        body.max_score        || 0,
        min_score:        body.min_score        || 0,
        start_score:      body.start_score      || 0,
        end_score:        body.end_score        || 0,
        good_percent:     body.good_percent     || 0,
        warn_percent:     body.warn_percent     || 0,
        bad_percent:      body.bad_percent      || 0,
        total_frames:     body.total_frames     || 0,
        open_palm_pct:    body.open_palm_pct    || 0,
        fist_pct:         body.fist_pct         || 0,
        pointing_pct:     body.pointing_pct     || 0,
        neutral_pct:      body.neutral_pct      || 0,
        rating:           body.rating,
        tips:             body.tips             || [],
        score_timeline:   body.score_timeline   || [],
      }])
      .select()
      .single();

    if (error) throw error;
    console.log("✅ Session saved:", data.id);

    // Upload full JSON to projectai bucket
    const bucketPath = `sessions/${USER_ID}/${data.id}.json`;
    const payload    = JSON.stringify(
      { ...body, supabase_id: data.id, uploaded_at: new Date().toISOString() },
      null, 2
    );
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(bucketPath, Buffer.from(payload), {
        contentType: "application/json",
        upsert: true,
      });

    if (uploadErr) console.warn("⚠️  Bucket upload warning:", uploadErr.message);
    else console.log("✅ Uploaded to bucket:", bucketPath);

    return res.status(201).json({ success: true, session: data, bucket_path: bucketPath });
  } catch (err) {
    console.error("❌ saveSession:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ── Get all sessions ──────────────────────────────────────────────
export const getSessions = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("user_id", USER_ID)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.json({ success: true, sessions: data, count: data.length });
  } catch (err) {
    console.error("❌ getSessions:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ── Get single session + metadata ─────────────────────────────────
export const getSessionById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("sessions").select("*").eq("id", id).single();

    if (error) {
      if (error.code === "PGRST116")
        return res.status(404).json({ success: false, error: "Session not found" });
      throw error;
    }

    // Fetch full timeline from bucket
    const { data: file, error: dlErr } = await supabase.storage
      .from(BUCKET).download(`sessions/${USER_ID}/${id}.json`);

    let metadata = null;
    if (!dlErr && file) {
      try { metadata = JSON.parse(await file.text()); } catch {}
    }

    return res.json({ success: true, session: data, metadata });
  } catch (err) {
    console.error("❌ getSessionById:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ── Get user stats ────────────────────────────────────────────────
export const getUserStats = async (req, res) => {
  try {
    const { data, error } = await supabase.rpc("get_user_stats", { p_user_id: USER_ID });
    if (error) throw error;
    return res.json({ success: true, stats: data });
  } catch (err) {
    // Fallback
    try {
      const { data: rows } = await supabase
        .from("sessions")
        .select("avg_score, duration_seconds, start_score, end_score")
        .eq("user_id", USER_ID);
      if (!rows?.length) return res.json({ success: true, stats: null });
      const stats = {
        total_sessions:  rows.length,
        overall_avg:     Math.round(rows.reduce((a, r) => a + r.avg_score, 0) / rows.length),
        best_score:      Math.max(...rows.map(r => r.avg_score)),
        total_minutes:   Math.round(rows.reduce((a, r) => a + (r.duration_seconds || 0), 0) / 60),
        avg_improvement: Math.round(rows.reduce((a, r) => a + ((r.end_score||0) - (r.start_score||0)), 0) / rows.length * 10) / 10,
      };
      return res.json({ success: true, stats });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }
};

// ── Delete session ────────────────────────────────────────────────
export const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from("sessions").delete().eq("id", id).eq("user_id", USER_ID);
    if (error) throw error;
    await supabase.storage.from(BUCKET).remove([`sessions/${USER_ID}/${id}.json`]);
    return res.json({ success: true, deleted_id: id });
  } catch (err) {
    console.error("❌ deleteSession:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};