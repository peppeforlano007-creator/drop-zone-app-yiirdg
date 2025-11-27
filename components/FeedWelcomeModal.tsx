
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FeedWelcomeModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function FeedWelcomeModal({ visible, onClose }: FeedWelcomeModalProps) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }
  }, [visible, scaleAnim, fadeAnim, slideAnim]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <LinearGradient
          colors={['rgba(139, 69, 255, 0.95)', 'rgba(255, 107, 107, 0.95)', 'rgba(255, 193, 7, 0.95)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBackground}
        >
          <Animated.View
            style={[
              styles.container,
              {
                opacity: fadeAnim,
                transform: [
                  { scale: scaleAnim },
                  { translateY: slideAnim },
                ],
              },
            ]}
          >
            {/* Close Button */}
            <Pressable
              style={styles.closeButton}
              onPress={handleClose}
            >
              <View style={styles.closeButtonCircle}>
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={24}
                  color="#FFF"
                />
              </View>
            </Pressable>

            {/* Content */}
            <View style={styles.content}>
              {/* Icon */}
              <View style={styles.iconContainer}>
                <View style={styles.iconCircle}>
                  <IconSymbol
                    ios_icon_name="sparkles"
                    android_material_icon_name="auto_awesome"
                    size={64}
                    color="#FFF"
                  />
                </View>
              </View>

              {/* Title */}
              <Text style={styles.title}>Naviga, Condividi e Risparmia!</Text>

              {/* Description */}
              <View style={styles.descriptionContainer}>
                <View style={styles.featureRow}>
                  <View style={styles.featureBullet}>
                    <IconSymbol
                      ios_icon_name="hand.tap.fill"
                      android_material_icon_name="touch_app"
                      size={24}
                      color="#FFD700"
                    />
                  </View>
                  <Text style={styles.featureText}>
                    Naviga il feed e lascia interesse sui prodotti che ti piacciono
                  </Text>
                </View>

                <View style={styles.featureRow}>
                  <View style={styles.featureBullet}>
                    <IconSymbol
                      ios_icon_name="person.3.fill"
                      android_material_icon_name="groups"
                      size={24}
                      color="#FFD700"
                    />
                  </View>
                  <Text style={styles.featureText}>
                    Più utenti della tua città mostrano interesse sulla stessa lista
                  </Text>
                </View>

                <View style={styles.featureRow}>
                  <View style={styles.featureBullet}>
                    <IconSymbol
                      ios_icon_name="bolt.fill"
                      android_material_icon_name="flash_on"
                      size={24}
                      color="#FFD700"
                    />
                  </View>
                  <Text style={styles.featureText}>
                    Maggiore è l&apos;interesse, maggiore è la probabilità di attivare un drop
                  </Text>
                </View>

                <View style={styles.featureRow}>
                  <View style={styles.featureBullet}>
                    <IconSymbol
                      ios_icon_name="tag.fill"
                      android_material_icon_name="local_offer"
                      size={24}
                      color="#FFD700"
                    />
                  </View>
                  <Text style={styles.featureText}>
                    Quando il drop si attiva, ottieni sconti fino al 90%!
                  </Text>
                </View>
              </View>

              {/* CTA */}
              <View style={styles.ctaContainer}>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>FINO AL</Text>
                  <Text style={styles.discountPercentage}>90%</Text>
                  <Text style={styles.discountText}>DI SCONTO</Text>
                </View>
              </View>

              {/* Bottom Text */}
              <Text style={styles.bottomText}>
                Inizia a navigare e scopri le migliori offerte della tua città!
              </Text>
            </View>
          </Animated.View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  gradientBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: SCREEN_WIDTH * 0.9,
    maxWidth: 500,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 24,
    padding: 24,
    paddingTop: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  closeButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(139, 69, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(139, 69, 255, 0.4)',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  descriptionContainer: {
    width: '100%',
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  featureBullet: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 69, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
    fontWeight: '500',
  },
  ctaContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  discountBadge: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 1.5,
  },
  discountPercentage: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFF',
    lineHeight: 52,
    marginVertical: 4,
  },
  bottomText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
});
