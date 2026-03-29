import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET  = "projectai";
const USER_ID = "guest";

// ── Save session (basic + deep analysis) ─────────────────────────
export const saveSession = async (req, res) => {
  try {
    const body = req.body;

    if (body.avg_score === undefined) {
      return res.status(400).json({ success:false, error:"avg_score required" });
    }

    // SQL INSERT — stores all metrics including deep analysis
    const { data, error } = await supabase
      .from("sessions")
      .insert([{
        user_id:          USER_ID,
        name:             body.name             || `Session ${new Date().toLocaleString()}`,
        created_at:       body.created_at       || new Date().toISOString(),
        duration_seconds: body.duration_seconds || 0,
        avg_score:        body.avg_score,
        max_score:        body.max_score        || 0,
        good_percent:     body.good_percent     || 0,
        warn_percent:     body.warn_percent     || 0,
        bad_percent:      body.bad_percent      || 0,
        total_frames:     body.total_frames     || 0,
        rating:           body.rating           || "Unknown",
        tips:             body.tips             || [],
        score_timeline:   body.score_timeline   || [],
        // Deep analysis fields
        deep_analysis:    body.deep_analysis    || null,
      }])
      .select()
      .single();

    if (error) throw error;

    // Upload FULL session JSON to projectai bucket
    const path    = `sessions/${USER_ID}/${data.id}.json`;
    const payload = JSON.stringify({
      ...body,
      supabase_id:  data.id,
      uploaded_at:  new Date().toISOString(),
    }, null, 2);

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, Buffer.from(payload), {
        contentType: "application/json",
        upsert: true,
      });

    if (uploadErr) console.warn("⚠️ Bucket upload:", uploadErr.message);
    else console.log("✅ Saved to bucket:", path);

    return res.status(201).json({ success:true, session:data, bucket_path:path });

  } catch (err) {
    console.error("❌ saveSession:", err.message);
    return res.status(500).json({ success:false, error:err.message });
  }
};

// ── Get all sessions ──────────────────────────────────────────────
export const getSessions = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("sessions")
      .select("id,name,created_at,duration_seconds,avg_score,max_score,good_percent,warn_percent,bad_percent,total_frames,rating,tips,deep_analysis")
      .eq("user_id", USER_ID)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.json({ success:true, sessions:data, count:data.length });
  } catch (err) {
    return res.status(500).json({ success:false, error:err.message });
  }
};

// ── Get single session + full metadata from bucket ────────────────
export const getSessionById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("sessions").select("*").eq("id", id).single();
    if (error) throw error;

    // Download full JSON from bucket
    const { data: file } = await supabase.storage
      .from(BUCKET).download(`sessions/${USER_ID}/${id}.json`);
    let metadata = null;
    if (file) { try { metadata = JSON.parse(await file.text()); } catch {} }

    return res.json({ success:true, session:data, metadata });
  } catch (err) {
    return res.status(500).json({ success:false, error:err.message });
  }
};

// ── Get stats ─────────────────────────────────────────────────────
export const getUserStats = async (req, res) => {
  try {
    const { data, error } = await supabase.rpc("get_user_stats", { p_user_id: USER_ID });
    if (error) throw error;
    return res.json({ success:true, stats:data });
  } catch (err) {
    // fallback
    try {
      const { data: rows } = await supabase
        .from("sessions").select("avg_score,duration_seconds").eq("user_id", USER_ID);
      const r = rows || [];
      if (!r.length) return res.json({ success:true, stats:null });
      return res.json({ success:true, stats:{
        total_sessions: r.length,
        overall_avg:    Math.round(r.reduce((a,x)=>a+x.avg_score,0)/r.length),
        best_score:     Math.max(...r.map(x=>x.avg_score)),
        total_minutes:  Math.round(r.reduce((a,x)=>a+(x.duration_seconds||0),0)/60),
      }});
    } catch(e2) {
      return res.status(500).json({ success:false, error:e2.message });
    }
  }
};

// ── Delete session ────────────────────────────────────────────────
export const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from("sessions")
      .delete().eq("id", id).eq("user_id", USER_ID);
    if (error) throw error;
    await supabase.storage.from(BUCKET).remove([`sessions/${USER_ID}/${id}.json`]);
    return res.json({ success:true });
  } catch (err) {
    return res.status(500).json({ success:false, error:err.message });
  }
};