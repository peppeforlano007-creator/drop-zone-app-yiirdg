
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function AddPaymentMethodScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Aggiungi Carta',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
        >
          <View style={styles.webNotice}>
            <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="warning" size={64} color="#f59e0b" />
            <Text style={styles.webNoticeTitle}>Non Disponibile su Web</Text>
            <Text style={styles.webNoticeText}>
              L&apos;aggiunta di carte di pagamento è disponibile solo sull&apos;app mobile. 
              Scarica l&apos;app per iOS o Android per aggiungere metodi di pagamento.
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webNotice: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    maxWidth: 500,
  },
  webNoticeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  webNoticeText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
