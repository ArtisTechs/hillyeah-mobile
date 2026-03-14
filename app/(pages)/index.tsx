import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors, Fonts } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { subscribeToAuthState } from "@/services/authService";

export default function OnboardingScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const palette = Colors[colorScheme];
  const fontFamily = Fonts?.sans;
  const { height } = useWindowDimensions();
  const [isBooting, setIsBooting] = useState(true);
  const pulseAnimation = useRef(new Animated.Value(0)).current;
  const features = [
    {
      icon: "analytics-outline",
      label: "Slope Monitoring",
      color: palette.success,
    },
    {
      icon: "warning-outline",
      label: "Real-Time Alerts",
      color: palette.warning,
    },
    {
      icon: "rainy-outline",
      label: "Env Sensors",
      color: palette.soil,
    },
  ] as const;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          duration: 900,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          duration: 900,
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, [pulseAnimation]);

  useEffect(() => {
    const bootStartedAt = Date.now();
    const minimumLoaderDurationMs = 1300;
    let isMounted = true;
    let hasResolvedAuth = false;
    let bootDelayTimeout: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = subscribeToAuthState((user) => {
      if (hasResolvedAuth) {
        return;
      }

      hasResolvedAuth = true;
      const elapsed = Date.now() - bootStartedAt;
      const pendingDelay = Math.max(0, minimumLoaderDurationMs - elapsed);

      bootDelayTimeout = setTimeout(() => {
        if (!isMounted) {
          return;
        }

        if (user) {
          router.replace("/dashboardScreen");
          return;
        }

        setIsBooting(false);
      }, pendingDelay);
    });

    return () => {
      isMounted = false;

      if (bootDelayTimeout) {
        clearTimeout(bootDelayTimeout);
      }

      unsubscribe();
    };
  }, []);

  const heroHeight = Math.max(250, Math.min(360, height * 0.4));
  const loaderScale = pulseAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });
  const loaderOpacity = pulseAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.75, 1],
  });

  if (isBooting) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.background }]}
      >
        <View style={[styles.loaderScreen, { backgroundColor: palette.background }]}>
          <Animated.View
            style={[
              styles.loaderLogoShell,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                opacity: loaderOpacity,
                shadowColor: colorScheme === "dark" ? "#000000" : "#1B4E41",
                transform: [{ scale: loaderScale }],
              },
            ]}
          >
            <Image
              contentFit="contain"
              source={require("@/assets/images/logo.png")}
              style={styles.loaderLogo}
            />
          </Animated.View>
          <Text style={[styles.loaderTitle, { color: palette.text, fontFamily }]}>
            HillYeah
          </Text>
          <Text style={[styles.loaderSubtitle, { color: palette.muted, fontFamily }]}>
            Initializing terrain monitoring...
          </Text>
          <ActivityIndicator
            color={palette.tint}
            size="small"
            style={styles.loaderSpinner}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={[styles.screen, { backgroundColor: palette.background }]}>
        <View pointerEvents="none" style={styles.backgroundLayer}>
          <View
            style={[styles.terrainBlobA, { backgroundColor: palette.surfaceStrong }]}
          />
          <View style={[styles.terrainBlobB, { backgroundColor: palette.surface }]} />
          <View
            style={[styles.terrainLine, styles.terrainLineTop, { borderColor: palette.terrainLine }]}
          />
          <View
            style={[styles.terrainLine, styles.terrainLineMiddle, { borderColor: palette.terrainLine }]}
          />
          <View
            style={[styles.terrainLine, styles.terrainLineBottom, { borderColor: palette.terrainLine }]}
          />
        </View>

        <View
          style={[
            styles.heroCard,
            {
              borderColor: palette.border,
              height: heroHeight,
              shadowColor: colorScheme === "dark" ? "#000000" : "#20352E",
            },
          ]}
        >
          <Image
            contentFit="cover"
            source={require("@/assets/images/hero-photo.png")}
            style={styles.heroPhoto}
          />
          <View
            style={[
              styles.heroDarkOverlay,
              {
                backgroundColor:
                  colorScheme === "dark"
                    ? "rgba(0, 0, 0, 0.44)"
                    : "rgba(16, 38, 32, 0.36)",
              },
            ]}
          />
          <View
            style={[
              styles.heroSoftOverlay,
              {
                backgroundColor:
                  colorScheme === "dark"
                    ? "rgba(142, 207, 159, 0.16)"
                    : "rgba(47, 111, 79, 0.14)",
              },
            ]}
          />
        </View>

        <View style={styles.contentBlock}>
          <Text style={[styles.title, { color: palette.text, fontFamily }]}>
            HillYeah
          </Text>
          <Text style={[styles.subtitle, { color: palette.success, fontFamily }]}>
            Real-Time Landslide Monitoring System
          </Text>
          <Text style={[styles.description, { color: palette.muted, fontFamily }]}>
            Monitor terrain conditions, rainfall, and ground movement in real
            time. Receive early warnings and track landslide risk to help
            protect communities and infrastructure.
          </Text>

          <View style={styles.featureRow}>
            {features.map((feature) => (
              <View key={feature.label} style={styles.featureItem}>
                <View
                  style={[
                    styles.featureIconShell,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                      shadowColor: palette.tint,
                    },
                  ]}
                >
                  <Ionicons
                    color={feature.color}
                    name={feature.icon}
                    size={20}
                  />
                </View>
                <Text style={[styles.featureLabel, { color: palette.text, fontFamily }]}>
                  {feature.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            onPress={() =>
              router.push({ pathname: "/loginScreen", params: { mode: "signup" } })
            }
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: palette.tint },
              { opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Text style={[styles.primaryButtonText, { fontFamily }]}>
              Get Started
            </Text>
          </Pressable>

          <View style={styles.signInRow}>
            <Text style={[styles.signInPrompt, { color: palette.muted, fontFamily }]}>
              Already have an account?{" "}
            </Text>
            <Pressable onPress={() => router.push("/loginScreen")}>
              <Text style={[styles.signInLink, { color: palette.tint, fontFamily }]}>
                Sign In
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loaderScreen: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loaderLogoShell: {
    alignItems: "center",
    borderRadius: 40,
    borderWidth: 1,
    height: 120,
    justifyContent: "center",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    width: 120,
  },
  loaderLogo: {
    height: 74,
    width: 74,
  },
  loaderTitle: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.2,
    marginTop: 18,
  },
  loaderSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    marginTop: 6,
  },
  loaderSpinner: {
    marginTop: 16,
  },
  screen: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 22,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  terrainBlobA: {
    borderTopLeftRadius: 260,
    borderTopRightRadius: 260,
    bottom: -145,
    height: 280,
    left: -30,
    opacity: 0.7,
    position: "absolute",
    right: 90,
  },
  terrainBlobB: {
    borderTopLeftRadius: 220,
    borderTopRightRadius: 220,
    bottom: -165,
    height: 260,
    left: 110,
    opacity: 0.75,
    position: "absolute",
    right: -70,
  },
  terrainLine: {
    borderRadius: 999,
    borderTopWidth: 1,
    opacity: 0.8,
    position: "absolute",
  },
  terrainLineTop: {
    height: 180,
    left: -80,
    right: -30,
    top: 390,
    transform: [{ rotate: "-5deg" }],
  },
  terrainLineMiddle: {
    height: 210,
    left: -70,
    right: -40,
    top: 455,
    transform: [{ rotate: "3deg" }],
  },
  terrainLineBottom: {
    height: 240,
    left: -110,
    right: -20,
    top: 535,
    transform: [{ rotate: "-2deg" }],
  },
  heroCard: {
    borderRadius: 36,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
  },
  heroPhoto: {
    ...StyleSheet.absoluteFillObject,
  },
  heroDarkOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroSoftOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  contentBlock: {
    marginTop: 24,
  },
  title: {
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: -0.7,
    lineHeight: 42,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 25,
    marginTop: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
  },
  featureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  featureItem: {
    alignItems: "center",
    flex: 1,
    gap: 8,
    paddingHorizontal: 5,
  },
  featureIconShell: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    width: 52,
  },
  featureLabel: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
    textAlign: "center",
  },
  footer: {
    marginTop: "auto",
    paddingTop: 18,
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 20,
    justifyContent: "center",
    minHeight: 58,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  signInRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 14,
  },
  signInPrompt: {
    fontSize: 13,
    lineHeight: 18,
  },
  signInLink: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
});
