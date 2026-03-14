import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { SideMenu } from "@/components/side-menu";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Fonts } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  getAuthErrorMessage,
  signOutCurrentUser,
  subscribeToAuthState,
  type AuthUser,
} from "@/services/authService";
import {
  fetchWeatherBroadcastByCoordinates,
  getFreeWeatherErrorMessage,
  type WeatherBroadcastSnapshot,
} from "@/services/freeWeatherService";

type Point = { latitude: number; longitude: number };

type BroadcastState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: WeatherBroadcastSnapshot }
  | { status: "error"; message: string };

type WeatherIconTone = "clear" | "cloudy" | "rain" | "severe";
type WeatherVisual = {
  iconName:
    | "sunny-outline"
    | "partly-sunny-outline"
    | "cloudy-outline"
    | "rainy-outline"
    | "thunderstorm-outline"
    | "snow-outline"
    | "water-outline";
  tone: WeatherIconTone;
};

function formatCoordinate(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "--";
  }

  return value.toFixed(5);
}

function formatDateLabel(dateValue: string) {
  if (!dateValue) return "Unknown";

  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

function getBroadcastAdvisory(snapshot: WeatherBroadcastSnapshot) {
  const today = snapshot.daily[0];
  const rainRisk = today?.precipitationProbabilityMax ?? 0;
  const wind = snapshot.current.windKph;

  if (rainRisk >= 75) {
    return "Heavy rain risk is high today. Monitor slope and drainage conditions closely.";
  }

  if (wind >= 40) {
    return "Strong wind conditions expected. Secure light outdoor equipment if present.";
  }

  if (rainRisk >= 50) {
    return "Moderate rain risk today. Keep field checks active in moisture-sensitive zones.";
  }

  return "No major weather hazard signal right now. Continue routine monitoring.";
}

function resolveWeatherVisual(conditionText: string): WeatherVisual {
  const text = conditionText.toLowerCase();

  if (
    text.includes("thunder") ||
    text.includes("storm") ||
    text.includes("tornado") ||
    text.includes("squall")
  ) {
    return { iconName: "thunderstorm-outline", tone: "severe" };
  }

  if (
    text.includes("snow") ||
    text.includes("sleet") ||
    text.includes("hail") ||
    text.includes("blizzard")
  ) {
    return { iconName: "snow-outline", tone: "severe" };
  }

  if (
    text.includes("rain") ||
    text.includes("drizzle") ||
    text.includes("shower")
  ) {
    return { iconName: "rainy-outline", tone: "rain" };
  }

  if (
    text.includes("mist") ||
    text.includes("fog") ||
    text.includes("haze") ||
    text.includes("smoke") ||
    text.includes("dust") ||
    text.includes("sand") ||
    text.includes("ash")
  ) {
    return { iconName: "water-outline", tone: "cloudy" };
  }

  if (text.includes("overcast") || text.includes("cloud")) {
    return { iconName: "cloudy-outline", tone: "cloudy" };
  }

  if (text.includes("clear") || text.includes("sun")) {
    return { iconName: "sunny-outline", tone: "clear" };
  }

  return { iconName: "partly-sunny-outline", tone: "clear" };
}

export default function WeatherBroadcastScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const palette = Colors[colorScheme];
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSideMenuVisible, setIsSideMenuVisible] = useState(false);
  const [authError, setAuthError] = useState("");
  const [broadcastState, setBroadcastState] = useState<BroadcastState>({
    status: "idle",
  });
  const [locationPoint, setLocationPoint] = useState<Point | null>(null);
  const [locationLabel, setLocationLabel] = useState("Current location");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadWeather = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setBroadcastState({ status: "loading" });
    }

    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        throw new Error("Turn on location services to load weather broadcast.");
      }

      let permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        permission = await Location.requestForegroundPermissionsAsync();
      }

      if (permission.status !== "granted") {
        throw new Error(
          "Location permission denied. Enable it in app settings.",
        );
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        mayShowUserSettingsDialog: true,
      });
      const point = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setLocationPoint(point);

      const [weather, places] = await Promise.all([
        fetchWeatherBroadcastByCoordinates(point.latitude, point.longitude),
        Location.reverseGeocodeAsync(point),
      ]);

      const place = places[0];
      if (place) {
        const formatted = [place.city, place.region, place.country]
          .filter(Boolean)
          .join(", ");
        setLocationLabel(formatted || "Current location");
      } else {
        setLocationLabel("Current location");
      }

      setBroadcastState({ status: "ready", data: weather });
    } catch (error) {
      setBroadcastState({
        status: "error",
        message: getFreeWeatherErrorMessage(error),
      });
    } finally {
      setIsRefreshing(false);
    }
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

  useEffect(() => {
    if (isInitializing || !user) return;
    void loadWeather(false);
  }, [isInitializing, user]);

  const advisoryMessage = useMemo(() => {
    if (broadcastState.status !== "ready") return "";
    return getBroadcastAdvisory(broadcastState.data);
  }, [broadcastState]);
  const currentWeatherVisual = useMemo(() => {
    if (broadcastState.status !== "ready") return null;
    return resolveWeatherVisual(broadcastState.data.current.conditionText);
  }, [broadcastState]);
  const currentWeatherIconColor =
    currentWeatherVisual?.tone === "severe"
      ? palette.danger
      : currentWeatherVisual?.tone === "rain"
        ? palette.tint
        : currentWeatherVisual?.tone === "cloudy"
          ? palette.icon
          : palette.warning;

  const handleSignOut = async () => {
    setAuthError("");
    setIsSideMenuVisible(false);
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
      <ThemedView
        style={[styles.loadingScreen, { backgroundColor: palette.background }]}
      >
        <View
          style={[
            styles.loadingCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <ActivityIndicator color={palette.tint} size="large" />
          <ThemedText type="subtitle">Loading weather broadcast...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView
      style={[styles.screen, { backgroundColor: palette.background }]}
    >
      <SideMenu
        isBusy={isSigningOut}
        onClose={() => setIsSideMenuVisible(false)}
        onPressDashboard={() => {
          setIsSideMenuVisible(false);
          router.push("/dashboardScreen");
        }}
        onPressSignOut={handleSignOut}
        userLabel={user?.displayName || user?.email || undefined}
        visible={isSideMenuVisible}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            onRefresh={() => {
              void loadWeather(true);
            }}
            refreshing={isRefreshing}
            tintColor={palette.tint}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dashboardHeader}>
          <Pressable
            accessibilityLabel="Open menu"
            disabled={isSigningOut}
            onPress={() => setIsSideMenuVisible(true)}
            style={({ pressed }) => [
              styles.menuButton,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                opacity: pressed || isSigningOut ? 0.84 : 1,
              },
            ]}
          >
            <Ionicons color={palette.text} name="menu-outline" size={20} />
          </Pressable>

          <View style={styles.dashboardHeaderCopy}>
            <ThemedText
              style={[styles.dashboardEyebrow, { color: palette.success }]}
            >
              Free API
            </ThemedText>
            <ThemedText type="subtitle" style={styles.dashboardTitle}>
              Weather Broadcast
            </ThemedText>
          </View>

          <View
            style={[
              styles.appIconShell,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
          >
            <Image
              contentFit="contain"
              source={require("@/assets/images/logo.png")}
              style={styles.appHeaderIcon}
            />
          </View>
        </View>

        <View
          style={[
            styles.locationCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <View style={styles.locationHeader}>
            <Ionicons color={palette.tint} name="location-outline" size={18} />
            <ThemedText type="subtitle" style={styles.locationTitle}>
              Location
            </ThemedText>
          </View>
          <ThemedText style={[styles.locationLabel, { color: palette.muted }]}>
            {locationLabel}
          </ThemedText>
          <ThemedText
            style={[styles.locationCoordinates, { color: palette.muted }]}
          >
            Lat: {formatCoordinate(locationPoint?.latitude)} | Lon:{" "}
            {formatCoordinate(locationPoint?.longitude)}
          </ThemedText>

          <Pressable
            onPress={() => {
              void loadWeather(true);
            }}
            style={({ pressed }) => [
              styles.refreshButton,
              {
                backgroundColor: palette.surfaceStrong,
                borderColor: palette.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Ionicons color={palette.tint} name="refresh-outline" size={16} />
            <ThemedText
              style={[styles.refreshButtonText, { color: palette.tint }]}
            >
              Refresh weather
            </ThemedText>
          </Pressable>
        </View>

        {authError ? (
          <View
            style={[
              styles.stateCard,
              {
                backgroundColor: palette.surface,
                borderColor: palette.danger,
              },
            ]}
          >
            <Ionicons
              color={palette.danger}
              name="alert-circle-outline"
              size={18}
            />
            <ThemedText style={[styles.stateText, { color: palette.danger }]}>
              {authError}
            </ThemedText>
          </View>
        ) : null}

        {broadcastState.status === "loading" ||
        broadcastState.status === "idle" ? (
          <View
            style={[
              styles.stateCard,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
          >
            <ActivityIndicator color={palette.tint} size="small" />
            <ThemedText style={[styles.stateText, { color: palette.muted }]}>
              Fetching weather update...
            </ThemedText>
          </View>
        ) : null}

        {broadcastState.status === "error" ? (
          <View
            style={[
              styles.stateCard,
              {
                backgroundColor: palette.surface,
                borderColor: palette.danger,
              },
            ]}
          >
            <Ionicons
              color={palette.danger}
              name="alert-circle-outline"
              size={18}
            />
            <ThemedText style={[styles.stateText, { color: palette.danger }]}>
              {broadcastState.message}
            </ThemedText>
          </View>
        ) : null}

        {broadcastState.status === "ready" ? (
          <>
            <View
              style={[
                styles.currentCard,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
            >
              <ThemedText type="subtitle">Current Conditions</ThemedText>
              <View style={styles.currentTempRow}>
                <View
                  style={[
                    styles.currentIconShell,
                    {
                      backgroundColor: palette.surfaceStrong,
                      borderColor: currentWeatherIconColor,
                    },
                  ]}
                >
                  <Ionicons
                    color={currentWeatherIconColor}
                    name={
                      currentWeatherVisual?.iconName ?? "partly-sunny-outline"
                    }
                    size={22}
                  />
                </View>
                <ThemedText
                  style={[styles.currentTemp, { color: palette.text }]}
                >
                  {Math.round(broadcastState.data.current.temperatureC)}°C
                </ThemedText>
              </View>
              <ThemedText
                style={[styles.currentCondition, { color: palette.muted }]}
              >
                {broadcastState.data.current.conditionText}
              </ThemedText>

              <View style={styles.currentMetrics}>
                <ThemedText
                  style={[styles.metricText, { color: palette.muted }]}
                >
                  Feels like:{" "}
                  {Math.round(broadcastState.data.current.feelsLikeC)}°C
                </ThemedText>
                <ThemedText
                  style={[styles.metricText, { color: palette.muted }]}
                >
                  Humidity: {Math.round(broadcastState.data.current.humidity)}%
                </ThemedText>
                <ThemedText
                  style={[styles.metricText, { color: palette.muted }]}
                >
                  Wind: {Math.round(broadcastState.data.current.windKph)} km/h
                </ThemedText>
                <ThemedText
                  style={[styles.metricText, { color: palette.muted }]}
                >
                  Rain now:{" "}
                  {broadcastState.data.current.precipitationMm.toFixed(1)} mm
                </ThemedText>
              </View>
            </View>

            <View
              style={[
                styles.forecastCard,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
            >
              <ThemedText type="subtitle">3-Day Forecast</ThemedText>

              {broadcastState.data.daily.slice(0, 3).map((entry) => (
                <View
                  key={entry.date}
                  style={[
                    styles.forecastRow,
                    {
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <View style={styles.forecastDateCol}>
                    <ThemedText style={styles.forecastDate}>
                      {formatDateLabel(entry.date)}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.forecastCondition,
                        { color: palette.muted },
                      ]}
                    >
                      {entry.conditionText}
                    </ThemedText>
                  </View>
                  <View style={styles.forecastValueCol}>
                    <ThemedText style={styles.forecastTemp}>
                      {Math.round(entry.maxTemperatureC)}° /{" "}
                      {Math.round(entry.minTemperatureC)}°
                    </ThemedText>
                    <ThemedText
                      style={[styles.forecastRain, { color: palette.muted }]}
                    >
                      Rain chance:{" "}
                      {Math.round(entry.precipitationProbabilityMax)}%
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>

            <View
              style={[
                styles.broadcastCard,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
            >
              <View style={styles.broadcastHeader}>
                <Ionicons
                  color={palette.warning}
                  name="megaphone-outline"
                  size={18}
                />
                <ThemedText type="subtitle">Broadcast Advisory</ThemedText>
              </View>
              <ThemedText
                style={[styles.broadcastText, { color: palette.muted }]}
              >
                {advisoryMessage}
              </ThemedText>
              <ThemedText style={[styles.sourceText, { color: palette.muted }]}>
                Source: Open-Meteo free forecast API
              </ThemedText>
            </View>
          </>
        ) : null}
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
    gap: 14,
    paddingHorizontal: 24,
    paddingVertical: 28,
    width: "100%",
  },
  screen: {
    flex: 1,
  },
  content: {
    gap: 14,
    padding: 20,
    paddingBottom: 32,
  },
  dashboardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingTop: 20,
  },
  dashboardHeaderCopy: {
    flex: 1,
  },
  dashboardEyebrow: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  dashboardTitle: {
    fontFamily: Fonts.sans,
    marginTop: 2,
  },
  menuButton: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  appIconShell: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  appHeaderIcon: {
    height: 28,
    width: 28,
  },
  locationCard: {
    borderRadius: 22,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  locationHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  locationTitle: {
    fontFamily: Fonts.sans,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 19,
  },
  locationCoordinates: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    lineHeight: 16,
  },
  refreshButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  refreshButtonText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: "700",
  },
  stateCard: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  stateText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  currentCard: {
    borderRadius: 22,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  currentTemp: {
    fontFamily: Fonts.sans,
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 40,
  },
  currentTempRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-start",
  },
  currentIconShell: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  currentCondition: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  currentMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 8,
    marginTop: 8,
  },
  metricText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "left",
    width: "48%",
  },
  forecastCard: {
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  forecastRow: {
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 14,
    paddingBottom: 10,
  },
  forecastDateCol: {
    flex: 1,
    gap: 2,
  },
  forecastDate: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: "700",
  },
  forecastCondition: {
    fontSize: 13,
    lineHeight: 18,
  },
  forecastValueCol: {
    alignItems: "flex-end",
    minWidth: 120,
  },
  forecastTemp: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: "700",
  },
  forecastRain: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  broadcastCard: {
    borderRadius: 22,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  broadcastHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  broadcastText: {
    fontSize: 14,
    lineHeight: 21,
  },
  sourceText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
