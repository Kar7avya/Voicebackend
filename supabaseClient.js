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

// 🔑 FIXED: Returns auth object or NULL, no longer throws on unauthenticated state.
export const getAuthHeaders = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      // If no token, return null so calling function can handle unauthenticated state
      return null; 
    }
    
    return {
      'Authorization': `Bearer ${session.access_token}`
    };
  } catch (error) {
    console.error('Get auth headers error:', error);
    // If a critical error occurs (e.g., network), still return null.
    return null;
  }
};

export default supabase;