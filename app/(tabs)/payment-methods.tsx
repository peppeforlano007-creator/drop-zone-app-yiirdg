
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function PaymentMethodsScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Metodi di Pagamento',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.contentContainer,
            Platform.OS !== 'ios' && styles.contentContainerWithTabBar,
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Metodo di Pagamento</Text>
            <Text style={styles.headerSubtitle}>
              Tutti gli ordini vengono pagati alla consegna
            </Text>
          </View>

          {/* Cash on Delivery Card */}
          <View style={styles.paymentCard}>
            <View style={styles.paymentHeader}>
              <View style={styles.paymentInfo}>
                <View style={styles.iconContainer}>
                  <IconSymbol
                    ios_icon_name="banknote.fill"
                    android_material_icon_name="payments"
                    size={48}
                    color={colors.text}
                  />
                </View>
                <View style={styles.paymentDetails}>
                  <Text style={styles.paymentTitle}>Pagamento alla Consegna</Text>
                  <Text style={styles.paymentDescription}>
                    Paga in contanti quando ritiri il tuo ordine
                  </Text>
                </View>
              </View>
              <View style={styles.activeBadge}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check_circle"
                  size={24}
                  color="#4CAF50"
                />
              </View>
            </View>
          </View>

          {/* How it works section */}
          <View style={styles.howItWorksCard}>
            <Text style={styles.howItWorksTitle}>Come funziona?</Text>
            <View style={styles.stepsList}>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Prenota i prodotti</Text>
                  <Text style={styles.stepText}>
                    Prenota i prodotti che ti interessano durante il drop attivo
                  </Text>
                </View>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Ricevi notifica</Text>
                  <Text style={styles.stepText}>
                    Alla chiusura del drop, ti notificheremo l&apos;importo esatto da pagare
                  </Text>
                </View>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Ritira e paga</Text>
                  <Text style={styles.stepText}>
                    Quando l&apos;ordine arriva al punto di ritiro, ritiralo e paga in contanti
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Important info */}
          <View style={styles.infoCard}>
            <IconSymbol
              ios_icon_name="info.circle.fill"
              android_material_icon_name="info"
              size={24}
              color={colors.primary}
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Importante</Text>
              <Text style={styles.infoText}>
                Assicurati di ritirare i tuoi ordini entro i tempi stabiliti. 
                Dopo 5 ordini non ritirati e rispediti al fornitore, l&apos;account verrà bloccato definitivamente.
                {'\n\n'}
                Al punto di ritiro sarà possibile effettuare resi dei singoli articoli, ma dopo 100 articoli restituiti il profilo sarà bloccato momentaneamente.
              </Text>
            </View>
          </View>

          {/* Rating info */}
          <View style={styles.ratingCard}>
            <IconSymbol
              ios_icon_name="star.fill"
              android_material_icon_name="star"
              size={24}
              color="#FFD700"
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Sistema di Rating</Text>
              <Text style={styles.infoText}>
                Il tuo rating aumenta quando ritiri gli ordini e diminuisce quando vengono rispediti al mittente. 
                Mantieni un rating alto per accedere al programma fedeltà e guadagnare punti!
              </Text>
            </View>
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
    paddingTop: 80,
    paddingBottom: 120,
  },
  contentContainerWithTabBar: {
    paddingBottom: 200,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  paymentCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.primary,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    elevation: 4,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentInfo: {
    flexDirection: 'row',
    gap: 16,
    flex: 1,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  paymentDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  activeBadge: {
    marginLeft: 8,
  },
  howItWorksCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  howItWorksTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
  },
  stepsList: {
    gap: 24,
  },
  step: {
    flexDirection: 'row',
    gap: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  stepText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  ratingCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FFD700',
    gap: 16,
  },
});
