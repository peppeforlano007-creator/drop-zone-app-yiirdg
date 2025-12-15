
// Supabase client initialization
// Polyfills are loaded via Metro's getModulesRunBeforeMainModule
// See metro.config.js for configuration

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://sippdylyuzejudmzbwdn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcHBkeWx5dXplanVkbXpid2RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNDAyNTEsImV4cCI6MjA3ODYxNjI1MX0.yPqwhFDcucUNxXnxnQ4orHBvxVNkxjEBUOypW6MV6jE";

// Lazy initialization to ensure polyfills are loaded
let supabaseInstance: SupabaseClient<Database> | null = null;

function initializeSupabase(): SupabaseClient<Database> {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // Verify URL is available
  if (typeof URL === 'undefined') {
    console.error('❌ CRITICAL: URL is not defined!');
    console.error('This means the polyfill did not load correctly.');
    console.error('Check metro.config.js and ensure polyfills are loaded first.');
    throw new Error('URL polyfill not loaded. Cannot initialize Supabase.');
  }

  console.log('🔧 Initializing Supabase client...');
  console.log('📍 URL:', SUPABASE_URL);
  console.log('✅ URL polyfill loaded:', typeof URL !== 'undefined');

  try {
    supabaseInstance = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
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
    return supabaseInstance;
  } catch (error) {
    console.error('❌ Failed to initialize Supabase client:', error);
    throw error;
  }
}

// Export a getter that lazily initializes the client
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(target, prop) {
    const client = initializeSupabase();
    return (client as any)[prop];
  },
});

// Test connection function
export const testSupabaseConnection = async () => {
  try {
    console.log('Testing Supabase connection...');
    const client = initializeSupabase();
    
    const { data, error } = await client.from('payment_methods').select('count').limit(1);
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return { success: false, error };
    }
    
    console.log('✅ Supabase connection test successful');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Supabase connection test exception:', error);
    return { success: false, error };
  }
};
