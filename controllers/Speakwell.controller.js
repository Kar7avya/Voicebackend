import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = "projectai";
const USER_ID = "guest"; // replace with req.user.id when you add auth

// ================================================================
// SAVE SESSION
// POST /api/speakwell/sessions
// 1. SQL INSERT into sessions table
// 2. Upload full JSON to projectai bucket
// ================================================================
export const saveSession = async (req, res) => {
    try {
        const body = req.body;

        // Validate required fields
        if (body.avg_score === undefined || body.avg_score === null) {
            return res.status(400).json({ success: false, error: "avg_score is required" });
        }

        console.log("📝 Saving session:", body.name || "Untitled");

        // ── SQL INSERT ──────────────────────────────────────────────
        const { data, error } = await supabase
            .from("sessions")
            .insert([{
                user_id: USER_ID,
                name: body.name || `Session ${new Date().toLocaleString()}`,
                created_at: body.created_at || new Date().toISOString(),
                duration_seconds: body.duration_seconds || 0,
                avg_score: body.avg_score,
                max_score: body.max_score || 0,
                good_percent: body.good_percent || 0,
                warn_percent: body.warn_percent || 0,
                bad_percent: body.bad_percent || 0,
                total_frames: body.total_frames || 0,
                rating: body.rating || "Unknown",
                tips: body.tips || [],
                score_timeline: body.score_timeline || [],
            }])
            .select()
            .single();

        if (error) {
            console.error("❌ Supabase insert error:", error.message);
            throw error;
        }

        console.log("✅ Session saved to DB:", data.id);

        // ── Upload JSON to projectai bucket ─────────────────────────
        const bucketPath = `sessions/${USER_ID}/${data.id}.json`;
        const payload = JSON.stringify(
            { ...body, supabase_id: data.id, uploaded_at: new Date().toISOString() },
            null, 2
        );

        const { error: uploadErr } = await supabase.storage
            .from(BUCKET)
            .upload(bucketPath, Buffer.from(payload), {
                contentType: "application/json",
                upsert: true,
            });

        if (uploadErr) {
            console.warn("⚠️  Bucket upload warning (session still saved):", uploadErr.message);
        } else {
            console.log("✅ Uploaded to bucket:", bucketPath);
        }

        return res.status(201).json({
            success: true,
            session: data,
            bucket_path: bucketPath,
        });

    } catch (err) {
        console.error("❌ saveSession error:", err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
};

// ================================================================
// GET ALL SESSIONS
// GET /api/speakwell/sessions
// SQL: SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC
// ================================================================
export const getSessions = async (req, res) => {
    try {
        console.log("📋 Fetching sessions for user:", USER_ID);

        const { data, error } = await supabase
            .from("sessions")
            .select("*")
            .eq("user_id", USER_ID)
            .order("created_at", { ascending: false });

        if (error) throw error;

        console.log(`✅ Found ${data.length} sessions`);
        return res.json({ success: true, sessions: data, count: data.length });

    } catch (err) {
        console.error("❌ getSessions error:", err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
};

// ================================================================
// GET SINGLE SESSION + METADATA FROM BUCKET
// GET /api/speakwell/sessions/:id
// SQL: SELECT * FROM sessions WHERE id = ?
// Then downloads full JSON from projectai bucket
// ================================================================
export const getSessionById = async (req, res) => {
    try {
        const { id } = req.params;
        console.log("🔍 Fetching session:", id);

        // ── SQL SELECT ──────────────────────────────────────────────
        const { data, error } = await supabase
            .from("sessions")
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                return res.status(404).json({ success: false, error: "Session not found" });
            }
            throw error;
        }

        // ── Download full JSON from projectai bucket ────────────────
        const bucketPath = `sessions/${USER_ID}/${id}.json`;
        const { data: file, error: dlErr } = await supabase.storage
            .from(BUCKET)
            .download(bucketPath);

        let metadata = null;
        if (!dlErr && file) {
            try {
                metadata = JSON.parse(await file.text());
                console.log("✅ Metadata fetched from bucket");
            } catch {
                console.warn("⚠️  Could not parse bucket JSON");
            }
        } else if (dlErr) {
            console.warn("⚠️  Bucket fetch warning:", dlErr.message);
        }

        return res.json({
            success: true,
            session: data,
            metadata: metadata,         // full score_timeline lives here
            bucket_path: bucketPath,
        });

    } catch (err) {
        console.error("❌ getSessionById error:", err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
};

// ================================================================
// GET USER STATS
// GET /api/speakwell/stats
// Calls SQL RPC: get_user_stats(p_user_id)
// Returns: total_sessions, overall_avg, best_score, total_minutes
// ================================================================
export const getUserStats = async (req, res) => {
    try {
        console.log("📊 Fetching stats for user:", USER_ID);

        // ── Try RPC first ───────────────────────────────────────────
        const { data, error } = await supabase.rpc("get_user_stats", {
            p_user_id: USER_ID,
        });

        if (error) {
            console.warn("⚠️  RPC failed, falling back to manual query:", error.message);

            // ── Fallback: compute manually ──────────────────────────
            const { data: rows, error: rowErr } = await supabase
                .from("sessions")
                .select("avg_score, duration_seconds")
                .eq("user_id", USER_ID);

            if (rowErr) throw rowErr;

            if (!rows.length) {
                return res.json({ success: true, stats: null });
            }

            const stats = {
                total_sessions: rows.length,
                overall_avg: Math.round(rows.reduce((a, r) => a + r.avg_score, 0) / rows.length),
                best_score: Math.max(...rows.map((r) => r.avg_score)),
                total_minutes: Math.round(rows.reduce((a, r) => a + (r.duration_seconds || 0), 0) / 60),
            };

            console.log("✅ Stats computed (fallback):", stats);
            return res.json({ success: true, stats });
        }

        console.log("✅ Stats from RPC:", data);
        return res.json({ success: true, stats: data });

    } catch (err) {
        console.error("❌ getUserStats error:", err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
};

// ================================================================
// DELETE SESSION
// DELETE /api/speakwell/sessions/:id
// SQL: DELETE FROM sessions WHERE id = ? AND user_id = ?
// Also removes file from projectai bucket
// ================================================================
export const deleteSession = async (req, res) => {
    try {
        const { id } = req.params;
        console.log("🗑️  Deleting session:", id);

        // ── SQL DELETE ──────────────────────────────────────────────
        const { error } = await supabase
            .from("sessions")
            .delete()
            .eq("id", id)
            .eq("user_id", USER_ID);

        if (error) throw error;
        console.log("✅ Deleted from DB:", id);

        // ── Delete from projectai bucket ────────────────────────────
        const bucketPath = `sessions/${USER_ID}/${id}.json`;
        const { error: removeErr } = await supabase.storage
            .from(BUCKET)
            .remove([bucketPath]);

        if (removeErr) {
            console.warn("⚠️  Bucket delete warning:", removeErr.message);
        } else {
            console.log("✅ Deleted from bucket:", bucketPath);
        }

        return res.json({ success: true, deleted_id: id });

    } catch (err) {
        console.error("❌ deleteSession error:", err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
};