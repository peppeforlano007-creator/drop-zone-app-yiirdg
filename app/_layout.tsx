
import "react-native-reanimated";
import React, { useEffect, useState, useCallback } from "react";
import { useFonts } from "expo-font";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme, Alert, View, Text, StyleSheet, Animated } from "react-native";
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
import { supabase } from "@/app/integrations/supabase/client";

// Import font
import SpaceMonoFont from "../assets/fonts/SpaceMono-Regular.ttf";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "login",
};

// Enhanced Custom Splash Screen Component with improved animation
function CustomSplashScreen({ onFinish }: { onFinish: () => void }) {
  const [fadeAnim] = useState(new Animated.Value(1));
  const [scaleAnim] = useState(new Animated.Value(0.3));
  const [circleScaleAnim] = useState(new Animated.Value(0));
  const [bgColorAnim] = useState(new Animated.Value(0));
  const [logoScaleAnim] = useState(new Animated.Value(1));
  const [sloganOpacityAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Phase 1: Logo appears and scales up (0-800ms)
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: false,
      }),
    ]).start(() => {
      // Phase 2: Show slogan (800-1200ms)
      Animated.timing(sloganOpacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }).start(() => {
        // Phase 3: White circle grows and background transitions (1200-2200ms)
        Animated.parallel([
          Animated.timing(circleScaleAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(bgColorAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(logoScaleAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: false,
          }),
        ]).start(() => {
          // Phase 4: Fade out everything (2200-2700ms)
          setTimeout(() => {
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 500,
              useNativeDriver: false,
            }).start(() => {
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

  const logoColor = bgColorAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#FFFFFF', '#FFFFFF', '#000000'],
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
    <Animated.View
      style={[
        styles.splashContainer,
        {
          backgroundColor,
          opacity: fadeAnim,
        },
      ]}
    >
      {/* Growing white circle */}
      <Animated.View
        style={[
          styles.whiteCircle,
          {
            transform: [
              {
                scale: circleScaleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 20], // Grows to 20x its original size
                }),
              },
            ],
          },
        ]}
      />

      {/* Logo and slogan */}
      <Animated.View
        style={{
          transform: [
            { scale: combinedScale },
            { scale: logoScale },
          ],
          zIndex: 10,
          paddingHorizontal: 40,
        }}
      >
        <Animated.Text style={[styles.splashLogo, { color: logoColor as any }]}>
          DROPMARKET
        </Animated.Text>
        <Animated.Text
          style={[
            styles.splashTagline,
            {
              color: sloganColor as any,
              opacity: sloganOpacityAnim,
            },
          ]}
        >
          Più condividi, più risparmi
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
  });
  const [showCustomSplash, setShowCustomSplash] = useState(true);

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
        </AuthProvider>
      </ThemeProvider>
    </>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
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
  splashLogo: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 16,
  },
  splashTagline: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
