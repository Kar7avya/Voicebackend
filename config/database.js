// // 📋 config/database.js - DATABASE CONNECTION MANAGER
// // Think of this as your company's filing cabinet and storage system manager

// import { createClient } from "@supabase/supabase-js";
// import pgp from 'pg-promise';

// // 🗄️ Connect to PostgreSQL database (like connecting to a filing cabinet)
// const pg = pgp({});
// const db = pg(process.env.DATABASE_URL);

// // ☁️ Connect to Supabase (like connecting to cloud storage)
// const supabase = createClient(
//     process.env.REACT_APP_SUPABASE_URL,      // Where is the cloud storage?
//     process.env.REACT_APP_SUPABASE_ANON_KEY  // What's the access key?
// );

// // Test the connections when this file loads
// console.log("📋 Database connections initialized:");
// console.log("   🗄️ PostgreSQL: Ready");
// console.log("   ☁️ Supabase: Ready");

// // 📤 Export so other departments can use these connections
// export { db, supabase };

// /*
// HOW OTHER FILES USE THIS:
// import { supabase } from '../config/database.js';
// // Now they can save/get data: supabase.from('table').select('*')
// */

// config/database.js
// config/database.js
import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';

// Make sure environment variables are loaded
dotenv.config();

// Debug: Check if environment variables are loaded
// Try both SUPABASE_URL and REACT_APP_SUPABASE_URL for compatibility
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log("Environment check:");
console.log("SUPABASE_URL:", SUPABASE_URL ? "✅ Found" : "❌ Missing");
console.log("SUPABASE_ANON_KEY:", SUPABASE_ANON_KEY ? "✅ Found" : "❌ Missing");
console.log("SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ Found" : "❌ Missing");

// Only create Supabase client if variables exist
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Missing Supabase environment variables in .env file. Please set SUPABASE_URL and SUPABASE_ANON_KEY (or REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY)");
}

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

console.log("Database connection initialized: Supabase ready");

export { supabase };