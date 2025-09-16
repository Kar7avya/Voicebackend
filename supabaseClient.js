// supabaseClient.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Use REACT_APP_ keys so backend + frontend can share same .env
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase env variables are missing!");
  console.error("URL:", supabaseUrl, "KEY:", supabaseKey ? "✅" : "❌");
  process.exit(1);
}

// These lines are changed to show the actual values
console.log("🔑 Supabase URL:", supabaseUrl);
console.log("🔑 Supabase Key:", supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
