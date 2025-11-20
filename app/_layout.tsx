
import "react-native-reanimated";
import React, { useEffect, useState } from "react";
import { useFonts } from "expo-font";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme, Alert, View, Text, StyleSheet, Animated } from "react-native";
import { useNetworkState } from "expo-network";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { Button } from "@/components/button";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { PaymentProvider } from "@/contexts/PaymentContext";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "login",
};

// Custom Splash Screen Component
function CustomSplashScreen({ onFinish }: { onFinish: () => void }) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    // Fade in and scale animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-hide after 2 seconds
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[
        styles.splashContainer,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
        }}
      >
        <Text style={styles.splashLogo}>DROPMARKET</Text>
        <Text style={styles.splashTagline}>Il tuo marketplace dinamico</Text>
      </Animated.View>
    </Animated.View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const networkState = useNetworkState();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [showCustomSplash, setShowCustomSplash] = useState(true);

  useEffect(() => {
    if (loaded && !showCustomSplash) {
      SplashScreen.hideAsync();
    }
  }, [loaded, showCustomSplash]);

  React.useEffect(() => {
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

  if (!loaded || showCustomSplash) {
    return <CustomSplashScreen onFinish={() => setShowCustomSplash(false)} />;
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
            <PaymentProvider>
              <WidgetProvider>
                <GestureHandlerRootView>
                <Stack>
                {/* Login Screen */}
                <Stack.Screen name="login" options={{ headerShown: false }} />

                {/* Main app with tabs */}
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

                {/* Supplier Screens */}
                <Stack.Screen name="supplier/dashboard" options={{ headerShown: false }} />
                <Stack.Screen name="supplier/import-list" options={{ headerShown: false }} />

                {/* Pickup Point Screens */}
                <Stack.Screen name="pickup-point/dashboard" options={{ headerShown: false }} />
                <Stack.Screen name="pickup-point/edit" options={{ headerShown: false }} />

                {/* Drop Details */}
                <Stack.Screen name="drop-details" options={{ headerShown: false }} />

                {/* Payment Screens */}
                <Stack.Screen name="add-payment-method" options={{ headerShown: false }} />

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
            </PaymentProvider>
          </AuthProvider>
        </ThemeProvider>
    </>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashLogo: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 16,
  },
  splashTagline: {
    fontSize: 16,
    fontWeight: '400',
    color: '#CCCCCC',
    textAlign: 'center',
    letterSpacing: 1,
  },
});
