
// Supabase client initialization with inline polyfill loading
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from './types';

// CRITICAL: Ensure polyfills are loaded before importing Supabase
// If URL is not defined, load the polyfill synchronously
if (typeof URL === 'undefined') {
  console.log('⚠️ URL not defined, loading polyfill inline...');
  // Load the polyfill synchronously
  require('react-native-url-polyfill/auto');
  
  // Verify it loaded
  if (typeof URL === 'undefined') {
    throw new Error(
      '❌ CRITICAL ERROR: URL polyfill failed to load!\n\n' +
      'The react-native-url-polyfill could not be loaded.\n\n' +
      'If you see this error:\n' +
      '1. Stop the dev server\n' +
      '2. Clear cache: npm start -- --clear\n' +
      '3. Delete node_modules and run: npm install\n' +
      '4. Restart the dev server'
    );
  }
  
  console.log('✅ Polyfill loaded inline successfully');
}

console.log('✅ URL polyfill verified, importing Supabase...');

// Now it's safe to import Supabase
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://sippdylyuzejudmzbwdn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcHBkeWx5dXplanVkbXpid2RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNDAyNTEsImV4cCI6MjA3ODYxNjI1MX0.yPqwhFDcucUNxXnxnQ4orHBvxVNkxjEBUOypW6MV6jE";

console.log('🔧 Creating Supabase client...');
console.log('📍 URL:', SUPABASE_URL);

// Create the Supabase client
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

console.log('✅ Supabase client created successfully');

// Test connection function
export const testSupabaseConnection = async () => {
  try {
    console.log('Testing Supabase connection...');
    
    const { data, error } = await supabase.from('payment_methods').select('count').limit(1);
    
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
