
import { Stack, router } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import React, { useState } from 'react';
import * as Haptics from 'expo-haptics';

export default function ForgotPasswordScreen() {
  const [loading] = useState(false);

  const handleContactSupport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Reset Password',
      'Per reimpostare la password, contatta il supporto clienti tramite WhatsApp dalla schermata di login.\n\nIl team di supporto ti aiuterà a recuperare l\'accesso al tuo account.',
      [
        {
          text: 'Torna al Login',
          onPress: () => router.back()
        }
      ]
    );
  };

  const handleBackToLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: true,
          title: 'Recupera Password',
          headerBackTitle: 'Indietro',
        }} 
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <IconSymbol
                  ios_icon_name="lock.fill"
                  android_material_icon_name="lock"
                  size={40}
                  color={colors.primary}
                />
              </View>
            </View>

            <View style={styles.header}>
              <Text style={styles.title}>Recupera Password</Text>
              <Text style={styles.subtitle}>
                Per motivi di sicurezza, il reset della password tramite SMS richiede l&apos;assistenza del nostro team di supporto.
              </Text>
            </View>

            <View style={styles.instructionsBox}>
              <Text style={styles.instructionsTitle}>Come recuperare la password:</Text>
              <View style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>1.</Text>
                <Text style={styles.instructionText}>
                  Torna alla schermata di login
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>2.</Text>
                <Text style={styles.instructionText}>
                  Clicca sul pulsante &quot;Hai bisogno di aiuto?&quot;
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>3.</Text>
                <Text style={styles.instructionText}>
                  Contatta il supporto clienti tramite WhatsApp
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>4.</Text>
                <Text style={styles.instructionText}>
                  Il team ti aiuterà a reimpostare la password
                </Text>
              </View>
            </View>

            <View style={styles.infoBox}>
              <IconSymbol
                ios_icon_name="shield.fill"
                android_material_icon_name="security"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.infoText}>
                <Text style={styles.infoTextBold}>Sicurezza:</Text> Questo processo garantisce che solo tu possa accedere al tuo account. 
                Il nostro team verificherà la tua identità prima di aiutarti a reimpostare la password.
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.supportButton,
                pressed && styles.supportButtonPressed,
              ]}
              onPress={handleContactSupport}
              disabled={loading}
            >
              <IconSymbol
                ios_icon_name="message.fill"
                android_material_icon_name="chat"
                size={20}
                color="#fff"
              />
              <Text style={styles.supportButtonText}>
                Contatta il Supporto
              </Text>
            </Pressable>

            <Pressable
              style={styles.backButton}
              onPress={handleBackToLogin}
              disabled={loading}
            >
              <IconSymbol
                ios_icon_name="chevron.left"
                android_material_icon_name="chevron_left"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.backButtonText}>
                Torna al Login
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
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
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  instructionsBox: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  instructionNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    width: 24,
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    gap: 16,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  infoTextBold: {
    fontWeight: '700',
    color: colors.text,
  },
  supportButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    minHeight: 56,
    gap: 8,
  },
  supportButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  supportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
});
