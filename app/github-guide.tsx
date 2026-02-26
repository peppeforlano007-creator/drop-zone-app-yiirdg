
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { Stack, router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import * as Haptics from 'expo-haptics';
import { colors, layout } from '@/styles/commonStyles';

interface Step {
  number: number;
  title: string;
  description: string;
  icon: string;
  androidIcon: string;
  substeps?: string[];
  link?: string;
  linkText?: string;
}

export default function GitHubGuideScreen() {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const revokeSteps: Step[] = [
    {
      number: 1,
      title: 'Accedi a GitHub',
      description: 'Apri il tuo browser e vai su GitHub.com',
      icon: 'safari.fill',
      androidIcon: 'language',
      link: 'https://github.com',
      linkText: 'Apri GitHub.com',
    },
    {
      number: 2,
      title: 'Vai alle Impostazioni',
      description: 'Clicca sulla tua foto profilo in alto a destra, poi seleziona "Settings"',
      icon: 'gear.circle.fill',
      androidIcon: 'settings',
      substeps: [
        'Clicca sulla tua foto profilo (angolo in alto a destra)',
        'Nel menu a tendina, seleziona "Settings"',
      ],
    },
    {
      number: 3,
      title: 'Apri Applicazioni',
      description: 'Nel menu laterale sinistro, scorri fino a trovare "Applications"',
      icon: 'square.grid.2x2.fill',
      androidIcon: 'apps',
      substeps: [
        'Guarda il menu laterale sinistro',
        'Scorri verso il basso se necessario',
        'Clicca su "Applications"',
      ],
    },
    {
      number: 4,
      title: 'Seleziona OAuth Apps',
      description: 'Clicca sulla scheda "Authorized OAuth Apps"',
      icon: 'key.fill',
      androidIcon: 'vpn_key',
      substeps: [
        'Vedrai diverse schede in alto',
        'Clicca su "Authorized OAuth Apps"',
        'Vedrai l\'elenco di tutte le app autorizzate',
      ],
    },
    {
      number: 5,
      title: 'Trova Natively',
      description: 'Cerca "Natively" nell\'elenco delle applicazioni autorizzate',
      icon: 'magnifyingglass.circle.fill',
      androidIcon: 'search',
      substeps: [
        'Scorri l\'elenco delle app',
        'Cerca "Natively" o "Natively.dev"',
        'Potrebbe essere elencata come "Natively App" o simile',
      ],
    },
    {
      number: 6,
      title: 'Revoca Accesso',
      description: 'Clicca sui tre puntini (...) accanto a Natively e seleziona "Revoke"',
      icon: 'xmark.circle.fill',
      androidIcon: 'block',
      substeps: [
        'Clicca sui tre puntini (...) o sul pulsante "Revoke"',
        'Conferma la revoca quando richiesto',
        'L\'app Natively verrà rimossa dall\'elenco',
      ],
    },
  ];

  const reconnectSteps: Step[] = [
    {
      number: 1,
      title: 'Torna su Natively.dev',
      description: 'Apri il sito web di Natively nel tuo browser',
      icon: 'arrow.uturn.backward.circle.fill',
      androidIcon: 'arrow_back',
      link: 'https://natively.dev',
      linkText: 'Apri Natively.dev',
    },
    {
      number: 2,
      title: 'Accedi al tuo Account',
      description: 'Effettua il login con le tue credenziali Natively',
      icon: 'person.crop.circle.fill',
      androidIcon: 'person',
      substeps: [
        'Inserisci email e password',
        'Clicca su "Login" o "Accedi"',
      ],
    },
    {
      number: 3,
      title: 'Vai al Menu',
      description: 'Clicca sul menu principale (di solito in alto a destra o nell\'hamburger menu)',
      icon: 'line.3.horizontal.circle.fill',
      androidIcon: 'menu',
    },
    {
      number: 4,
      title: 'Trova "Connect to GitHub"',
      description: 'Cerca l\'opzione per connettere GitHub nel menu o nelle impostazioni',
      icon: 'link.circle.fill',
      androidIcon: 'link',
      substeps: [
        'Potrebbe essere in "Settings" o "Impostazioni"',
        'Oppure direttamente nel menu principale',
        'Cerca un pulsante "Connect to GitHub" o "Connetti GitHub"',
      ],
    },
    {
      number: 5,
      title: 'Autorizza Natively',
      description: 'Clicca su "Connect to GitHub" e autorizza l\'app quando richiesto',
      icon: 'checkmark.shield.fill',
      androidIcon: 'verified_user',
      substeps: [
        'Verrai reindirizzato a GitHub',
        'GitHub ti chiederà di autorizzare Natively',
        'Rivedi i permessi richiesti',
        'Clicca su "Authorize" o "Autorizza"',
      ],
    },
    {
      number: 6,
      title: 'Crea Nuovo Repository',
      description: 'Dopo la connessione, potrai creare un nuovo repository sincronizzato',
      icon: 'plus.circle.fill',
      androidIcon: 'add_circle',
      substeps: [
        'Torna su Natively.dev',
        'Cerca l\'opzione "Create New Repository" o simile',
        'Segui la procedura guidata per creare un nuovo repo',
        'Il nuovo repository sarà automaticamente sincronizzato',
      ],
    },
  ];

  const handleStepPress = (stepNumber: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newExpandedStep = expandedStep === stepNumber ? null : stepNumber;
    setExpandedStep(newExpandedStep);
  };

  const handleOpenLink = async (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Error opening link:', error);
    }
  };

  const renderStep = (step: Step, isRevoke: boolean) => {
    const isExpanded = expandedStep === step.number;
    const stepColor = isRevoke ? colors.error : colors.success;

    return (
      <View key={step.number} style={styles.stepContainer}>
        <Pressable
          style={[styles.stepHeader, isExpanded && styles.stepHeaderExpanded]}
          onPress={() => handleStepPress(step.number)}
        >
          <View style={styles.stepHeaderLeft}>
            <View style={[styles.stepNumber, { backgroundColor: stepColor }]}>
              <Text style={styles.stepNumberText}>{step.number}</Text>
            </View>
            <View style={styles.stepHeaderText}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDescription} numberOfLines={isExpanded ? undefined : 2}>
                {step.description}
              </Text>
            </View>
          </View>
          <IconSymbol
            ios_icon_name={isExpanded ? 'chevron.up' : 'chevron.down'}
            android_material_icon_name={isExpanded ? 'expand_less' : 'expand_more'}
            size={24}
            color={colors.textSecondary}
          />
        </Pressable>

        {isExpanded && (
          <View style={styles.stepContent}>
            <View style={styles.stepIconContainer}>
              <IconSymbol
                ios_icon_name={step.icon}
                android_material_icon_name={step.androidIcon}
                size={48}
                color={stepColor}
              />
            </View>

            {step.substeps && step.substeps.length > 0 && (
              <View style={styles.substepsContainer}>
                <Text style={styles.substepsTitle}>Passaggi dettagliati:</Text>
                {step.substeps.map((substep, index) => (
                  <View key={index} style={styles.substepItem}>
                    <View style={styles.substepBullet} />
                    <Text style={styles.substepText}>{substep}</Text>
                  </View>
                ))}
              </View>
            )}

            {step.link && step.linkText && (
              <Pressable
                style={[styles.linkButton, { backgroundColor: stepColor }]}
                onPress={() => handleOpenLink(step.link!)}
              >
                <IconSymbol
                  ios_icon_name="arrow.up.right.circle.fill"
                  android_material_icon_name="open_in_new"
                  size={20}
                  color={colors.background}
                />
                <Text style={styles.linkButtonText}>{step.linkText}</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Guida GitHub',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Introduction */}
          <View style={styles.introSection}>
            <View style={styles.introIconContainer}>
              <IconSymbol
                ios_icon_name="info.circle.fill"
                android_material_icon_name="info"
                size={64}
                color={colors.primary}
              />
            </View>
            <Text style={styles.introTitle}>Guida alla Riconnessione GitHub</Text>
            <Text style={styles.introText}>
              Questa guida ti aiuterà a revocare l&apos;accesso dell&apos;app Natively dal tuo account GitHub e a ricollegarla per creare un nuovo repository sincronizzato.
            </Text>
          </View>

          {/* Important Note */}
          <View style={styles.noteCard}>
            <View style={styles.noteHeader}>
              <IconSymbol
                ios_icon_name="exclamationmark.triangle.fill"
                android_material_icon_name="warning"
                size={24}
                color={colors.warning}
              />
              <Text style={styles.noteTitle}>Nota Importante</Text>
            </View>
            <Text style={styles.noteText}>
              Questa procedura è necessaria quando vuoi creare un nuovo repository GitHub invece di usare quello esistente. Dopo aver revocato l&apos;accesso, potrai ricollegare GitHub e creare un nuovo repository da zero.
            </Text>
          </View>

          {/* Part 1: Revoke Access */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol
                ios_icon_name="xmark.shield.fill"
                android_material_icon_name="block"
                size={32}
                color={colors.error}
              />
              <Text style={styles.sectionTitle}>Parte 1: Revoca Accesso</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Segui questi passaggi per revocare l&apos;accesso di Natively al tuo account GitHub
            </Text>
            {revokeSteps.map((step) => renderStep(step, true))}
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <View style={styles.dividerIconContainer}>
              <IconSymbol
                ios_icon_name="arrow.down.circle.fill"
                android_material_icon_name="arrow_downward"
                size={32}
                color={colors.primary}
              />
            </View>
            <View style={styles.dividerLine} />
          </View>

          {/* Part 2: Reconnect */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol
                ios_icon_name="link.circle.fill"
                android_material_icon_name="link"
                size={32}
                color={colors.success}
              />
              <Text style={styles.sectionTitle}>Parte 2: Ricollega GitHub</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Dopo aver revocato l&apos;accesso, segui questi passaggi per ricollegare GitHub e creare un nuovo repository
            </Text>
            {reconnectSteps.map((step) => renderStep(step, false))}
          </View>

          {/* Success Card */}
          <View style={styles.successCard}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check_circle"
              size={48}
              color={colors.success}
            />
            <Text style={styles.successTitle}>Completato!</Text>
            <Text style={styles.successText}>
              Dopo aver completato tutti i passaggi, avrai un nuovo repository GitHub sincronizzato con Natively. Potrai vedere il pulsante &quot;Open in GitHub&quot; nel menu del sito.
            </Text>
          </View>

          {/* Help Section */}
          <View style={styles.helpSection}>
            <Text style={styles.helpTitle}>Hai bisogno di aiuto?</Text>
            <Text style={styles.helpText}>
              Se riscontri problemi durante questa procedura, contatta il supporto di Natively per assistenza.
            </Text>
            <Pressable
              style={styles.helpButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.back();
              }}
            >
              <IconSymbol
                ios_icon_name="arrow.left.circle.fill"
                android_material_icon_name="arrow_back"
                size={20}
                color={colors.background}
              />
              <Text style={styles.helpButtonText}>Torna Indietro</Text>
            </Pressable>
          </View>
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
  scrollContent: {
    paddingBottom: layout.contentPaddingBottom,
  },
  introSection: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  introIconContainer: {
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  introText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  noteCard: {
    margin: 16,
    padding: 16,
    backgroundColor: colors.warning + '15',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  noteText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  stepContainer: {
    marginBottom: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  stepHeaderExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
  stepHeaderText: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  stepContent: {
    padding: 16,
  },
  stepIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  substepsContainer: {
    marginTop: 8,
  },
  substepsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  substepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 8,
  },
  substepBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 6,
    marginRight: 12,
  },
  substepText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
  },
  dividerIconContainer: {
    marginHorizontal: 16,
  },
  successCard: {
    margin: 16,
    padding: 24,
    backgroundColor: colors.success + '15',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.success,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.success,
    marginTop: 12,
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  helpSection: {
    margin: 16,
    padding: 20,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.text,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  helpButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.background,
  },
});
