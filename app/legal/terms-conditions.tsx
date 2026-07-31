
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
  useWindowDimensions,
} from 'react-native';
import { supabase } from '@/app/integrations/supabase/client';
import { colors } from '@/styles/commonStyles';
import RenderHtml from 'react-native-render-html';

function isHtmlContent(text: string): boolean {
  return (
    text.includes('<table') ||
    text.includes('<tr') ||
    text.includes('<td') ||
    text.includes('<p>') ||
    text.includes('<ul') ||
    text.includes('<ol') ||
    text.includes('<h1') ||
    text.includes('<h2') ||
    text.includes('<h3')
  );
}

export default function TermsConditionsScreen() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const { width } = useWindowDimensions();

  useEffect(() => {
    loadTermsConditions();
  }, []);

  const loadTermsConditions = async () => {
    try {
      console.log('[TermsConditions] Loading terms and conditions...');
      setLoading(true);
      
      const { data, error } = await supabase
        .from('legal_documents')
        .select('content, updated_at')
        .eq('document_type', 'terms_conditions')
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[TermsConditions] Error loading terms and conditions:', error);
        Alert.alert('Errore', 'Impossibile caricare i Termini e Condizioni');
        return;
      }

      if (data) {
        console.log('[TermsConditions] Loaded, isHtml:', isHtmlContent(data.content));
        setContent(data.content);
        setLastUpdated(new Date(data.updated_at).toLocaleDateString('it-IT'));
      } else {
        setContent('Termini e Condizioni non ancora configurati. Contatta l\'amministratore.');
      }
    } catch (error) {
      console.error('[TermsConditions] Exception loading terms and conditions:', error);
      Alert.alert('Errore', 'Si è verificato un errore durante il caricamento');
    } finally {
      setLoading(false);
    }
  };

  const contentIsHtml = isHtmlContent(content);

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Termini e Condizioni',
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
          title: 'Termini e Condizioni',
          headerBackTitle: 'Indietro',
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          {lastUpdated ? (
            <View style={styles.updateInfo}>
              <Text style={styles.updateText}>
                Ultimo aggiornamento: {lastUpdated}
              </Text>
            </View>
          ) : null}

          {contentIsHtml ? (
            <RenderHtml
              contentWidth={width - 40}
              source={{ html: content }}
              tagsStyles={{
                body: { color: colors.text, fontSize: 15, lineHeight: 24 },
                p: { color: colors.text, fontSize: 15, lineHeight: 24 },
                table: { borderWidth: 1, borderColor: colors.border, width: '100%' },
                td: { borderWidth: 1, borderColor: colors.border, padding: 8, color: colors.text, fontSize: 14 },
                th: { borderWidth: 1, borderColor: colors.border, padding: 8, fontWeight: '700', color: colors.text, fontSize: 14, backgroundColor: colors.backgroundSecondary },
                h1: { color: colors.text, fontSize: 20, fontWeight: '700' },
                h2: { color: colors.text, fontSize: 18, fontWeight: '700' },
                h3: { color: colors.text, fontSize: 16, fontWeight: '600' },
                li: { color: colors.text, fontSize: 15, lineHeight: 24 },
              }}
            />
          ) : (
            <Text style={styles.content}>{content}</Text>
          )}
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
