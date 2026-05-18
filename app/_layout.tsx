
import "react-native-reanimated";
import React, { useEffect, useState, useCallback } from "react";
import { useFonts } from "expo-font";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme, Alert, StyleSheet, Animated, AppState, View } from "react-native";
import * as Updates from "expo-updates";
import { useNetworkState } from "expo-network";
import * as Linking from "expo-linking";
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

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "login",
};

// RDN Brand Splash Screen
function CustomSplashScreen({ onFinish }: { onFinish: () => void }) {
  const [containerOpacity] = useState(new Animated.Value(1));
  const [rdnScale] = useState(new Animated.Value(0.2));
  const [rdnOpacity] = useState(new Animated.Value(0));
  const [streetOpacity] = useState(new Animated.Value(0));
  const [stockOpacity] = useState(new Animated.Value(0));
  const [marketOpacity] = useState(new Animated.Value(0));
  const [taglineOpacity] = useState(new Animated.Value(0));
  const [glowOpacity] = useState(new Animated.Value(0));

  useEffect(() => {
    // Phase 1: RDN appare con spring (0-600ms)
    Animated.parallel([
      Animated.spring(rdnScale, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
      Animated.timing(rdnOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(glowOpacity, { toValue: 0.6, duration: 600, useNativeDriver: true }),
    ]).start(() => {
      // Phase 2: STREET STOCK MARKET appare lettera per lettera (600-1400ms)
      Animated.stagger(120, [
        Animated.timing(streetOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(stockOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(marketOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        // Phase 3: tagline appare (1400-1800ms)
        Animated.timing(taglineOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start(() => {
          // Phase 4: pausa poi fade out (2200-2700ms)
          setTimeout(() => {
            Animated.timing(containerOpacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => {
              onFinish();
            });
          }, 600);
        });
      });
    });
  }, []);

  return (
    <Animated.View style={[splashStyles.container, { opacity: containerOpacity }]}>
      {/* Glow effect dietro RDN */}
      <Animated.View style={[splashStyles.glow, { opacity: glowOpacity }]} />

      {/* Logo RDN grande */}
      <Animated.View style={{ transform: [{ scale: rdnScale }], opacity: rdnOpacity, alignItems: 'center' }}>
        <Animated.Text style={splashStyles.rdnText}>
          <Animated.Text style={{ color: '#F5A623' }}>R</Animated.Text>
          <Animated.Text style={{ color: '#4FC3F7' }}>D</Animated.Text>
          <Animated.Text style={{ color: '#E91E8C' }}>N</Animated.Text>
        </Animated.Text>
      </Animated.View>

      {/* STREET STOCK MARKET sotto */}
      <View style={splashStyles.subtitleRow}>
        <Animated.Text style={[splashStyles.streetText, { opacity: streetOpacity }]}>STREET </Animated.Text>
        <Animated.Text style={[splashStyles.stockText, { opacity: stockOpacity }]}>STOCK </Animated.Text>
        <Animated.Text style={[splashStyles.marketText, { opacity: marketOpacity }]}>MARKET</Animated.Text>
      </View>

      {/* Tagline */}
      <Animated.Text style={[splashStyles.tagline, { opacity: taglineOpacity }]}>
        Più condividi, più risparmi
      </Animated.Text>
    </Animated.View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const networkState = useNetworkState();
  const [loaded] = useFonts({
    SpaceMono: SpaceMonoFont,
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
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#4FC3F7',
  },
  rdnText: {
    fontSize: 96,
    fontWeight: '900',
    letterSpacing: 8,
    textAlign: 'center',
  },
  subtitleRow: {
    flexDirection: 'row',
    marginTop: 8,
    alignItems: 'center',
  },
  streetText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F5A623',
    letterSpacing: 3,
  },
  stockText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E91E8C',
    letterSpacing: 3,
  },
  marketText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4FC3F7',
    letterSpacing: 3,
  },
  tagline: {
    marginTop: 32,
    fontSize: 14,
    color: '#888888',
    letterSpacing: 1,
    fontWeight: '400',
  },
});
