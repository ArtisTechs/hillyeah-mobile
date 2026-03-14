import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { usePathname, useRouter } from "expo-router";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { Colors, Fonts } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

type SideMenuProps = {
  visible: boolean;
  onClose: () => void;
  onPressDashboard: () => void;
  onPressWeather?: () => void;
  onPressWeatherBroadcast?: () => void;
  onPressSignOut: () => void;
  userLabel?: string;
  isBusy?: boolean;
};

export function SideMenu({
  visible,
  onClose,
  onPressDashboard,
  onPressWeather,
  onPressWeatherBroadcast,
  onPressSignOut,
  userLabel,
  isBusy = false,
}: SideMenuProps) {
  const colorScheme = useColorScheme() ?? "light";
  const palette = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const normalizedPath = pathname?.split("?")[0] ?? "";
  const isDashboardActive =
    normalizedPath === "/dashboardScreen" ||
    normalizedPath.endsWith("/dashboardScreen");
  const isWeatherActive =
    normalizedPath === "/weatherBroadcastScreen" ||
    normalizedPath.endsWith("/weatherBroadcastScreen");
  const handlePressWeather =
    onPressWeather ??
    onPressWeatherBroadcast ??
    (() => {
      onClose();
      if (!isWeatherActive) {
        router.push("/weatherBroadcastScreen");
      }
    });

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.overlay}>
        <Pressable onPress={onClose} style={styles.backdrop} />

        <View
          style={[
            styles.menuPanel,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              paddingTop: Math.max(insets.top + 8, 20),
            },
          ]}>
          <View style={styles.headerRow}>
            <View style={styles.brandRow}>
              <View
                style={[
                  styles.brandIconShell,
                  {
                    backgroundColor: palette.surfaceStrong,
                    borderColor: palette.border,
                  },
                ]}>
                <Image
                  contentFit="contain"
                  source={require("@/assets/images/logo.png")}
                  style={styles.brandIcon}
                />
              </View>
              <ThemedText type="subtitle" style={styles.headerTitle}>
                HillYeah
              </ThemedText>
            </View>

            <Pressable
              accessibilityLabel="Close menu"
              hitSlop={8}
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                {
                  backgroundColor: palette.surfaceStrong,
                  borderColor: palette.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <Ionicons color={palette.text} name="close-outline" size={20} />
            </Pressable>
          </View>

          {userLabel ? (
            <View style={styles.userMeta}>
              <ThemedText style={[styles.userMetaCaption, { color: palette.muted }]}>
                Signed in as
              </ThemedText>
              <ThemedText numberOfLines={1} style={[styles.userMetaValue, { color: palette.text }]}>
                {userLabel}
              </ThemedText>
            </View>
          ) : null}

          <Pressable
            accessibilityLabel="Open dashboard"
            disabled={isBusy}
            onPress={onPressDashboard}
            style={({ pressed }) => [
              styles.menuButton,
              {
                backgroundColor: isDashboardActive
                  ? palette.surface
                  : palette.surfaceStrong,
                borderColor: isDashboardActive ? palette.tint : palette.border,
                opacity: pressed || isBusy ? 0.82 : 1,
              },
            ]}>
            <Ionicons
              color={isDashboardActive ? palette.tint : palette.text}
              name="grid-outline"
              size={18}
            />
            <ThemedText
              style={[
                styles.menuButtonLabel,
                isDashboardActive ? { color: palette.tint } : null,
              ]}>
              Dashboard
            </ThemedText>
          </Pressable>

          <Pressable
            accessibilityLabel="Open weather broadcast"
            disabled={isBusy}
            onPress={handlePressWeather}
            style={({ pressed }) => [
              styles.menuButton,
              {
                backgroundColor: isWeatherActive
                  ? palette.surface
                  : palette.surfaceStrong,
                borderColor: isWeatherActive ? palette.tint : palette.border,
                opacity: pressed || isBusy ? 0.82 : 1,
              },
            ]}>
            <Ionicons
              color={isWeatherActive ? palette.tint : palette.text}
              name="partly-sunny-outline"
              size={18}
            />
            <ThemedText
              style={[
                styles.menuButtonLabel,
                isWeatherActive ? { color: palette.tint } : null,
              ]}>
              Weather Broadcast
            </ThemedText>
          </Pressable>

          <Pressable
            accessibilityLabel="Sign out"
            disabled={isBusy}
            onPress={onPressSignOut}
            style={({ pressed }) => [
              styles.menuButton,
              {
                backgroundColor: palette.surfaceStrong,
                borderColor: palette.danger,
                opacity: pressed || isBusy ? 0.82 : 1,
              },
            ]}>
            <Ionicons color={palette.danger} name="log-out-outline" size={18} />
            <ThemedText style={[styles.menuButtonLabel, { color: palette.danger }]}>
              {isBusy ? "Please wait..." : "Sign out"}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.34)",
  },
  menuPanel: {
    borderRightWidth: 1,
    height: "100%",
    paddingHorizontal: 18,
    width: 280,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  brandIconShell: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  brandIcon: {
    height: 22,
    width: 22,
  },
  headerTitle: {
    fontFamily: Fonts.sans,
  },
  closeButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  userMeta: {
    marginTop: 20,
  },
  userMetaCaption: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  userMetaValue: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  menuButton: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  menuButtonLabel: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: "700",
  },
});
