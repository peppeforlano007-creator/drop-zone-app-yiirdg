
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface NotificationFlow {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  target_audience: string;
  filter_config: any;
  notification_title: string;
  notification_message: string;
  is_active: boolean;
  created_at: string;
}

interface PickupPoint {
  id: string;
  name: string;
  city: string;
}

export default function ManageNotificationsScreen() {
  const [flows, setFlows] = useState<NotificationFlow[]>([]);
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showMassNotification, setShowMassNotification] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTriggerType, setFormTriggerType] = useState('drop_activated');
  const [formTargetAudience, setFormTargetAudience] = useState('consumers');
  const [formTitle, setFormTitle] = useState('');
  const [formMessage, setFormMessage] = useState('');

  // Mass notification states
  const [massTitle, setMassTitle] = useState('');
  const [massMessage, setMassMessage] = useState('');
  const [massAudience, setMassAudience] = useState<'all' | 'pickup_points' | 'users'>('all');
  const [selectedPickupPoint, setSelectedPickupPoint] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadFlows();
    loadPickupPoints();
  }, []);

  const loadFlows = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notification_flows')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFlows(data || []);
    } catch (error) {
      console.error('Error loading flows:', error);
      Alert.alert('Errore', 'Impossibile caricare i flussi di notifica');
    } finally {
      setLoading(false);
    }
  };

  const loadPickupPoints = async () => {
    try {
      const { data, error } = await supabase
        .from('pickup_points')
        .select('id, name, city')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setPickupPoints(data || []);
    } catch (error) {
      console.error('Error loading pickup points:', error);
    }
  };

  const handleToggleFlow = async (flowId: string, currentStatus: boolean) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const { error } = await supabase
        .from('notification_flows')
        .update({ is_active: !currentStatus })
        .eq('id', flowId);

      if (error) throw error;

      setFlows(flows.map(f => f.id === flowId ? { ...f, is_active: !currentStatus } : f));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error toggling flow:', error);
      Alert.alert('Errore', 'Impossibile aggiornare il flusso');
    }
  };

  const handleDeleteFlow = async (flowId: string, flowName: string) => {
    Alert.alert(
      'Elimina Flusso',
      `Sei sicuro di voler eliminare il flusso "${flowName}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              const { error } = await supabase
                .from('notification_flows')
                .delete()
                .eq('id', flowId);

              if (error) throw error;

              setFlows(flows.filter(f => f.id !== flowId));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Successo', 'Flusso eliminato con successo');
            } catch (error) {
              console.error('Error deleting flow:', error);
              Alert.alert('Errore', 'Impossibile eliminare il flusso');
            }
          },
        },
      ]
    );
  };

  const handleCreateFlow = async () => {
    if (!formName.trim() || !formTitle.trim() || !formMessage.trim()) {
      Alert.alert('Errore', 'Compila tutti i campi obbligatori');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const { error } = await supabase
        .from('notification_flows')
        .insert({
          name: formName,
          description: formDescription,
          trigger_type: formTriggerType,
          target_audience: formTargetAudience,
          notification_title: formTitle,
          notification_message: formMessage,
        });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Successo', 'Flusso creato con successo');
      setShowCreateForm(false);
      resetForm();
      loadFlows();
    } catch (error) {
      console.error('Error creating flow:', error);
      Alert.alert('Errore', 'Impossibile creare il flusso');
    }
  };

  const handleSendMassNotification = async () => {
    if (!massTitle.trim() || !massMessage.trim()) {
      Alert.alert('Errore', 'Inserisci titolo e messaggio');
      return;
    }

    if (massAudience === 'pickup_points' && !selectedPickupPoint) {
      Alert.alert('Errore', 'Seleziona un punto di ritiro');
      return;
    }

    const audienceLabel = 
      massAudience === 'all' ? 'Tutti gli utenti' :
      massAudience === 'pickup_points' ? `Utenti del punto di ritiro selezionato` :
      'Tutti gli utenti consumer';

    Alert.alert(
      'Invia Notifica Massiva',
      `Sei sicuro di voler inviare questa notifica a: ${audienceLabel}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Invia',
          onPress: async () => {
            try {
              setSending(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

              let query = supabase.from('profiles').select('user_id, email, full_name, role, pickup_point_id');

              if (massAudience === 'users') {
                query = query.eq('role', 'consumer');
              } else if (massAudience === 'pickup_points' && selectedPickupPoint) {
                query = query.eq('pickup_point_id', selectedPickupPoint).eq('role', 'consumer');
              }

              const { data: users, error: usersError } = await query;

              if (usersError) throw usersError;

              if (!users || users.length === 0) {
                Alert.alert('Attenzione', 'Nessun utente trovato per questa categoria');
                return;
              }

              const notifications = users.map(user => ({
                user_id: user.user_id,
                title: massTitle,
                message: massMessage,
                type: 'general' as const,
                read: false,
              }));

              const { error: notifError } = await supabase
                .from('notifications')
                .insert(notifications);

              if (notifError) throw notifError;

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(
                'Notifica Inviata',
                `La notifica è stata inviata a ${users.length} utenti.`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      setMassTitle('');
                      setMassMessage('');
                      setMassAudience('all');
                      setSelectedPickupPoint(null);
                      setShowMassNotification(false);
                    },
                  },
                ]
              );
            } catch (error) {
              console.error('Error sending mass notification:', error);
              Alert.alert('Errore', 'Impossibile inviare la notifica');
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormTriggerType('drop_activated');
    setFormTargetAudience('consumers');
    setFormTitle('');
    setFormMessage('');
  };

  const getTriggerTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      drop_activated: 'Drop Attivato',
      drop_ending_soon: 'Drop in Scadenza',
      drop_completed: 'Drop Completato',
      order_ready: 'Ordine Pronto',
      order_shipped: 'Ordine Spedito',
      payment_captured: 'Pagamento Confermato',
      discount_increased: 'Sconto Aumentato',
      new_product_added: 'Nuovo Prodotto',
    };
    return labels[type] || type;
  };

  const getAudienceLabel = (audience: string) => {
    const labels: Record<string, string> = {
      all: 'Tutti',
      consumers: 'Consumatori',
      suppliers: 'Fornitori',
      pickup_points: 'Punti di Ritiro',
    };
    return labels[audience] || audience;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ title: 'Gestisci Notifiche' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ title: 'Gestisci Notifiche' }} />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header Actions */}
        <View style={styles.headerActions}>
          <Pressable
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => setShowMassNotification(!showMassNotification)}
          >
            <IconSymbol ios_icon_name="paperplane.fill" android_material_icon_name="send" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Notifica Massiva</Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => setShowCreateForm(!showCreateForm)}
          >
            <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={20} color={colors.text} />
            <Text style={styles.secondaryButtonText}>Nuovo Flusso</Text>
          </Pressable>
        </View>

        {/* Mass Notification Form */}
        {showMassNotification && (
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <IconSymbol ios_icon_name="megaphone.fill" android_material_icon_name="campaign" size={24} color={colors.primary} />
              <Text style={styles.formTitle}>Invia Notifica Massiva</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Titolo *</Text>
              <TextInput
                style={styles.input}
                placeholder="Inserisci il titolo..."
                placeholderTextColor={colors.textTertiary}
                value={massTitle}
                onChangeText={setMassTitle}
                maxLength={100}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Messaggio *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Inserisci il messaggio..."
                placeholderTextColor={colors.textTertiary}
                value={massMessage}
                onChangeText={setMassMessage}
                multiline
                numberOfLines={4}
                maxLength={300}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Destinatari *</Text>
              <View style={styles.audienceButtons}>
                {[
                  { key: 'all', label: 'Tutti', icon: { ios: 'person.3.fill', android: 'group' } },
                  { key: 'users', label: 'Solo Utenti', icon: { ios: 'person.fill', android: 'person' } },
                  { key: 'pickup_points', label: 'Per Punto Ritiro', icon: { ios: 'mappin.circle.fill', android: 'location_on' } },
                ].map((audience) => (
                  <Pressable
                    key={audience.key}
                    style={[
                      styles.audienceButton,
                      massAudience === audience.key && styles.audienceButtonActive,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setMassAudience(audience.key as any);
                      if (audience.key !== 'pickup_points') {
                        setSelectedPickupPoint(null);
                      }
                    }}
                  >
                    <IconSymbol
                      ios_icon_name={audience.icon.ios}
                      android_material_icon_name={audience.icon.android}
                      size={18}
                      color={massAudience === audience.key ? '#FFF' : colors.text}
                    />
                    <Text
                      style={[
                        styles.audienceButtonText,
                        massAudience === audience.key && styles.audienceButtonTextActive,
                      ]}
                    >
                      {audience.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {massAudience === 'pickup_points' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Punto di Ritiro *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickupPointsScroll}>
                  {pickupPoints.map((pp) => (
                    <Pressable
                      key={pp.id}
                      style={[
                        styles.pickupPointChip,
                        selectedPickupPoint === pp.id && styles.pickupPointChipActive,
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedPickupPoint(pp.id);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickupPointChipText,
                          selectedPickupPoint === pp.id && styles.pickupPointChipTextActive,
                        ]}
                      >
                        {pp.name} - {pp.city}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.formActions}>
              <Pressable
                style={[styles.formButton, styles.cancelButton]}
                onPress={() => {
                  setShowMassNotification(false);
                  setMassTitle('');
                  setMassMessage('');
                  setMassAudience('all');
                  setSelectedPickupPoint(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Annulla</Text>
              </Pressable>

              <Pressable
                style={[styles.formButton, styles.submitButton, sending && styles.submitButtonDisabled]}
                onPress={handleSendMassNotification}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Invia</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* Create Flow Form */}
        {showCreateForm && (
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={24} color={colors.primary} />
              <Text style={styles.formTitle}>Crea Nuovo Flusso</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome Flusso *</Text>
              <TextInput
                style={styles.input}
                placeholder="es. Notifica Drop Attivato"
                placeholderTextColor={colors.textTertiary}
                value={formName}
                onChangeText={setFormName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Descrizione</Text>
              <TextInput
                style={styles.input}
                placeholder="Descrizione del flusso..."
                placeholderTextColor={colors.textTertiary}
                value={formDescription}
                onChangeText={setFormDescription}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tipo Trigger *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.triggerScroll}>
                {[
                  'drop_activated',
                  'drop_ending_soon',
                  'drop_completed',
                  'order_ready',
                  'discount_increased',
                ].map((trigger) => (
                  <Pressable
                    key={trigger}
                    style={[
                      styles.triggerChip,
                      formTriggerType === trigger && styles.triggerChipActive,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setFormTriggerType(trigger);
                    }}
                  >
                    <Text
                      style={[
                        styles.triggerChipText,
                        formTriggerType === trigger && styles.triggerChipTextActive,
                      ]}
                    >
                      {getTriggerTypeLabel(trigger)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Destinatari *</Text>
              <View style={styles.audienceButtons}>
                {['all', 'consumers', 'suppliers', 'pickup_points'].map((audience) => (
                  <Pressable
                    key={audience}
                    style={[
                      styles.audienceButton,
                      formTargetAudience === audience && styles.audienceButtonActive,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setFormTargetAudience(audience);
                    }}
                  >
                    <Text
                      style={[
                        styles.audienceButtonText,
                        formTargetAudience === audience && styles.audienceButtonTextActive,
                      ]}
                    >
                      {getAudienceLabel(audience)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Titolo Notifica *</Text>
              <TextInput
                style={styles.input}
                placeholder="Titolo della notifica..."
                placeholderTextColor={colors.textTertiary}
                value={formTitle}
                onChangeText={setFormTitle}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Messaggio Notifica *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Messaggio della notifica..."
                placeholderTextColor={colors.textTertiary}
                value={formMessage}
                onChangeText={setFormMessage}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formActions}>
              <Pressable
                style={[styles.formButton, styles.cancelButton]}
                onPress={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Annulla</Text>
              </Pressable>

              <Pressable
                style={[styles.formButton, styles.submitButton]}
                onPress={handleCreateFlow}
              >
                <Text style={styles.submitButtonText}>Crea Flusso</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Flows List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Flussi di Notifica Automatici ({flows.length})</Text>
          
          {flows.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol ios_icon_name="bell.slash" android_material_icon_name="notifications_off" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyStateText}>Nessun flusso di notifica configurato</Text>
            </View>
          ) : (
            flows.map((flow) => (
              <View key={flow.id} style={styles.flowCard}>
                <View style={styles.flowHeader}>
                  <View style={styles.flowInfo}>
                    <Text style={styles.flowName}>{flow.name}</Text>
                    {flow.description && (
                      <Text style={styles.flowDescription}>{flow.description}</Text>
                    )}
                  </View>
                  <Switch
                    value={flow.is_active}
                    onValueChange={() => handleToggleFlow(flow.id, flow.is_active)}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#FFF"
                  />
                </View>

                <View style={styles.flowDetails}>
                  <View style={styles.flowBadge}>
                    <IconSymbol ios_icon_name="bolt.fill" android_material_icon_name="flash_on" size={14} color={colors.primary} />
                    <Text style={styles.flowBadgeText}>{getTriggerTypeLabel(flow.trigger_type)}</Text>
                  </View>

                  <View style={styles.flowBadge}>
                    <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={14} color={colors.textSecondary} />
                    <Text style={styles.flowBadgeText}>{getAudienceLabel(flow.target_audience)}</Text>
                  </View>
                </View>

                <View style={styles.flowNotification}>
                  <Text style={styles.flowNotificationTitle}>{flow.notification_title}</Text>
                  <Text style={styles.flowNotificationMessage} numberOfLines={2}>
                    {flow.notification_message}
                  </Text>
                </View>

                <Pressable
                  style={styles.deleteButton}
                  onPress={() => handleDeleteFlow(flow.id, flow.name)}
                >
                  <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={18} color="#FF3B30" />
                  <Text style={styles.deleteButtonText}>Elimina</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  secondaryButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  audienceButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  audienceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  audienceButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  audienceButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  audienceButtonTextActive: {
    color: '#FFF',
  },
  pickupPointsScroll: {
    marginTop: 4,
  },
  pickupPointChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  pickupPointChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pickupPointChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  pickupPointChipTextActive: {
    color: '#FFF',
  },
  triggerScroll: {
    marginTop: 4,
  },
  triggerChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  triggerChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  triggerChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  triggerChipTextActive: {
    color: '#FFF',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  formButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  flowCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  flowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  flowInfo: {
    flex: 1,
    marginRight: 12,
  },
  flowName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  flowDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  flowDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  flowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.background,
    gap: 4,
  },
  flowBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  flowNotification: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  flowNotificationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  flowNotificationMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
  },
});
