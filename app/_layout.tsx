
import "react-native-reanimated";
import React, { useEffect, useState, useCallback } from "react";
import { useFonts } from "expo-font";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme, Alert, StyleSheet, Animated, AppState, View, Text } from "react-native";
import * as Updates from "expo-updates";
import { useNetworkState } from "expo-network";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { DropInterestProvider } from "@/contexts/DropInterestContext";
import { supabase } from "@/app/integrations/supabase/client";

// Import font
import SpaceMonoFont from "../assets/fonts/SpaceMono-Regular.ttf";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "login",
};

// RDN Brand Splash Screen
function CustomSplashScreen({ onFinish }: { onFinish: () => void }) {
  const [fadeAnim] = useState(new Animated.Value(1));
  const [scaleAnim] = useState(new Animated.Value(0.3));
  const [circleScaleAnim] = useState(new Animated.Value(0));
  const [bgColorAnim] = useState(new Animated.Value(0));
  const [logoScaleAnim] = useState(new Animated.Value(1));
  const [sloganOpacityAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    console.log('[SplashScreen] Starting animation sequence');
    // Phase 1: Logo appare con spring (0-800ms)
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 40, useNativeDriver: false }),
    ]).start(() => {
      // Phase 2: Tagline appare (800-1200ms)
      Animated.timing(sloganOpacityAnim, { toValue: 1, duration: 400, useNativeDriver: false }).start(() => {
        // Phase 3: Cerchio bianco cresce + sfondo diventa bianco (1200-2200ms)
        Animated.parallel([
          Animated.timing(circleScaleAnim, { toValue: 1, duration: 1000, useNativeDriver: false }),
          Animated.timing(bgColorAnim, { toValue: 1, duration: 1000, useNativeDriver: false }),
          Animated.timing(logoScaleAnim, { toValue: 1.1, duration: 500, useNativeDriver: false }),
        ]).start(() => {
          // Phase 4: Fade out (2200-2700ms)
          setTimeout(() => {
            Animated.timing(fadeAnim, { toValue: 0, duration: 500, useNativeDriver: false }).start(() => {
              console.log('[SplashScreen] Animation complete, calling onFinish');
              onFinish();
            });
          }, 300);
        });
      });
    });
  }, [fadeAnim, scaleAnim, circleScaleAnim, bgColorAnim, logoScaleAnim, sloganOpacityAnim, onFinish]);

  const backgroundColor = bgColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#000000', '#FFFFFF'],
  });

  const sloganColor = bgColorAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#CCCCCC', '#999999', '#666666'],
  });

  const combinedScale = scaleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const logoScale = logoScaleAnim.interpolate({
    inputRange: [1, 1.1],
    outputRange: [1, 1.1],
  });

  return (
    <Animated.View style={[splashStyles.container, { backgroundColor, opacity: fadeAnim }]}>
      {/* Cerchio bianco che cresce */}
      <Animated.View
        style={[
          splashStyles.whiteCircle,
          {
            transform: [{
              scale: circleScaleAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 20],
              }),
            }],
          },
        ]}
      />

      {/* Logo + tagline */}
      <Animated.View
        style={{
          transform: [{ scale: combinedScale }, { scale: logoScale }],
          zIndex: 10,
          paddingHorizontal: 20,
          alignItems: 'center',
        }}
      >
        {/* Logo su una riga: RDN STREET STOCK MARKET */}
        <Text style={splashStyles.logoRow}>
          <Text style={{ color: '#F5A623' }}>RDN</Text>
          <Text style={{ color: '#4FC3F7' }}>STREET</Text>
          <Text style={{ color: '#E91E8C' }}>STOCK</Text>
          <Text style={{ color: '#F5A623' }}>MARKET</Text>
        </Text>

        {/* Tagline */}
        <Animated.Text style={[splashStyles.tagline, { color: sloganColor as any, opacity: sloganOpacityAnim }]}>
          Più acquistiamo, più risparmiamo
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const networkState = useNetworkState();
  const [loaded] = useFonts({
    SpaceMono: SpaceMonoFont,
    ...Ionicons.font,
    ...MaterialCommunityIcons.font,
    ...MaterialIcons.font,
  });
  const [showCustomSplash, setShowCustomSplash] = useState(true);

  // Force clean reload on background→active transition in dev to fix HMR disconnection errors
  useEffect(() => {
    if (!__DEV__) return;
    let previousState = AppState.currentState;
    const subscription = AppState.addEventListener('change', (nextState) => {
      console.log('[AppState] transition:', previousState, '->', nextState);
      if (previousState === 'background' && nextState === 'active') {
        console.log('[AppState] Resuming from background in dev — triggering Updates.reloadAsync()');
        Updates.reloadAsync();
      }
      previousState = nextState;
    });
    return () => subscription.remove();
  }, []);

  // Handle deep links for email confirmation and password reset
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      console.log('Deep link received:', url);
      
      try {
        const { hostname, path, queryParams } = Linking.parse(url);
        console.log('Parsed deep link:', { hostname, path, queryParams });

        // Handle email confirmation
        if (path === 'email-confirmed' || hostname === 'email-confirmed') {
          console.log('Email confirmation deep link detected');
          Alert.alert(
            'Email Confermata!',
            'La tua email è stata confermata con successo. Ora puoi accedere all\'app.',
            [{ text: 'OK', onPress: () => router.replace('/login') }]
          );
          return;
        }

        // Handle password reset
        if (path === 'update-password' || hostname === 'update-password') {
          console.log('Password reset deep link detected');
          
          // Check if we have a valid session from the link
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error || !session) {
            console.error('No valid session for password reset:', error);
            Alert.alert(
              'Link Scaduto',
              'Il link per il recupero password è scaduto o non è valido. Richiedi un nuovo link.',
              [{ text: 'OK', onPress: () => router.replace('/forgot-password') }]
            );
          } else {
            console.log('Valid session found, navigating to update-password');
            router.replace('/update-password');
          }
          return;
        }

        // Handle other deep links if needed
        console.log('Unhandled deep link path:', path);
      } catch (error) {
        console.error('Error handling deep link:', error);
      }
    };

    // Get the initial URL if the app was opened via a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('Initial URL:', url);
        handleDeepLink(url);
      }
    });

    // Listen for deep links while the app is running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('URL event:', url);
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Handle push notification taps (background / killed app)
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string> | undefined;
      console.log('[PushNotification] Notification tapped, data:', data);

      if (!data) return;

      switch (data.type) {
        case 'drop_activated':
          console.log('[PushNotification] Routing to drop-details (activated), dropId:', data.dropId);
          router.push({ pathname: '/drop-details', params: { dropId: data.dropId } });
          break;
        case 'drop_ending':
          console.log('[PushNotification] Routing to drop-details (ending), dropId:', data.dropId);
          router.push({ pathname: '/drop-details', params: { dropId: data.dropId } });
          break;
        case 'drop_completed':
          console.log('[PushNotification] Routing to drop-summary, dropId:', data.dropId);
          router.push({ pathname: '/drop-summary', params: { dropId: data.dropId } });
          break;
        case 'order_ready':
          console.log('[PushNotification] Routing to my-bookings, orderId:', data.orderId);
          router.push('/my-bookings');
          break;
        case 'general':
          console.log('[PushNotification] Routing to notifications tab');
          router.push('/(tabs)/notifications');
          break;
        default:
          console.log('[PushNotification] Unhandled notification type:', data.type);
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (loaded && !showCustomSplash) {
      SplashScreen.hideAsync();
    }
  }, [loaded, showCustomSplash]);

  useEffect(() => {
    if (
      !networkState.isConnected &&
      networkState.isInternetReachable === false
    ) {
      Alert.alert(
        "🔌 You are offline",
        "You can keep using the app! Your changes will be saved locally and synced when you are back online."
      );
    }
  }, [networkState.isConnected, networkState.isInternetReachable]);

  const handleSplashFinish = useCallback(() => {
    setShowCustomSplash(false);
  }, []);

  if (!loaded || showCustomSplash) {
    return <CustomSplashScreen onFinish={handleSplashFinish} />;
  }

  const CustomDefaultTheme: Theme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      primary: "rgb(0, 122, 255)", // System Blue
      background: "rgb(242, 242, 247)", // Light mode background
      card: "rgb(255, 255, 255)", // White cards/surfaces
      text: "rgb(0, 0, 0)", // Black text for light mode
      border: "rgb(216, 216, 220)", // Light gray for separators/borders
      notification: "rgb(255, 59, 48)", // System Red
    },
  };

  const CustomDarkTheme: Theme = {
    ...DarkTheme,
    colors: {
      primary: "rgb(10, 132, 255)", // System Blue (Dark Mode)
      background: "rgb(1, 1, 1)", // True black background for OLED displays
      card: "rgb(28, 28, 30)", // Dark card/surface color
      text: "rgb(255, 255, 255)", // White text for dark mode
      border: "rgb(44, 44, 46)", // Dark gray for separators/borders
      notification: "rgb(255, 69, 58)", // System Red (Dark Mode)
    },
  };

  return (
    <>
      <StatusBar style="auto" animated />
      <ThemeProvider
        value={colorScheme === "dark" ? CustomDarkTheme : CustomDefaultTheme}
      >
        <AuthProvider>
          <DropInterestProvider>
          <SubscriptionProvider>
            <WidgetProvider>
              <GestureHandlerRootView>
                <Stack>
                  {/* Login Screen */}
                  <Stack.Screen name="login" options={{ headerShown: false }} />

                  {/* Auth Screens */}
                  <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
                  <Stack.Screen name="update-password" options={{ headerShown: false }} />
                  <Stack.Screen name="register/consumer" options={{ headerShown: false }} />

                  {/* Main app with tabs */}
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

                  {/* Admin Screens */}
                  <Stack.Screen name="admin" options={{ headerShown: false }} />

                  {/* Supplier Screens */}
                  <Stack.Screen name="supplier/dashboard" options={{ headerShown: false }} />
                  <Stack.Screen name="supplier/import-list" options={{ headerShown: false }} />

                  {/* Pickup Point Screens */}
                  <Stack.Screen name="pickup-point" options={{ headerShown: false }} />

                  {/* Drop Details */}
                  <Stack.Screen name="drop-details" options={{ headerShown: false }} />

                  {/* Drop Summary */}
                  <Stack.Screen name="drop-summary" options={{ headerShown: false }} />

                  {/* My Bookings */}
                  <Stack.Screen name="my-bookings" options={{ headerShown: true, title: 'Le Mie Prenotazioni' }} />

                  {/* Profile Screens */}
                  <Stack.Screen name="edit-profile" options={{ headerShown: false }} />

                  {/* Subscription Screens */}
                  <Stack.Screen name="subscription-plans" options={{ headerShown: false }} />

                  {/* Modal Demo Screens */}
                  <Stack.Screen
                    name="modal"
                    options={{
                      presentation: "modal",
                      title: "Standard Modal",
                    }}
                  />
                  <Stack.Screen
                    name="formsheet"
                    options={{
                      presentation: "formSheet",
                      title: "Form Sheet Modal",
                      sheetGrabberVisible: true,
                      sheetAllowedDetents: [0.5, 0.8, 1.0],
                      sheetCornerRadius: 20,
                    }}
                  />
                  <Stack.Screen
                    name="transparent-modal"
                    options={{
                      presentation: "transparentModal",
                      headerShown: false,
                    }}
                  />
                </Stack>
                <SystemBars style={"auto"} />
              </GestureHandlerRootView>
            </WidgetProvider>
          </SubscriptionProvider>
          </DropInterestProvider>
        </AuthProvider>
      </ThemeProvider>
    </>
  );
}

const styles = StyleSheet.create({});

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  whiteCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
  },
  logoRow: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 16,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
