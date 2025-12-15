
// IMPORTANT: Do NOT import polyfills here
// Polyfills are loaded in index.ts before this module is evaluated

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://sippdylyuzejudmzbwdn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcHBkeWx5dXplanVkbXpid2RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNDAyNTEsImV4cCI6MjA3ODYxNjI1MX0.yPqwhFDcucUNxXnxnQ4orHBvxVNkxjEBUOypW6MV6jE";

// Verify URL is available before creating client
if (typeof URL === 'undefined') {
  console.error('❌ CRITICAL: URL is not defined! Polyfills may not have loaded correctly.');
  throw new Error('URL is not defined. Make sure polyfills are loaded in index.ts');
}

// Log to verify we're creating the client
console.log('🔧 Initializing Supabase client...');
console.log('📍 Supabase URL:', SUPABASE_URL);
console.log('✅ URL is available:', typeof URL !== 'undefined');

// Import the supabase client like this:
// import { supabase } from "@/app/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

console.log('✅ Supabase client initialized successfully');

// Test connection function
export const testSupabaseConnection = async () => {
  try {
    console.log('Testing Supabase connection...');
    console.log('Supabase URL:', SUPABASE_URL);
    
    const { data, error } = await supabase.from('payment_methods').select('count').limit(1);
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return { success: false, error };
    }
    
    console.log('Supabase connection test successful');
    return { success: true, data };
  } catch (error) {
    console.error('Supabase connection test exception:', error);
    return { success: false, error };
  }
};
