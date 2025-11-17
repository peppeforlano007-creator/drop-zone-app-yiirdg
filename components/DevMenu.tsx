
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, Platform } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from './IconSymbol';
import * as Haptics from 'expo-haptics';

interface DevMenuProps {
  visible: boolean;
  onClose: () => void;
}

export function DevMenu({ visible, onClose }: DevMenuProps) {
  const [logs, setLogs] = useState<string[]>([]);

  const handleOpenDebugger = () => {
    if (__DEV__) {
      // In Expo 54, you can open the debugger with this
      console.log('🔍 Per aprire il debugger:');
      console.log('1. Premi "j" nella console di Expo');
      console.log('2. Oppure apri chrome://inspect in Chrome');
      console.log('3. Oppure usa React DevTools con: npm run devtools');
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleOpenReactDevTools = () => {
    console.log('📱 Per aprire React DevTools:');
    console.log('1. Esegui "npm run devtools" in un nuovo terminale');
    console.log('2. React DevTools si connetterà automaticamente');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleShowNetworkLogs = () => {
    console.log('🌐 Network logging abilitato');
    console.log('Controlla la console per vedere le richieste di rete');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleClearConsole = () => {
    console.clear();
    setLogs([]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>🛠️ Menu Sviluppatore</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="close"
                size={28}
                color={colors.text}
              />
            </Pressable>
          </View>

          <ScrollView style={styles.content}>
            <Text style={styles.sectionTitle}>Debugging</Text>
            
            <Pressable style={styles.menuItem} onPress={handleOpenDebugger}>
              <IconSymbol
                ios_icon_name="ant.fill"
                android_material_icon_name="bug_report"
                size={24}
                color={colors.primary}
              />
              <View style={styles.menuItemText}>
                <Text style={styles.menuItemTitle}>Apri Chrome DevTools</Text>
                <Text style={styles.menuItemDescription}>
                  Ispeziona elementi e debug JavaScript
                </Text>
              </View>
            </Pressable>

            <Pressable style={styles.menuItem} onPress={handleOpenReactDevTools}>
              <IconSymbol
                ios_icon_name="atom"
                android_material_icon_name="science"
                size={24}
                color={colors.primary}
              />
              <View style={styles.menuItemText}>
                <Text style={styles.menuItemTitle}>React DevTools</Text>
                <Text style={styles.menuItemDescription}>
                  Ispeziona componenti React e props
                </Text>
              </View>
            </Pressable>

            <Pressable style={styles.menuItem} onPress={handleShowNetworkLogs}>
              <IconSymbol
                ios_icon_name="network"
                android_material_icon_name="wifi"
                size={24}
                color={colors.primary}
              />
              <View style={styles.menuItemText}>
                <Text style={styles.menuItemTitle}>Network Logs</Text>
                <Text style={styles.menuItemDescription}>
                  Visualizza richieste di rete
                </Text>
              </View>
            </Pressable>

            <Pressable style={styles.menuItem} onPress={handleClearConsole}>
              <IconSymbol
                ios_icon_name="trash.fill"
                android_material_icon_name="delete"
                size={24}
                color={colors.error}
              />
              <View style={styles.menuItemText}>
                <Text style={styles.menuItemTitle}>Pulisci Console</Text>
                <Text style={styles.menuItemDescription}>
                  Cancella tutti i log
                </Text>
              </View>
            </Pressable>

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>ℹ️ Come usare l&apos;ispezione:</Text>
              <Text style={styles.infoText}>
                <Text style={styles.bold}>1. Chrome DevTools:</Text>{'\n'}
                • Premi &apos;j&apos; nella console Expo{'\n'}
                • Oppure apri chrome://inspect{'\n'}
                {'\n'}
                <Text style={styles.bold}>2. React DevTools:</Text>{'\n'}
                • Esegui: npm run devtools{'\n'}
                • Si connetterà automaticamente{'\n'}
                {'\n'}
                <Text style={styles.bold}>3. Menu Sviluppatore:</Text>{'\n'}
                • iOS Simulator: Cmd + D{'\n'}
                • Android Emulator: Cmd + M{'\n'}
                • Dispositivo fisico: Scuoti il dispositivo{'\n'}
                {'\n'}
                <Text style={styles.bold}>4. Console Logs:</Text>{'\n'}
                • Tutti i console.log() appaiono nella console Expo
              </Text>
            </View>

            <View style={styles.platformInfo}>
              <Text style={styles.platformText}>
                Platform: {Platform.OS} {Platform.Version}
              </Text>
              <Text style={styles.platformText}>
                Dev Mode: {__DEV__ ? '✅ Attivo' : '❌ Disattivo'}
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    marginTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuItemText: {
    marginLeft: 16,
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoBox: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  bold: {
    fontWeight: '600',
    color: colors.text,
  },
  platformInfo: {
    marginTop: 20,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  platformText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
});
