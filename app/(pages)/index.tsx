import { router } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useEffect } from "react";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { subscribeToAuthState } from "@/services/authService";

export default function PagesIndex() {
  const colorScheme = useColorScheme() ?? "light";
  const palette = Colors[colorScheme];

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((user) => {
      router.replace(user ? "/dashboardScreen" : "/loginScreen");
    });

    return unsubscribe;
  }, []);

  return (
    <ThemedView style={[styles.screen, { backgroundColor: palette.background }]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
          },
        ]}
      >
        <ActivityIndicator color={palette.tint} size="large" />
        <ThemedText type="subtitle">Checking session...</ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 28,
    width: "100%",
  },
});
