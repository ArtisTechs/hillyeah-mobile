import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { Colors, Fonts } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  getAuthErrorMessage,
  signOutCurrentUser,
  subscribeToAuthState,
  type AuthUser,
} from "@/services/authService";

const metrics = [
  {
    icon: 'pulse-outline' as const,
    label: 'Ground movement',
    value: '0.8 mm/hr',
    tone: 'success' as const,
  },
  {
    icon: 'rainy-outline' as const,
    label: 'Rainfall',
    value: '42 mm / 24h',
    tone: 'warning' as const,
  },
  {
    icon: 'location-outline' as const,
    label: 'Slope tilt',
    value: '3.1 deg',
    tone: 'success' as const,
  },
  {
    icon: 'warning-outline' as const,
    label: 'Alert level',
    value: 'Level 2',
    tone: 'warning' as const,
  },
];

const sectors = [
  { name: 'North Ridge', status: 'Stable', detail: 'Movement below threshold', tone: 'success' as const },
  { name: 'Creek Edge', status: 'Watch', detail: 'Rainfall runoff increasing', tone: 'warning' as const },
  { name: 'Barangay Access Road', status: 'Critical', detail: 'Micro-shifts detected', tone: 'danger' as const },
];

const alerts = [
  {
    title: 'Rain gauge threshold exceeded',
    time: '5 mins ago',
    detail: 'Creek Edge rainfall moved above the watch threshold.',
    tone: 'warning' as const,
  },
  {
    title: 'Ground sensor sync restored',
    time: '18 mins ago',
    detail: 'North Ridge vibration node is back online.',
    tone: 'success' as const,
  },
  {
    title: 'Slope movement anomaly',
    time: '42 mins ago',
    detail: 'Access Road sensor cluster flagged a critical shift pattern.',
    tone: 'danger' as const,
  },
];

