
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { logActivity } from '@/utils/activityLogger';

interface LegalDocument {
  id: string;
  document_type: 'privacy_policy' | 'terms_conditions' | 'cookie_policy';
  title: string;
  content: string;
  version: number;
  is_active: boolean;
  is_visible_to_users: boolean;
  created_at: string;
  updated_at: string;
}

const DOCUMENT_TYPES = [
  {
    type: 'privacy_policy' as const,
    title: 'Privacy Policy',
    icon: 'shield.fill' as const,
    androidIcon: 'shield' as const,
    description: 'Informativa sul trattamento dei dati personali (GDPR)',
  },
  {
    type: 'terms_conditions' as const,
    title: 'Termini e Condizioni',
    icon: 'doc.text.fill' as const,
    androidIcon: 'description' as const,
    description: 'Condizioni generali di utilizzo del servizio',
  },
  {
    type: 'cookie_policy' as const,
    title: 'Cookie Policy',
    icon: 'info.circle.fill' as const,
    androidIcon: 'cookie' as const,
    description: 'Informativa sull\'uso di cookie e tecnologie di tracciamento',
  },
];

export default function LegalDocumentsScreen() {
  const router = useRouter();
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDoc, setEditingDoc] = useState<LegalDocument | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      console.log('[LegalDocuments] Loading legal documents...');
      setLoading(true);
      
      const { data, error } = await supabase
        .from('legal_documents')
        .select('*')
        .eq('is_active', true)
        .order('document_type', { ascending: true });

      if (error) {
        console.error('[LegalDocuments] Error loading legal documents:', error);
        Alert.alert('Errore', 'Impossibile caricare i documenti legali');
        return;
      }

      console.log('[LegalDocuments] Loaded', data?.length ?? 0, 'documents');
      setDocuments(data || []);
    } catch (error) {
      console.error('[LegalDocuments] Exception loading legal documents:', error);
      Alert.alert('Errore', 'Si è verificato un errore durante il caricamento');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (doc: LegalDocument) => {
    console.log('[LegalDocuments] Edit pressed for:', doc.document_type, 'v' + doc.version);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingDoc(doc);
    setEditContent(doc.content);
  };

  const handleCancelEdit = () => {
    console.log('[LegalDocuments] Cancel edit pressed');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingDoc(null);
    setEditContent('');
  };

  const handleSave = async () => {
    if (!editingDoc) return;

    console.log('[LegalDocuments] Save pressed for:', editingDoc.document_type);

    if (!editContent.trim()) {
      Alert.alert('Errore', 'Il contenuto non può essere vuoto');
      return;
    }

    Alert.alert(
      'Salva Modifiche',
      'Sei sicuro di voler salvare le modifiche? Questo creerà una nuova versione del documento.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Salva',
          onPress: async () => {
            try {
              setSaving(true);
              console.log('[LegalDocuments] Saving new version for:', editingDoc.document_type, '-> v' + (editingDoc.version + 1));
              
              // Deactivate old version
              const { error: deactivateError } = await supabase
                .from('legal_documents')
                .update({ is_active: false })
                .eq('document_type', editingDoc.document_type)
                .eq('is_active', true);

              if (deactivateError) {
                console.error('[LegalDocuments] Error deactivating old version:', deactivateError);
                throw new Error('Impossibile disattivare la versione precedente');
              }

              // Insert new version
              const { error: insertError } = await supabase
                .from('legal_documents')
                .insert({
                  document_type: editingDoc.document_type,
                  title: editingDoc.title,
                  content: editContent.trim(),
                  version: editingDoc.version + 1,
                  is_active: true,
                  is_visible_to_users: editingDoc.is_visible_to_users,
                });

              if (insertError) {
                console.error('[LegalDocuments] Error inserting new version:', insertError);
                throw new Error('Impossibile salvare la nuova versione');
              }

              console.log('[LegalDocuments] Document saved successfully');

              await logActivity({
                action: 'update_legal_document',
                description: `Aggiornato documento legale: ${editingDoc.title}`,
                metadata: {
                  document_type: editingDoc.document_type,
                  old_version: editingDoc.version,
                  new_version: editingDoc.version + 1,
                },
              });

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Successo', 'Documento salvato con successo!');
              
              setEditingDoc(null);
              setEditContent('');
              loadDocuments();
            } catch (error) {
              console.error('[LegalDocuments] Exception saving document:', error);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert(
                'Errore',
                error instanceof Error ? error.message : 'Si è verificato un errore durante il salvataggio'
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const handleCreate = (type: typeof DOCUMENT_TYPES[number]) => {
    console.log('[LegalDocuments] Create pressed for:', type.type);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const newDoc: LegalDocument = {
      id: 'new',
      document_type: type.type,
      title: type.title,
      content: getDefaultContent(type.type),
      version: 1,
      is_active: true,
      is_visible_to_users: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    setEditingDoc(newDoc);
    setEditContent(newDoc.content);
  };

  const handleToggleVisibility = async (doc: LegalDocument) => {
    const newValue = !doc.is_visible_to_users;
    console.log('[LegalDocuments] Toggle visibility pressed for:', doc.document_type, '-> is_visible_to_users:', newValue);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      newValue ? 'Attiva sezione' : 'Disattiva sezione',
      newValue
        ? `Vuoi rendere visibile "${doc.title}" agli utenti?`
        : `Vuoi nascondere "${doc.title}" agli utenti? Non sarà più visibile nell'app.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: newValue ? 'Attiva' : 'Disattiva',
          style: newValue ? 'default' : 'destructive',
          onPress: async () => {
            console.log('[LegalDocuments] Updating is_visible_to_users for doc id:', doc.id, '->', newValue);
            const { error } = await supabase
              .from('legal_documents')
              .update({ is_visible_to_users: newValue })
              .eq('id', doc.id);

            if (error) {
              console.error('[LegalDocuments] Error updating visibility:', error);
              Alert.alert('Errore', 'Impossibile aggiornare la visibilità');
              return;
            }

            console.log('[LegalDocuments] Visibility updated successfully');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            loadDocuments();
          },
        },
      ]
    );
  };

  const getDefaultContent = (type: string): string => {
    switch (type) {
      case 'privacy_policy':
        return `PRIVACY POLICY

Ultimo aggiornamento: ${new Date().toLocaleDateString('it-IT')}

1. INTRODUZIONE
Questa Privacy Policy descrive come RDN raccoglie, utilizza e protegge i dati personali degli utenti in conformità con il Regolamento Generale sulla Protezione dei Dati (GDPR - Regolamento UE 2016/679).

2. TITOLARE DEL TRATTAMENTO
[Inserire nome azienda]
[Inserire indirizzo]
[Inserire email]
[Inserire telefono]

3. DATI RACCOLTI
Raccogliamo i seguenti dati personali:
- Nome e cognome
- Indirizzo email
- Numero di telefono
- Punto di ritiro selezionato
- Dati di pagamento (tramite Stripe)
- Cronologia prenotazioni e acquisti

4. FINALITÀ DEL TRATTAMENTO
I dati vengono trattati per:
- Gestione dell'account utente
- Elaborazione prenotazioni e pagamenti
- Comunicazioni relative al servizio
- Miglioramento del servizio

5. BASE GIURIDICA
Il trattamento si basa su:
- Esecuzione del contratto
- Consenso dell'utente
- Obblighi di legge

6. CONSERVAZIONE DEI DATI
I dati vengono conservati per il tempo necessario alle finalità per cui sono stati raccolti e in conformità con gli obblighi di legge.

7. DIRITTI DELL'UTENTE
Hai diritto a:
- Accedere ai tuoi dati
- Rettificare i tuoi dati
- Cancellare i tuoi dati
- Limitare il trattamento
- Portabilità dei dati
- Opporti al trattamento

8. SICUREZZA
Adottiamo misure tecniche e organizzative appropriate per proteggere i dati personali.

9. MODIFICHE
Ci riserviamo il diritto di modificare questa Privacy Policy. Le modifiche saranno comunicate tramite l'app.

10. CONTATTI
Per esercitare i tuoi diritti o per informazioni, contattaci a: [inserire email]`;

      case 'terms_conditions':
        return `TERMINI E CONDIZIONI

Ultimo aggiornamento: ${new Date().toLocaleDateString('it-IT')}

1. ACCETTAZIONE DEI TERMINI
Utilizzando RDN, accetti questi Termini e Condizioni. Se non accetti, non utilizzare il servizio.

2. DESCRIZIONE DEL SERVIZIO
RDN è una piattaforma di social e-commerce che permette agli utenti di prenotare prodotti con sconti progressivi basati su prenotazioni collettive.

3. REGISTRAZIONE
Per utilizzare il servizio devi:
- Avere almeno 18 anni
- Fornire informazioni accurate
- Mantenere la sicurezza del tuo account

4. PRENOTAZIONI E PAGAMENTI
- Le prenotazioni sono vincolanti
- I pagamenti vengono elaborati tramite Stripe
- Gli importi vengono addebitati alla chiusura del drop
- Lo sconto finale dipende dal valore totale delle prenotazioni

5. DIRITTO DI RECESSO
Ai sensi del Codice del Consumo (D.Lgs. 206/2005), hai diritto di recedere entro 14 giorni dalla ricezione del prodotto, salvo eccezioni previste dalla legge.

6. RITIRO PRODOTTI
I prodotti devono essere ritirati presso il punto di ritiro selezionato entro i termini comunicati.

7. GARANZIE
I prodotti sono coperti dalla garanzia legale di conformità di 2 anni.

8. RESPONSABILITÀ
RDN non è responsabile per:
- Ritardi nella consegna da parte dei fornitori
- Difetti dei prodotti (responsabilità del fornitore)
- Uso improprio del servizio

9. MODIFICHE AL SERVIZIO
Ci riserviamo il diritto di modificare o interrompere il servizio in qualsiasi momento.

10. LEGGE APPLICABILE
Questi termini sono regolati dalla legge italiana. Per controversie è competente il foro del consumatore.

11. CONTATTI
Per assistenza: [inserire email]`;

      case 'cookie_policy':
        return `COOKIE POLICY

Ultimo aggiornamento: ${new Date().toLocaleDateString('it-IT')}

1. COSA SONO I COOKIE
I cookie sono piccoli file di testo che vengono memorizzati sul dispositivo quando visiti un sito web o utilizzi un'app.

2. UTILIZZO NELL'APP
RDN è un'app mobile nativa che non utilizza cookie tradizionali del browser. Tuttavia, utilizziamo tecnologie simili per:
- Mantenere la sessione di login
- Memorizzare le preferenze
- Analizzare l'utilizzo dell'app

3. TECNOLOGIE UTILIZZATE
- AsyncStorage: per memorizzare dati locali
- Supabase Auth: per gestire l'autenticazione
- Analytics (se implementato): per migliorare il servizio

4. DATI RACCOLTI
Possiamo raccogliere:
- Informazioni sul dispositivo
- Dati di utilizzo dell'app
- Preferenze utente

5. FINALITÀ
I dati vengono utilizzati per:
- Funzionamento dell'app
- Miglioramento dell'esperienza utente
- Analisi statistiche

6. GESTIONE DELLE PREFERENZE
Puoi gestire le tue preferenze nelle impostazioni dell'app o del dispositivo.

7. COOKIE DI TERZE PARTI
Utilizziamo servizi di terze parti che possono raccogliere dati:
- Stripe (pagamenti)
- Supabase (backend)

8. MODIFICHE
Ci riserviamo il diritto di modificare questa Cookie Policy.

9. CONTATTI
Per informazioni: [inserire email]`;

      default:
        return '';
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Documenti Legali',
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

  if (editingDoc) {
    return (
      <>
        <Stack.Screen
          options={{
            title: editingDoc.id === 'new' ? 'Nuovo Documento' : 'Modifica Documento',
          }}
        />
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            <View style={styles.editorContainer}>
              <View style={styles.editorHeader}>
                <Text style={styles.editorTitle}>{editingDoc.title}</Text>
                <Text style={styles.editorVersion}>
                  Versione: {editingDoc.id === 'new' ? '1' : editingDoc.version + 1}
                </Text>
              </View>

              <ScrollView style={styles.editorScroll}>
                <View style={styles.htmlHintBox}>
                  <Text style={styles.htmlHintText}>
                    {'💡 Suggerimento: per tabelle e formattazione avanzata, incolla il contenuto in formato HTML (es. <table>, <tr>, <td>). Il testo semplice viene visualizzato così com\'è.'}
                  </Text>
                </View>
                <TextInput
                  style={styles.editorInput}
                  value={editContent}
                  onChangeText={setEditContent}
                  multiline
                  placeholder="Inserisci il contenuto del documento..."
                  placeholderTextColor={colors.textTertiary}
                  textAlignVertical="top"
                />
              </ScrollView>

              <View style={styles.editorActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.cancelButton,
                    pressed && styles.cancelButtonPressed,
                  ]}
                  onPress={handleCancelEdit}
                  disabled={saving}
                >
                  <Text style={styles.cancelButtonText}>Annulla</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.saveButton,
                    pressed && styles.saveButtonPressed,
                    saving && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check-circle"
                        size={20}
                        color="#fff"
                      />
                      <Text style={styles.saveButtonText}>Salva</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Documenti Legali',
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <View style={styles.infoBox}>
            <IconSymbol
              ios_icon_name="info.circle.fill"
              android_material_icon_name="info"
              size={20}
              color={colors.info}
            />
            <Text style={styles.infoText}>
              Gestisci i documenti legali dell&apos;app. Questi documenti sono obbligatori per legge e devono essere sempre aggiornati.
            </Text>
          </View>

          {DOCUMENT_TYPES.map((type, index) => {
            const existingDoc = documents.find(d => d.document_type === type.type);
            const isVisible = existingDoc?.is_visible_to_users ?? false;
            const visibilityLabel = isVisible ? '● Visibile agli utenti' : '○ Nascosto agli utenti';
            const toggleLabel = isVisible ? 'Disattiva' : 'Attiva';
            const toggleIosIcon = isVisible ? 'eye.slash.fill' : 'eye.fill';
            const toggleAndroidIcon = isVisible ? 'visibility-off' : 'visibility';
            
            return (
              <View key={index} style={styles.documentCard}>
                <View style={styles.documentHeader}>
                  <View style={styles.documentIcon}>
                    <IconSymbol
                      ios_icon_name={type.icon}
                      android_material_icon_name={type.androidIcon}
                      size={24}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.documentInfo}>
                    <Text style={styles.documentTitle}>{type.title}</Text>
                    <Text style={styles.documentDescription}>{type.description}</Text>
                    {existingDoc && (
                      <>
                        <Text style={styles.documentVersion}>
                          Versione {existingDoc.version} • Aggiornato il{' '}
                          {new Date(existingDoc.updated_at).toLocaleDateString('it-IT')}
                        </Text>
                        <View style={[styles.statusBadge, isVisible ? styles.statusActive : styles.statusInactive]}>
                          <Text style={styles.statusBadgeText}>
                            {visibilityLabel}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>

                <View style={styles.documentActions}>
                  {existingDoc ? (
                    <>
                      <Pressable
                        style={({ pressed }) => [
                          styles.actionButton,
                          isVisible ? styles.deactivateButton : styles.activateButton,
                          pressed && styles.actionButtonPressed,
                        ]}
                        onPress={() => handleToggleVisibility(existingDoc)}
                      >
                        <IconSymbol
                          ios_icon_name={toggleIosIcon}
                          android_material_icon_name={toggleAndroidIcon}
                          size={16}
                          color="#fff"
                        />
                        <Text style={styles.toggleButtonText}>
                          {toggleLabel}
                        </Text>
                      </Pressable>

                      <Pressable
                        style={({ pressed }) => [
                          styles.actionButton,
                          styles.viewButton,
                          pressed && styles.actionButtonPressed,
                        ]}
                        onPress={() => {
                          console.log('[LegalDocuments] View pressed for:', type.type);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          router.push(`/legal/${type.type.replace('_', '-')}`);
                        }}
                      >
                        <IconSymbol
                          ios_icon_name="eye.fill"
                          android_material_icon_name="visibility"
                          size={18}
                          color={colors.primary}
                        />
                        <Text style={styles.viewButtonText}>Visualizza</Text>
                      </Pressable>

                      <Pressable
                        style={({ pressed }) => [
                          styles.actionButton,
                          styles.editButton,
                          pressed && styles.actionButtonPressed,
                        ]}
                        onPress={() => handleEdit(existingDoc)}
                      >
                        <IconSymbol
                          ios_icon_name="pencil"
                          android_material_icon_name="edit"
                          size={18}
                          color="#fff"
                        />
                        <Text style={styles.editButtonText}>Modifica</Text>
                      </Pressable>
                    </>
                  ) : (
                    <Pressable
                      style={({ pressed }) => [
                        styles.createButton,
                        pressed && styles.createButtonPressed,
                      ]}
                      onPress={() => handleCreate(type)}
                    >
                      <IconSymbol
                        ios_icon_name="plus.circle.fill"
                        android_material_icon_name="add-circle"
                        size={20}
                        color="#fff"
                      />
                      <Text style={styles.createButtonText}>Crea Documento</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}

          <View style={styles.warningBox}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle.fill"
              android_material_icon_name="warning"
              size={20}
              color={colors.warning}
            />
            <Text style={styles.warningText}>
              ⚠️ IMPORTANTE: Questi documenti devono essere redatti da un legale esperto in diritto digitale e GDPR. I testi predefiniti sono solo esempi e devono essere personalizzati per la tua attività.
            </Text>
          </View>
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.info + '15',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.info + '30',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  documentCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  documentHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  documentDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  documentVersion: {
    fontSize: 12,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  statusBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  statusActive: {
    backgroundColor: colors.success + '20',
  },
  statusInactive: {
    backgroundColor: colors.textTertiary + '20',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  documentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  actionButtonPressed: {
    opacity: 0.7,
  },
  activateButton: {
    backgroundColor: colors.success,
  },
  deactivateButton: {
    backgroundColor: colors.warning,
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  viewButton: {
    backgroundColor: colors.primary + '15',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  editButton: {
    backgroundColor: colors.primary,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  createButtonPressed: {
    opacity: 0.8,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warning + '15',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.warning + '30',
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  editorContainer: {
    flex: 1,
  },
  editorHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  editorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  editorVersion: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  editorScroll: {
    flex: 1,
  },
  htmlHintBox: {
    margin: 12,
    marginBottom: 0,
    padding: 12,
    backgroundColor: colors.info + '12',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.info + '30',
  },
  htmlHintText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  editorInput: {
    flex: 1,
    padding: 16,
    fontSize: 15,
    color: colors.text,
    lineHeight: 24,
    minHeight: 400,
  },
  editorActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonPressed: {
    opacity: 0.7,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 14,
    gap: 8,
  },
  saveButtonPressed: {
    opacity: 0.8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
