import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

interface GoogleSearchModalProps {
  visible: boolean;
  onClose: () => void;
  productName: string;
}

export default function GoogleSearchModal({
  visible,
  onClose,
  productName,
}: GoogleSearchModalProps) {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);

  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(productName)}`;

  const handleClose = () => {
    console.log('[GoogleSearchModal] Close button pressed for product:', productName);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleOpenExternal = () => {
    console.log('[GoogleSearchModal] Opening externally:', searchUrl);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(searchUrl);
  };

  const handleLoadStart = () => {
    console.log('[GoogleSearchModal] WebView load started:', searchUrl);
    setIsLoading(true);
  };

  const handleLoadEnd = () => {
    console.log('[GoogleSearchModal] WebView load finished:', searchUrl);
    setIsLoading(false);
  };

  const headerHeight = 56 + insets.top;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View style={[styles.header, { paddingTop: insets.top, height: headerHeight }]}>
        <Pressable
          style={styles.closeButton}
          onPress={handleClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <IconSymbol
            ios_icon_name="xmark"
            android_material_icon_name="close"
            size={20}
            color={colors.text}
          />
        </Pressable>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {productName}
        </Text>

        <Pressable
          style={styles.externalButton}
          onPress={handleOpenExternal}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.externalButtonText}>Apri nel browser</Text>
        </Pressable>
      </View>

      <View style={styles.webviewContainer}>
        <WebView
          source={{ uri: searchUrl }}
          style={styles.webview}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={(e) => {
            console.error('[GoogleSearchModal] WebView error:', e.nativeEvent);
            setIsLoading(false);
          }}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState={false}
          userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        />

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.info} />
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  headerTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginHorizontal: 12,
    textAlign: 'center',
  },
  externalButton: {
    flexShrink: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  externalButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.info,
  },
  webviewContainer: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
