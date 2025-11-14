
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface NotificationTemplate {
  id: string;
  title: string;
  message: string;
  icon: { ios: string; android: string };
}

export default function NotificationsScreen() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all' | 'consumers' | 'suppliers' | 'pickup_points'>('all');
  const [sending, setSending] = useState(false);

  const templates: NotificationTemplate[] = [
    {
      id: 'new_drop',
      title: 'Nuovo Drop Disponibile! 🎉',
      message: 'Un nuovo drop è stato attivato nella tua zona. Controlla ora per non perdere le migliori offerte!',
      icon: { ios: 'bolt.circle.fill', android: 'flash_on' },
    },
    {
      id: 'drop_ending',
      title: 'Drop in Scadenza ⏰',
      message: 'Il drop sta per terminare! Hai ancora poche ore per prenotare i tuoi prodotti preferiti.',
      icon: { ios: 'clock.badge.exclamationmark', android: 'schedule' },
    },
    {
      id: 'discount_increased',
      title: 'Sconto Aumentato! 💰',
      message: 'Lo sconto è aumentato! Prenota ora per ottenere un prezzo ancora migliore.',
      icon: { ios: 'arrow.up.circle.fill', android: 'trending_up' },
    },
    {
      id: 'order_ready',
      title: 'Ordine Pronto per il Ritiro 📦',
      message: 'Il tuo ordine è arrivato al punto di ritiro ed è pronto per essere ritirato!',
      icon: { ios: 'checkmark.circle.fill', android: 'check_circle' },
    },
    {
      id: 'payment_captured',
      title: 'Pagamento Confermato ✅',
      message: 'Il pagamento è stato elaborato con successo. Il tuo ordine è confermato!',
      icon: { ios: 'creditcard.fill', android: 'payment' },
    },
  ];

  const handleSelectTemplate = (template: NotificationTemplate) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTemplate(template.id);
    setTitle(template.title);
    setMessage(template.message);
  };

  const handleSendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Errore', 'Inserisci titolo e messaggio');
      return;
    }

    Alert.alert(
      'Invia Notifica',
      `Sei sicuro di voler inviare questa notifica a: ${getAudienceLabel(targetAudience)}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Invia',
          style: 'default',
          onPress: async () => {
            try {
              setSending(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

              // Get target users
              let query = supabase.from('profiles').select('user_id, email, full_name');
              
              if (targetAudience !== 'all') {
                query = query.eq('role', targetAudience === 'consumers' ? 'consumer' : targetAudience);
              }

              const { data: users, error } = await query;

              if (error) {
                console.error('Error fetching users:', error);
                Alert.alert('Errore', 'Impossibile recuperare gli utenti');
                return;
              }

              // In a real app, you would send push notifications here
              // For now, we'll just log the notification
              console.log('Sending notification to', users?.length, 'users');
              console.log('Title:', title);
              console.log('Message:', message);

              Alert.alert(
                'Notifica Inviata',
                `La notifica è stata inviata a ${users?.length || 0} utenti.`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      setTitle('');
                      setMessage('');
                      setSelectedTemplate(null);
                    },
                  },
                ]
              );
            } catch (error) {
              console.error('Error sending notification:', error);
              Alert.alert('Errore', 'Si è verificato un errore durante l\'invio');
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  const getAudienceLabel = (audience: string) => {
    switch (audience) {
      case 'all':
        return 'Tutti gli utenti';
      case 'consumers':
        return 'Consumatori';
      case 'suppliers':
        return 'Fornitori';
      case 'pickup_points':
        return 'Punti di Ritiro';
      default:
        return audience;
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Invia Notifiche',
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Template Predefiniti</Text>
            <Text style={styles.sectionDescription}>
              Seleziona un template o crea una notifica personalizzata
            </Text>
            {templates.map((template) => (
              <Pressable
                key={template.id}
                style={({ pressed }) => [
                  styles.templateCard,
                  selectedTemplate === template.id && styles.templateCardSelected,
                  pressed && styles.templateCardPressed,
                ]}
                onPress={() => handleSelectTemplate(template)}
              >
                <View style={styles.templateIcon}>
                  <IconSymbol
                    ios_icon_name={template.icon.ios}
                    android_material_icon_name={template.icon.android}
                    size={24}
                    color={selectedTemplate === template.id ? colors.primary : colors.textSecondary}
                  />
                </View>
                <View style={styles.templateContent}>
                  <Text style={styles.templateTitle}>{template.title}</Text>
                  <Text style={styles.templateMessage} numberOfLines={2}>
                    {template.message}
                  </Text>
                </View>
                {selectedTemplate === template.id && (
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check_circle"
                    size={24}
                    color={colors.primary}
                  />
                )}
              </Pressable>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Destinatari</Text>
            <View style={styles.audienceButtons}>
              {[
                { key: 'all', label: 'Tutti', icon: { ios: 'person.3.fill', android: 'group' } },
                { key: 'consumers', label: 'Consumatori', icon: { ios: 'person.fill', android: 'person' } },
                { key: 'suppliers', label: 'Fornitori', icon: { ios: 'building.2.fill', android: 'store' } },
                { key: 'pickup_points', label: 'Punti Ritiro', icon: { ios: 'mappin.circle.fill', android: 'location_on' } },
              ].map((audience) => (
                <Pressable
                  key={audience.key}
                  style={({ pressed }) => [
                    styles.audienceButton,
                    targetAudience === audience.key && styles.audienceButtonActive,
                    pressed && styles.audienceButtonPressed,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setTargetAudience(audience.key as any);
                  }}
                >
                  <IconSymbol
                    ios_icon_name={audience.icon.ios}
                    android_material_icon_name={audience.icon.android}
                    size={20}
                    color={targetAudience === audience.key ? '#fff' : colors.text}
                  />
                  <Text
                    style={[
                      styles.audienceButtonText,
                      targetAudience === audience.key && styles.audienceButtonTextActive,
                    ]}
                  >
                    {audience.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personalizza Notifica</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Titolo</Text>
              <TextInput
                style={styles.input}
                placeholder="Inserisci il titolo..."
                placeholderTextColor={colors.textTertiary}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
              <Text style={styles.charCount}>{title.length}/100</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Messaggio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Inserisci il messaggio..."
                placeholderTextColor={colors.textTertiary}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={4}
                maxLength={300}
              />
              <Text style={styles.charCount}>{message.length}/300</Text>
            </View>
          </View>

          <View style={styles.previewSection}>
            <Text style={styles.sectionTitle}>Anteprima</Text>
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <IconSymbol
                  ios_icon_name="app.badge.fill"
                  android_material_icon_name="notifications"
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.previewAppName}>Drop Social</Text>
                <Text style={styles.previewTime}>ora</Text>
              </View>
              <Text style={styles.previewTitle}>{title || 'Titolo notifica'}</Text>
              <Text style={styles.previewMessage}>{message || 'Messaggio notifica'}</Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              (!title.trim() || !message.trim() || sending) && styles.sendButtonDisabled,
              pressed && styles.sendButtonPressed,
            ]}
            onPress={handleSendNotification}
            disabled={!title.trim() || !message.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <IconSymbol
                  ios_icon_name="paperplane.fill"
                  android_material_icon_name="send"
                  size={20}
                  color="#fff"
                />
                <Text style={styles.sendButtonText}>Invia Notifica</Text>
              </>
            )}
          </Pressable>
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
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  templateCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  templateCardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  templateIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  templateContent: {
    flex: 1,
  },
  templateTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  templateMessage: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  audienceButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  audienceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  audienceButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  audienceButtonPressed: {
    opacity: 0.7,
  },
  audienceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  audienceButtonTextActive: {
    color: '#fff',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'right',
    marginTop: 4,
  },
  previewSection: {
    marginBottom: 24,
  },
  previewCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  previewAppName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  previewTime: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  previewMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
