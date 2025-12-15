
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { supabase, testSupabaseConnection } from '@/app/integrations/supabase/client';

export default function TestSupabaseScreen() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      addLog('🔍 Starting Supabase connection test...');
      
      // Test 1: Check if URL is available
      addLog(`✅ URL available: ${typeof URL !== 'undefined'}`);
      addLog(`✅ URLSearchParams available: ${typeof URLSearchParams !== 'undefined'}`);
      
      // Test 2: Check if Supabase client is initialized
      addLog('🔧 Checking Supabase client...');
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      addLog('✅ Supabase client is initialized');
      
      // Test 3: Test connection
      addLog('🌐 Testing database connection...');
      const result = await testSupabaseConnection();
      
      if (result.success) {
        addLog('✅ Database connection successful!');
        setStatus('success');
      } else {
        addLog(`❌ Database connection failed: ${result.error}`);
        setError(JSON.stringify(result.error, null, 2));
        setStatus('error');
      }
      
      // Test 4: Try to fetch a simple query
      addLog('📊 Fetching app settings...');
      const { data, error: settingsError } = await supabase
        .from('app_settings')
        .select('*')
        .limit(5);
      
      if (settingsError) {
        addLog(`⚠️ Settings query error: ${settingsError.message}`);
      } else {
        addLog(`✅ Settings query successful! Found ${data?.length || 0} settings`);
      }
      
    } catch (err: any) {
      addLog(`❌ Test failed: ${err.message}`);
      setError(err.message);
      setStatus('error');
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Test Supabase Connection',
          headerShown: true,
        }} 
      />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.header}>
            {status === 'loading' && (
              <>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.statusText}>Testing connection...</Text>
              </>
            )}
            {status === 'success' && (
              <>
                <Text style={styles.successIcon}>✅</Text>
                <Text style={styles.statusText}>Connection Successful!</Text>
              </>
            )}
            {status === 'error' && (
              <>
                <Text style={styles.errorIcon}>❌</Text>
                <Text style={styles.statusText}>Connection Failed</Text>
              </>
            )}
          </View>

          <View style={styles.logsContainer}>
            <Text style={styles.logsTitle}>Test Logs:</Text>
            {logs.map((log, index) => (
              <Text key={index} style={styles.logText}>
                {log}
              </Text>
            ))}
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Error Details:</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  successIcon: {
    fontSize: 48,
  },
  errorIcon: {
    fontSize: 48,
  },
  logsContainer: {
    padding: 16,
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  logText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: colors.textSecondary,
    marginBottom: 4,
    paddingVertical: 2,
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: colors.error + '15',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: colors.error,
  },
});
