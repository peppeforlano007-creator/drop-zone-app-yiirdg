import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Platform,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { OneSignal } from "react-native-onesignal";
import { useNotifications } from "@/contexts/NotificationContext";
import { IconSymbol } from "@/components/IconSymbol";
import { colors, layout } from "@/styles/commonStyles";

export default function NotificationPreferencesScreen() {
  const { hasPermission, permissionDenied, isWeb, requestPermission, sendTag, deleteTag } =
    useNotifications();

  const [pushEnabled, setPushEnabled] = useState(hasPermission);
  const [drops, setDrops] = useState(true);
  const [promozioni, setPromozioni] = useState(true);
  const [aggiornamenti, setAggiornamenti] = useState(true);

  // Keep local toggle in sync with actual permission state
  useEffect(() => {
    setPushEnabled(hasPermission);
  }, [hasPermission]);

  const handlePushToggle = async (value: boolean) => {
    console.log("[NotificationPreferences] User toggled push notifications:", value);
    if (value) {
      if (permissionDenied) {
        Alert.alert(
          "Notifiche disabilitate",
          "Per ricevere notifiche, abilitale nelle impostazioni del dispositivo.",
          [
            { text: "Annulla", style: "cancel" },
            {
              text: "Apri Impostazioni",
              onPress: () => {
                console.log("[NotificationPreferences] Opening device settings");
                if (Platform.OS === "ios") {
                  Linking.openURL("app-settings:");
                } else {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
        return;
      }
      const granted = await requestPermission();
      if (granted) {
        OneSignal.User.pushSubscription.optIn();
        setPushEnabled(true);
        console.log("[NotificationPreferences] Push notifications opted in");
      }
    } else {
      OneSignal.User.pushSubscription.optOut();
      setPushEnabled(false);
      console.log("[NotificationPreferences] Push notifications opted out");
    }
  };

  const handleDropsToggle = (value: boolean) => {
    console.log("[NotificationPreferences] User toggled drops notifications:", value);
    setDrops(value);
    if (value) {
      sendTag("notify_drops", "true");
    } else {
      deleteTag("notify_drops");
    }
  };

  const handlePromozioniToggle = (value: boolean) => {
    console.log("[NotificationPreferences] User toggled promozioni notifications:", value);
    setPromozioni(value);
    if (value) {
      sendTag("notify_promozioni", "true");
    } else {
      deleteTag("notify_promozioni");
    }
  };

  const handleAggiornamenti = (value: boolean) => {
    console.log("[NotificationPreferences] User toggled aggiornamenti notifications:", value);
    setAggiornamenti(value);
    if (value) {
      sendTag("notify_aggiornamenti", "true");
    } else {
      deleteTag("notify_aggiornamenti");
    }
  };

  const permissionStatusText = hasPermission
    ? "Autorizzate"
    : permissionDenied
    ? "Negate — apri le impostazioni per abilitarle"
    : "Non ancora richieste";

  const permissionStatusColor = hasPermission
    ? colors.success
    : permissionDenied
    ? colors.error
    : colors.warning;

  return (
    <>
      <Stack.Screen
        options={{
          title: "Notifiche",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
        >
          {/* Hero */}
          <View style={styles.heroSection}>
            <View style={styles.heroIcon}>
              <IconSymbol
                ios_icon_name="bell.fill"
                android_material_icon_name="notifications"
                size={56}
                color={colors.text}
              />
            </View>
            <Text style={styles.heroTitle}>Notifiche Push</Text>
            <Text style={styles.heroSubtitle}>
              Ricevi aggiornamenti in tempo reale su drop, ordini e promozioni
            </Text>
          </View>

          {/* Stato permessi */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Stato Permessi</Text>
            <View style={styles.card}>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: permissionStatusColor }]} />
                <Text style={styles.statusText}>{permissionStatusText}</Text>
              </View>
            </View>
          </View>

          {/* Abilita notifiche push */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Impostazioni</Text>
            <View style={styles.card}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Abilita notifiche push</Text>
                  <Text style={styles.toggleDescription}>
                    Ricevi notifiche anche quando l&apos;app è chiusa
                  </Text>
                </View>
                <Switch
                  value={pushEnabled}
                  onValueChange={handlePushToggle}
                  trackColor={{ false: colors.border, true: colors.text }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={colors.border}
                />
              </View>
            </View>
          </View>

          {/* Tipi di notifica — visibili solo se il permesso è concesso */}
          {pushEnabled && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tipi di Notifica</Text>
              <View style={styles.card}>
                <View style={styles.toggleRow}>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleLabel}>Nuovi Drop</Text>
                    <Text style={styles.toggleDescription}>
                      Avvisi quando un nuovo drop è disponibile
                    </Text>
                  </View>
                  <Switch
                    value={drops}
                    onValueChange={handleDropsToggle}
                    trackColor={{ false: colors.border, true: colors.text }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor={colors.border}
                  />
                </View>

                <View style={styles.divider} />

                <View style={styles.toggleRow}>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleLabel}>Promozioni</Text>
                    <Text style={styles.toggleDescription}>
                      Offerte speciali e sconti esclusivi
                    </Text>
                  </View>
                  <Switch
                    value={promozioni}
                    onValueChange={handlePromozioniToggle}
                    trackColor={{ false: colors.border, true: colors.text }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor={colors.border}
                  />
                </View>

                <View style={styles.divider} />

                <View style={styles.toggleRow}>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleLabel}>Aggiornamenti Ordini</Text>
                    <Text style={styles.toggleDescription}>
                      Stato degli ordini e conferme di ritiro
                    </Text>
                  </View>
                  <Switch
                    value={aggiornamenti}
                    onValueChange={handleAggiornamenti}
                    trackColor={{ false: colors.border, true: colors.text }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor={colors.border}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Apri impostazioni se negate */}
          {permissionDenied && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => {
                  console.log("[NotificationPreferences] User tapped open device settings");
                  if (Platform.OS === "ios") {
                    Linking.openURL("app-settings:");
                  } else {
                    Linking.openSettings();
                  }
                }}
              >
                <IconSymbol
                  ios_icon_name="gear"
                  android_material_icon_name="settings"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.settingsButtonText}>Apri Impostazioni</Text>
              </TouchableOpacity>
            </View>
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
    paddingBottom: layout.contentPaddingBottom,
  },
  heroSection: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  heroIcon: {
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    gap: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 2,
  },
  toggleDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 20,
  },
  settingsButton: {
    backgroundColor: colors.text,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  settingsButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
