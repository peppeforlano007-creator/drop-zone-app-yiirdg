
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { supabase } from '@/app/integrations/supabase/client';
import { colors } from '@/styles/commonStyles';

export default function CookiePolicyScreen() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    loadCookiePolicy();
  }, []);

  const loadCookiePolicy = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('legal_documents')
        .select('content, updated_at')
        .eq('document_type', 'cookie_policy')
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error loading cookie policy:', error);
        Alert.alert('Errore', 'Impossibile caricare la Cookie Policy');
        return;
      }

      if (data) {
        setContent(data.content);
        setLastUpdated(new Date(data.updated_at).toLocaleDateString('it-IT'));
      } else {
        setContent('Cookie Policy non ancora configurata. Contatta l\'amministratore.');
      }
    } catch (error) {
      console.error('Exception loading cookie policy:', error);
      Alert.alert('Errore', 'Si è verificato un errore durante il caricamento');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Cookie Policy',
            headerBackTitle: 'Indietro',
          }}
        />
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Caricamento...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Cookie Policy',
          headerBackTitle: 'Indietro',
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          {lastUpdated && (
            <View style={styles.updateInfo}>
              <Text style={styles.updateText}>
                Ultimo aggiornamento: {lastUpdated}
              </Text>
            </View>
          )}
          
          <Text style={styles.content}>{content}</Text>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  updateInfo: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  updateText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  content: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 24,
  },
});