export default function DashboardScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const palette = Colors[colorScheme];
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [authError, setAuthError] = useState("");
  const toneColor = {
    success: palette.success,
    warning: palette.warning,
    danger: palette.danger,
  };

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((currentUser) => {
      if (!currentUser) {
        setUser(null);
        setIsInitializing(false);
        router.replace("/loginScreen");
        return;
      }

      setUser(currentUser);
      setIsInitializing(false);
    });

    return unsubscribe;
  }, []);

  const handleSignOut = async () => {
    setAuthError("");
    setIsSigningOut(true);

    try {
      await signOutCurrentUser();
      router.replace("/loginScreen");
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
    } finally {
      setIsSigningOut(false);
    }
  };

  if (isInitializing) {
    return (
      <ThemedView style={[styles.loadingScreen, { backgroundColor: palette.background }]}>
        <View
          style={[
            styles.loadingCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}>
          <ActivityIndicator color={palette.tint} size="large" />
          <ThemedText type="subtitle">Loading dashboard...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.screen, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}>
          <View style={styles.heroTop}>
            <View style={styles.brandRow}>
              <View
                style={[
                  styles.logoBadge,
                  { backgroundColor: palette.surfaceStrong, borderColor: palette.border },
                ]}>
                <Image contentFit="contain" source={require("@/assets/images/logo.png")} style={styles.logo} />
              </View>
              <View style={styles.heroCopy}>
                <ThemedText style={[styles.eyebrow, { color: palette.success }]}>HillYeah Command</ThemedText>
                <ThemedText type="title" style={styles.title}>
                  Landslide early warning dashboard
                </ThemedText>
                <ThemedText style={[styles.userMeta, { color: palette.muted }]}>
                  {user?.displayName || user?.email || "Authenticated user"}
                </ThemedText>
              </View>
            </View>

            <Pressable
              disabled={isSigningOut}
              onPress={handleSignOut}
              style={({ pressed }) => [
                styles.secondaryButton,
                {
                  backgroundColor: palette.surfaceStrong,
                  borderColor: palette.border,
                  opacity: pressed || isSigningOut ? 0.86 : 1,
                },
              ]}>
              <Ionicons color={palette.text} name="log-out-outline" size={18} />
              <ThemedText style={styles.secondaryButtonText}>
                {isSigningOut ? "Signing out..." : "Sign out"}
              </ThemedText>
            </Pressable>
          </View>

          {authError ? (
            <View
              style={[
                styles.errorBanner,
                {
                  backgroundColor: palette.surfaceStrong,
                  borderColor: palette.danger,
                },
              ]}>
              <Ionicons color={palette.danger} name="alert-circle-outline" size={18} />
              <ThemedText style={[styles.errorBannerText, { color: palette.danger }]}>
                {authError}
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.statusRow}>
            <View style={[styles.statusPill, { backgroundColor: palette.success }]}>
              <View style={styles.statusDot} />
              <ThemedText style={styles.statusText}>Stable monitoring state</ThemedText>
            </View>
            <View style={styles.signalTrack}>
              <View style={[styles.signalBar, { height: 12, backgroundColor: palette.success }]} />
              <View style={[styles.signalBar, { height: 18, backgroundColor: palette.success }]} />
              <View style={[styles.signalBar, { height: 24, backgroundColor: palette.warning }]} />
              <View style={[styles.signalBar, { height: 30, backgroundColor: palette.warning }]} />
              <View style={[styles.signalBar, { height: 38, backgroundColor: palette.danger }]} />
            </View>
          </View>

          <View style={styles.heroMeta}>
            <View style={styles.metaItem}>
              <Ionicons color={palette.soil} name="map-outline" size={18} />
              <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                Site: Upper hillside sector
              </ThemedText>
            </View>
            <View style={styles.metaItem}>
              <Ionicons color={palette.tint} name="radio-outline" size={18} />
              <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                14 of 15 sensors reporting
              </ThemedText>
            </View>
            <View style={styles.metaItem}>
              <Ionicons color={palette.warning} name="time-outline" size={18} />
              <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                Last refresh 08:42 PM
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          {metrics.map((metric) => (
            <View
              key={metric.label}
              style={[
                styles.metricCard,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}>
              <View style={styles.metricHeader}>
                <View
                  style={[
                    styles.metricIcon,
                    { backgroundColor: palette.surfaceStrong, borderColor: palette.border },
                  ]}>
                  <Ionicons color={toneColor[metric.tone]} name={metric.icon} size={18} />
                </View>
                <ThemedText style={[styles.metricLabel, { color: palette.muted }]}>
                  {metric.label}
                </ThemedText>
              </View>
              <ThemedText type="subtitle" style={styles.metricValue}>
                {metric.value}
              </ThemedText>
            </View>
          ))}
        </View>

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">Terrain sectors</ThemedText>
            <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
              Stability and movement summary
            </ThemedText>
          </View>

          {sectors.map((sector) => (
            <View key={sector.name} style={[styles.listItem, { borderColor: palette.border }]}>
              <View style={styles.listTitleRow}>
                <ThemedText style={styles.listTitle}>{sector.name}</ThemedText>
                <View style={[styles.severityBadge, { backgroundColor: toneColor[sector.tone] }]}>
                  <ThemedText style={styles.severityText}>{sector.status}</ThemedText>
                </View>
              </View>
              <ThemedText style={[styles.listDetail, { color: palette.muted }]}>
                {sector.detail}
              </ThemedText>
            </View>
          ))}
        </View>

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">Recent alerts</ThemedText>
            <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
              Latest field and sensor events
            </ThemedText>
          </View>

          {alerts.map((alert) => (
            <View key={`${alert.title}-${alert.time}`} style={styles.alertRow}>
              <View style={[styles.alertMarker, { backgroundColor: toneColor[alert.tone] }]} />
              <View style={styles.alertCopy}>
                <View style={styles.alertTitleRow}>
                  <ThemedText style={styles.listTitle}>{alert.title}</ThemedText>
                  <ThemedText style={[styles.alertTime, { color: palette.muted }]}>
                    {alert.time}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.listDetail, { color: palette.muted }]}>
                  {alert.detail}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  loadingCard: {
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 28,
    width: "100%",
  },
  screen: {
    flex: 1,
  },
  content: {
    gap: 18,
    padding: 20,
    paddingBottom: 28,
  },
  heroCard: {
    borderRadius: 28,
    borderWidth: 1,
    gap: 10,
    padding: 20,
  },
  heroTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  brandRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 14,
  },
  logoBadge: {
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    height: 62,
    justifyContent: 'center',
    width: 62,
  },
  logo: {
    height: 40,
    width: 40,
  },
  heroCopy: {
    flex: 1,
    gap: 5,
  },
  userMeta: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  eyebrow: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: Fonts.sans,
    fontSize: 28,
    lineHeight: 34,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    fontFamily: Fonts.sans,
    fontWeight: '700',
  },
  errorBanner: {
    alignItems: "flex-start",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statusPill: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  statusDot: {
    backgroundColor: '#ffffff',
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  statusText: {
    color: '#ffffff',
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '700',
  },
  signalTrack: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 5,
    height: 42,
  },
  signalBar: {
    borderRadius: 999,
    width: 7,
  },
  heroMeta: {
    gap: 10,
    marginTop: 12,
  },
  metaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '500',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    borderRadius: 22,
    borderWidth: 1,
    gap: 14,
    minWidth: '47%',
    padding: 16,
  },
  metricHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  metricIcon: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  metricLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  metricValue: {
    fontFamily: Fonts.sans,
  },
  sectionCard: {
    borderRadius: 26,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  sectionHeader: {
    gap: 2,
  },
  sectionHint: {
    fontSize: 13,
  },
  listItem: {
    borderBottomWidth: 1,
    gap: 8,
    paddingBottom: 14,
    paddingTop: 2,
  },
  listTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  listTitle: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: '700',
  },
  severityBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  severityText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  listDetail: {
    lineHeight: 21,
  },
  alertRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  alertMarker: {
    borderRadius: 999,
    marginTop: 6,
    height: 10,
    width: 10,
  },
  alertCopy: {
    flex: 1,
    gap: 4,
  },
  alertTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  alertTime: {
    fontSize: 12,
    fontWeight: '600',
  },
});
