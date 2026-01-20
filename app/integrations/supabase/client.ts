
// Supabase client initialization
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from './types';

// Double-check polyfills are loaded (should already be loaded by index.ts)
if (typeof URL === 'undefined') {
  console.error('❌ CRITICAL: URL not available in client.ts!');
  // Try to load it one more time as a last resort
  require('react-native-url-polyfill/auto');
  
  if (typeof URL === 'undefined') {
    throw new Error(
      '❌ CRITICAL ERROR: URL polyfill failed to load!\n\n' +
      'The react-native-url-polyfill could not be loaded.\n\n' +
      'Steps to fix:\n' +
      '1. Stop the dev server (Ctrl+C)\n' +
      '2. Clear cache: npm start -- --clear\n' +
      '3. If that doesn\'t work, delete node_modules and reinstall:\n' +
      '   rm -rf node_modules\n' +
      '   npm install\n' +
      '4. Restart: npm start -- --clear'
    );
  }
}

console.log('✅ [client.ts] URL polyfill verified');

// Now it's safe to import Supabase
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://sippdylyuzejudmzbwdn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcHBkeWx5dXplanVkbXpid2RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNDAyNTEsImV4cCI6MjA3ODYxNjI1MX0.yPqwhFDcucUNxXnxnQ4orHBvxVNkxjEBUOypW6MV6jE";

console.log('🔧 [client.ts] Creating Supabase client...');

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

console.log('✅ [client.ts] Supabase client created successfully');

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
