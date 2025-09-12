<<<<<<< HEAD
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
=======
// supabaseClient.js

import { createClient } from '@supabase/supabase-js';

// No need to import or configure dotenv.
// Your build tool will handle these variables.
const supabaseUrl = process.env.process.env.SUPABASE_URL  

const supabaseKey = process.env.process.env.SUPABASE_ANON_KEY;

// No need for a server-side check (process.exit)
// The browser will log an error if keys are missing.
if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase environment variables are missing!");
}

// These lines are for debugging and can be removed in production
console.log("🔑 Supabase URL:", supabaseUrl);
console.log("🔑 Supabase Key:", supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;

>>>>>>> c4aa2c8363de7e2a26cb854e63f20d41a43c99a8
