// // supabaseClient.js
// import { createClient } from '@supabase/supabase-js';
// import dotenv from 'dotenv';

// dotenv.config();

// // Use REACT_APP_ keys so backend + frontend can share same .env
// const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
// const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// if (!supabaseUrl || !supabaseKey) {
//   console.error("❌ Supabase env variables are missing!");
//   console.error("URL:", supabaseUrl, "KEY:", supabaseKey ? "✅" : "❌");
//   process.exit(1);
// }

// // These lines are changed to show the actual values
// console.log("🔑 Supabase URL:", supabaseUrl);
// console.log("🔑 Supabase Key:", supabaseKey);

// const supabase = createClient(supabaseUrl, supabaseKey);

// export default supabase;


// supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables! Check .env file.');
}

// CRITICAL: Client initialized with the Anon Key for RLS enforcement
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  }
});

// Helper function to get current user
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    return null;
  }
};

// CRITICAL: Provides the JWT token for backend security checks
export const getAuthHeaders = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('No authentication token found');
    }
    
    return {
      'Authorization': `Bearer ${session.access_token}`
    };
  } catch (error) {
    console.error('Get auth headers error:', error);
    throw error;
  }
};

export default supabase;