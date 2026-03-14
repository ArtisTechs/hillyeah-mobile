import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { Image } from "expo-image";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

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
import { subscribeToSensor, type SensorData } from "@/services/sensorService";
import {
  fetchCurrentWeatherByCoordinates,
  getWeatherErrorMessage,
  type CurrentWeather,
} from "@/services/weatherService";

type MetricTone = "success" | "warning" | "danger";
type LandslideAlertLevel = "warning" | "danger";
type Point = { latitude: number; longitude: number };

const LANDSLIDE_WARNING_CHANNEL_ID = "landslide-warning-v2";
const LANDSLIDE_DANGER_CHANNEL_ID = "landslide-danger-v2";

type WeatherState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: CurrentWeather }
  | { status: "error"; message: string }
  | { status: "missing-key"; message: string };

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

  return value.toFixed(6);
}

function getGreeting(name: string) {
  const hour = new Date().getHours();
  const baseGreeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return `${baseGreeting}, ${name}`;
}

function getContrastingTextColor(hexColor: string) {
  const normalized = hexColor.replace("#", "");
  if (normalized.length !== 6) return "#f7f7f7";

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.62 ? "#1a1a1a" : "#f7f7f7";
}

function resolveMetricTones(sensorData: SensorData | null) {
  const tiltMagnitude = Math.abs(sensorData?.tilt ?? 0);
  const moistureTone: MetricTone =
    sensorData && sensorData.moisture >= 65
      ? "danger"
      : sensorData && sensorData.moisture >= 40
        ? "warning"
        : "success";
  const vibrationTone: MetricTone =
    sensorData && sensorData.vibration >= 20
      ? "danger"
      : sensorData && sensorData.vibration >= 15
        ? "warning"
        : "success";
  const tiltTone: MetricTone =
    sensorData && tiltMagnitude >= 15
      ? "danger"
      : sensorData && tiltMagnitude >= 7
        ? "warning"
        : "success";

  return { moistureTone, vibrationTone, tiltTone };
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

function resolveSensorLocation(sensorData: SensorData | null): Point | null {
  if (!sensorData) return null;

  const latitude = sensorData.location?.latitude ?? sensorData.latitude;
  const longitude = sensorData.location?.longitude ?? sensorData.longitude;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

function createLeafletHtml(
  center: Point,
  userLocation: Point | null,
  sensorLocation: Point | null,
) {
  const hasUser = Boolean(userLocation);
  const hasSensor = Boolean(sensorLocation);
  const userLat = userLocation?.latitude ?? center.latitude;
  const userLon = userLocation?.longitude ?? center.longitude;
  const sensorLat = sensorLocation?.latitude ?? center.latitude;
  const sensorLon = sensorLocation?.longitude ?? center.longitude;

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
      html, body, #map {
        height: 100%;
        margin: 0;
        padding: 0;
      }
      .leaflet-control-attribution {
        font-size: 10px;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      const map = L.map("map", { zoomControl: true }).setView([${center.latitude}, ${center.longitude}], 14);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
      }).addTo(map);

      const points = [];
      const hasUser = ${hasUser ? "true" : "false"};
      const hasSensor = ${hasSensor ? "true" : "false"};

      if (hasUser) {
        const userMarker = L.circleMarker([${userLat}, ${userLon}], {
          radius: 8,
          color: "#2f6ff0",
          fillColor: "#2f6ff0",
          fillOpacity: 0.95,
          weight: 2
        }).addTo(map).bindPopup("Your location");
        points.push(userMarker.getLatLng());
      }

      if (hasSensor) {
        const sensorMarker = L.circleMarker([${sensorLat}, ${sensorLon}], {
          radius: 8,
          color: "#d2432f",
          fillColor: "#d2432f",
          fillOpacity: 0.95,
          weight: 2
        }).addTo(map).bindPopup("Sensor location");
        points.push(sensorMarker.getLatLng());
      }

      if (points.length > 1) {
        map.fitBounds(L.latLngBounds(points).pad(0.35));
      } else if (points.length === 1) {
        map.setView(points[0], 15);
      }

      setTimeout(() => map.invalidateSize(), 100);
    </script>
  </body>
</html>`;
}

export default function DashboardScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const palette = Colors[colorScheme];
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSideMenuVisible, setIsSideMenuVisible] = useState(false);
  const [authError, setAuthError] = useState("");
  const [weatherState, setWeatherState] = useState<WeatherState>({
    status: "idle",
  });
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [userLocation, setUserLocation] = useState<Point | null>(null);
  const [locationLabel, setLocationLabel] = useState("Current location");
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "loading" | "ready" | "denied" | "error"
  >("idle");
  const [locationRequestNonce, setLocationRequestNonce] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasNotificationPermission, setHasNotificationPermission] =
    useState(false);
  const [activeLandslideAlert, setActiveLandslideAlert] =
    useState<LandslideAlertLevel | null>(null);
  const [isLandslideModalVisible, setIsLandslideModalVisible] = useState(false);
  const lastTriggeredAlertRef = useRef<LandslideAlertLevel | null>(null);
  const alertLoopSoundRef = useRef<Audio.Sound | null>(null);
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

  useEffect(() => {
    const unsubscribe = subscribeToSensor((data) => {
      setSensorData(data);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const prepareNotifications = async () => {
      try {
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync(LANDSLIDE_WARNING_CHANNEL_ID, {
            name: "Possible landslide alerts",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 200, 250],
            lockscreenVisibility:
              Notifications.AndroidNotificationVisibility.PUBLIC,
            sound: "warning.wav",
          });

          await Notifications.setNotificationChannelAsync(LANDSLIDE_DANGER_CHANNEL_ID, {
            name: "Landslide danger alerts",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 200, 250],
            lockscreenVisibility:
              Notifications.AndroidNotificationVisibility.PUBLIC,
            sound: "danger.wav",
          });
        }

        const currentPermission = await Notifications.getPermissionsAsync();
        let finalStatus = currentPermission.status;
        if (finalStatus !== "granted") {
          const requestedPermission =
            await Notifications.requestPermissionsAsync();
          finalStatus = requestedPermission.status;
        }

        if (isMounted) {
          setHasNotificationPermission(finalStatus === "granted");
        }
      } catch (error) {
        console.error("Failed to prepare notifications:", error);
        if (isMounted) {
          setHasNotificationPermission(false);
        }
      }
    };

    void prepareNotifications();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    let locationSubscription: Location.LocationSubscription | null = null;

    const syncLocation = async () => {
      setLocationStatus("loading");

      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          if (!isMounted) return;
          setLocationStatus("error");
          setWeatherState({
            status: "error",
            message: "Turn on location services to load your weather.",
          });
          return;
        }

        let permission = await Location.getForegroundPermissionsAsync();
        if (permission.status !== "granted") {
          permission = await Location.requestForegroundPermissionsAsync();
        }

        if (permission.status !== "granted") {
          if (!isMounted) return;
          setLocationStatus("denied");
          setWeatherState({
            status: "error",
            message:
              "Location permission is blocked. Enable it in app settings.",
          });
          return;
        }

        const lastKnown = await Location.getLastKnownPositionAsync();
        if (isMounted && lastKnown) {
          setUserLocation({
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
          });
          setLocationStatus("ready");
        }

        const currentPosition = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          mayShowUserSettingsDialog: true,
        });

        if (!isMounted) return;

        setUserLocation({
          latitude: currentPosition.coords.latitude,
          longitude: currentPosition.coords.longitude,
        });
        setLocationStatus("ready");

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 25,
            timeInterval: 30000,
          },
          (position) => {
            if (!isMounted) return;
            setUserLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            setLocationStatus("ready");
          },
        );
      } catch (error) {
        console.error("Failed to resolve current location:", error);
        if (!isMounted) return;

        setLocationStatus("error");
        setWeatherState({
          status: "error",
          message: "Unable to detect your location. Check GPS and try again.",
        });
      }
    };

    void syncLocation();

    return () => {
      isMounted = false;
      locationSubscription?.remove();
    };
  }, [locationRequestNonce]);

  useEffect(() => {
    if (!userLocation) {
      setLocationLabel("Current location");
      return;
    }

    let isMounted = true;

    Location.reverseGeocodeAsync(userLocation)
      .then((places) => {
        if (!isMounted) return;

        const place = places[0];
        if (!place) {
          setLocationLabel("Current location");
          return;
        }

        const formatted = [place.city, place.region, place.country]
          .filter(Boolean)
          .join(", ");
        setLocationLabel(formatted || "Current location");
      })
      .catch(() => {
        if (!isMounted) return;
        setLocationLabel("Current location");
      });

    return () => {
      isMounted = false;
    };
  }, [userLocation]);

  useEffect(() => {
    if (locationStatus !== "ready" || !userLocation) {
      return;
    }

    const rawWeatherApiKey =
      process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY ??
      process.env.EXPO_PUBLIC_WEATHERAPI_KEY ??
      "";
    const apiKey = rawWeatherApiKey.trim().replace(/^['"]|['"]$/g, "");
    if (!apiKey) {
      setWeatherState({
        status: "missing-key",
        message: "Add EXPO_PUBLIC_OPENWEATHER_API_KEY to show weather.",
      });
      return;
    }

    let isMounted = true;
    setWeatherState({ status: "loading" });

    fetchCurrentWeatherByCoordinates(
      userLocation.latitude,
      userLocation.longitude,
      apiKey,
    )
      .then((weather) => {
        if (!isMounted) return;
        setWeatherState({ status: "ready", data: weather });
      })
      .catch((error) => {
        if (!isMounted) return;
        setWeatherState({
          status: "error",
          message: getWeatherErrorMessage(error),
        });
      });

    return () => {
      isMounted = false;
    };
  }, [locationStatus, userLocation]);

  const sensorLocation = useMemo(
    () => resolveSensorLocation(sensorData),
    [sensorData],
  );
  const mapCenter = useMemo(
    () => userLocation ?? sensorLocation,
    [sensorLocation, userLocation],
  );
  const leafletHtml = useMemo(() => {
    if (!mapCenter) return null;

    return createLeafletHtml(mapCenter, userLocation, sensorLocation);
  }, [mapCenter, sensorLocation, userLocation]);

  const riskTones = useMemo(() => resolveMetricTones(sensorData), [sensorData]);
  const landslideAlertLevel = useMemo<LandslideAlertLevel | null>(() => {
    if (!sensorData) return null;

    const allDanger =
      riskTones.moistureTone === "danger" &&
      riskTones.vibrationTone === "danger" &&
      riskTones.tiltTone === "danger";
    if (allDanger) return "danger";

    const allWarning =
      riskTones.moistureTone === "warning" &&
      riskTones.vibrationTone === "warning" &&
      riskTones.tiltTone === "warning";
    if (allWarning) return "warning";

    return null;
  }, [riskTones, sensorData]);

  const metrics = useMemo(() => {
    return [
      {
        icon: "water-outline" as const,
        label: "Moisture",
        value: sensorData ? `${sensorData.moisture.toFixed(0)}%` : "--",
        tone: riskTones.moistureTone,
      },
      {
        icon: "pulse-outline" as const,
        label: "Vibration",
        value: sensorData ? sensorData.vibration.toFixed(2) : "--",
        tone: riskTones.vibrationTone,
      },
      {
        icon: "speedometer-outline" as const,
        label: "Tilt",
        value: sensorData ? `${sensorData.tilt.toFixed(2)}°` : "--",
        tone: riskTones.tiltTone,
      },
      {
        icon: "location-outline" as const,
        label: "Sensor location",
        value: sensorLocation
          ? `Lat: ${formatCoordinate(sensorLocation.latitude)}\nLon: ${formatCoordinate(sensorLocation.longitude)}`
          : "--",
        tone: "success" as const,
        compact: true as const,
      },
    ];
  }, [riskTones, sensorData, sensorLocation]);

  const preferredName =
    user?.displayName?.trim()?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "there";
  const greeting = getGreeting(preferredName);
  const weatherLocationLabel = locationLabel;
  const weatherVisual = useMemo(() => {
    if (weatherState.status !== "ready") return null;
    return resolveWeatherVisual(weatherState.data.conditionText);
  }, [weatherState]);
  const weatherIconColor =
    weatherVisual?.tone === "severe"
      ? palette.danger
      : weatherVisual?.tone === "rain"
        ? palette.tint
        : weatherVisual?.tone === "cloudy"
          ? palette.icon
          : palette.warning;
  const isAuthActionInProgress = isSigningOut;
  const showLocationRetry =
    weatherState.status !== "loading" &&
    weatherState.status !== "ready" &&
    weatherState.status !== "missing-key";

  const requestLocationRefresh = () => {
    setWeatherState({ status: "idle" });
    setLocationRequestNonce((current) => current + 1);
  };

  const handleDashboardFromMenu = () => {
    setIsSideMenuVisible(false);
  };

  const handleRetryLocation = () => {
    requestLocationRefresh();
  };

  const handlePullToRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    requestLocationRefresh();
  };

  useEffect(() => {
    if (!isRefreshing) return;

    const isLocationSettled = locationStatus !== "loading";
    const isWeatherSettled =
      weatherState.status !== "idle" && weatherState.status !== "loading";
    if (isLocationSettled && isWeatherSettled) {
      setIsRefreshing(false);
    }
  }, [isRefreshing, locationStatus, weatherState.status]);

  const stopAlertLoopSound = useCallback(async () => {
    if (!alertLoopSoundRef.current) return;

    try {
      await alertLoopSoundRef.current.stopAsync();
    } catch {
      // no-op: sound might already be stopped
    }

    try {
      await alertLoopSoundRef.current.unloadAsync();
    } catch {
      // no-op: sound might already be unloaded
    }

    alertLoopSoundRef.current = null;
  }, []);

  useEffect(() => {
    if (!isLandslideModalVisible || !activeLandslideAlert) {
      void stopAlertLoopSound();
      return;
    }

    let isActive = true;

    const startAlertLoop = async () => {
      await stopAlertLoopSound();

      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        const soundSource =
          activeLandslideAlert === "danger"
            ? require("../../assets/sounds/danger.wav")
            : require("../../assets/sounds/warning.wav");
        const { sound } = await Audio.Sound.createAsync(soundSource, {
          isLooping: true,
          shouldPlay: true,
          volume: 1,
        });

        if (!isActive) {
          await sound.unloadAsync();
          return;
        }

        alertLoopSoundRef.current = sound;
      } catch (error) {
        console.error("Failed to play landslide alert loop:", error);
      }
    };

    void startAlertLoop();

    return () => {
      isActive = false;
      void stopAlertLoopSound();
    };
  }, [activeLandslideAlert, isLandslideModalVisible, stopAlertLoopSound]);

  useEffect(() => {
    if (!sensorData) {
      return;
    }

    if (!landslideAlertLevel) {
      lastTriggeredAlertRef.current = null;
      return;
    }

    if (lastTriggeredAlertRef.current === landslideAlertLevel) {
      return;
    }

    lastTriggeredAlertRef.current = landslideAlertLevel;
    setActiveLandslideAlert(landslideAlertLevel);
    setIsLandslideModalVisible(true);

    const title =
      landslideAlertLevel === "danger"
        ? "Landslide Danger Alert"
        : "Possible Landslide Alert";
    const body =
      landslideAlertLevel === "danger"
        ? "All landslide indicators are at DANGER level. Move to a safer area immediately."
        : "All landslide indicators are at POSSIBLE DANGER level. Stay alert and prepare for evacuation.";
    const notificationSound =
      landslideAlertLevel === "danger" ? "danger.wav" : "warning.wav";
    const notificationChannelId =
      landslideAlertLevel === "danger"
        ? LANDSLIDE_DANGER_CHANNEL_ID
        : LANDSLIDE_WARNING_CHANNEL_ID;

    const sendAlertNotification = async () => {
      if (!hasNotificationPermission) return;

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: {
              severity: landslideAlertLevel,
              type: "landslide-alert",
            },
            sound: notificationSound,
          },
          trigger:
            Platform.OS === "android"
              ? { channelId: notificationChannelId }
              : null,
        });
      } catch (error) {
        console.error("Failed to send landslide notification:", error);
      }
    };

    void sendAlertNotification();
  }, [hasNotificationPermission, landslideAlertLevel, sensorData]);

  const handleCloseLandslideModal = () => {
    setIsLandslideModalVisible(false);
    void stopAlertLoopSound();
  };

  const landslideModalToneColor =
    activeLandslideAlert === "danger" ? palette.danger : palette.warning;
  const landslideModalForeground = getContrastingTextColor(
    landslideModalToneColor,
  );
  const landslideModalTitle =
    activeLandslideAlert === "danger"
      ? "Landslide Danger Alert"
      : "Possible Landslide Alert";
  const landslideModalMessage =
    activeLandslideAlert === "danger"
      ? "Soil moisture, vibration, and tilt are all in the red zone. Evacuate to a safe area and notify nearby people."
      : "Soil moisture, vibration, and tilt are all in the orange zone. Keep monitoring closely and prepare to move if conditions worsen.";

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
          <ThemedText type="subtitle">Loading dashboard...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView
      style={[styles.screen, { backgroundColor: palette.background }]}
    >
      <SideMenu
        isBusy={isAuthActionInProgress}
        onClose={() => setIsSideMenuVisible(false)}
        onPressDashboard={handleDashboardFromMenu}
        onPressSignOut={handleSignOut}
        userLabel={user?.displayName || user?.email || undefined}
        visible={isSideMenuVisible}
      />

      <Modal
        animationType="fade"
        onRequestClose={handleCloseLandslideModal}
        transparent
        visible={isLandslideModalVisible && Boolean(activeLandslideAlert)}
      >
        <View style={styles.alertModalOverlay}>
          <View
            style={[
              styles.alertModalCard,
              {
                backgroundColor: palette.surface,
                borderColor: landslideModalToneColor,
              },
            ]}
          >
            <View
              style={[
                styles.alertModalBadge,
                { backgroundColor: landslideModalToneColor },
              ]}
            >
              <Ionicons
                color={landslideModalForeground}
                name="warning"
                size={16}
              />
              <ThemedText
                style={[
                  styles.alertModalBadgeText,
                  { color: landslideModalForeground },
                ]}
              >
                {activeLandslideAlert === "danger" ? "RED" : "ORANGE"}
              </ThemedText>
            </View>

            <ThemedText type="subtitle" style={styles.alertModalTitle}>
              {landslideModalTitle}
            </ThemedText>
            <ThemedText
              style={[styles.alertModalMessage, { color: palette.muted }]}
            >
              {landslideModalMessage}
            </ThemedText>

            <Pressable
              onPress={handleCloseLandslideModal}
              style={({ pressed }) => [
                styles.alertModalButton,
                {
                  backgroundColor: landslideModalToneColor,
                  opacity: pressed ? 0.86 : 1,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.alertModalButtonText,
                  { color: landslideModalForeground },
                ]}
              >
                Acknowledge
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[palette.tint]}
            onRefresh={handlePullToRefresh}
            progressBackgroundColor={palette.surface}
            refreshing={isRefreshing}
            tintColor={palette.tint}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dashboardHeader}>
          <Pressable
            accessibilityLabel="Open menu"
            disabled={isAuthActionInProgress}
            onPress={() => setIsSideMenuVisible(true)}
            style={({ pressed }) => [
              styles.menuButton,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                opacity: pressed || isAuthActionInProgress ? 0.84 : 1,
              },
            ]}
          >
            <Ionicons color={palette.text} name="menu-outline" size={20} />
          </Pressable>

          <View style={styles.dashboardHeaderCopy}>
            <ThemedText
              style={[styles.dashboardEyebrow, { color: palette.success }]}
            >
              Monitoring
            </ThemedText>
            <ThemedText type="subtitle" style={styles.dashboardTitle}>
              Dashboard
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
            styles.heroCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroCopy}>
              <ThemedText style={[styles.eyebrow, { color: palette.success }]}>
                {greeting}
              </ThemedText>
              <ThemedText type="title" style={styles.title}>
                Current weather
              </ThemedText>
              <ThemedText style={[styles.userMeta, { color: palette.muted }]}>
                {weatherLocationLabel}
              </ThemedText>
            </View>
          </View>

          <View
            style={[
              styles.weatherCard,
              {
                backgroundColor: palette.surfaceStrong,
                borderColor: palette.border,
              },
            ]}
          >
            {weatherState.status === "loading" ? (
              <View style={styles.weatherLoadingRow}>
                <ActivityIndicator color={palette.tint} size="small" />
                <ThemedText
                  style={[styles.weatherMessage, { color: palette.muted }]}
                >
                  Loading weather for your location...
                </ThemedText>
              </View>
            ) : null}

            {weatherState.status === "ready" ? (
              <View style={styles.weatherContent}>
                <View style={styles.weatherSummaryRow}>
                  <View
                    style={[
                      styles.weatherIconShell,
                      {
                        backgroundColor: palette.surface,
                        borderColor: weatherIconColor,
                      },
                    ]}
                  >
                    <Ionicons
                      color={weatherIconColor}
                      name={weatherVisual?.iconName ?? "partly-sunny-outline"}
                      size={28}
                    />
                  </View>
                  <View style={styles.weatherCopy}>
                    <ThemedText type="subtitle" style={styles.weatherTemp}>
                      {Math.round(weatherState.data.temperatureC)}°C
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.weatherCondition,
                        { color: palette.muted },
                      ]}
                    >
                      {weatherState.data.conditionText}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.weatherMetaRow}>
                  <ThemedText
                    style={[styles.weatherMetaText, { color: palette.muted }]}
                  >
                    Feels like: {Math.round(weatherState.data.feelsLikeC)}°C
                  </ThemedText>
                  <ThemedText
                    style={[styles.weatherMetaText, { color: palette.muted }]}
                  >
                    Humidity: {Math.round(weatherState.data.humidity)}%
                  </ThemedText>
                  <ThemedText
                    style={[styles.weatherMetaText, { color: palette.muted }]}
                  >
                    Wind: {Math.round(weatherState.data.windKph)} km/h
                  </ThemedText>
                </View>
              </View>
            ) : null}

            {weatherState.status === "missing-key" ||
            weatherState.status === "error" ? (
              <View style={styles.weatherLoadingRow}>
                <Ionicons
                  color={palette.warning}
                  name="partly-sunny-outline"
                  size={18}
                />
                <ThemedText
                  style={[styles.weatherMessage, { color: palette.muted }]}
                >
                  {weatherState.message}
                </ThemedText>
              </View>
            ) : null}

            {weatherState.status === "idle" ? (
              <View style={styles.weatherLoadingRow}>
                <Ionicons
                  color={palette.icon}
                  name="navigate-outline"
                  size={18}
                />
                <ThemedText
                  style={[styles.weatherMessage, { color: palette.muted }]}
                >
                  Allow location access to load weather.
                </ThemedText>
              </View>
            ) : null}

            {showLocationRetry ? (
              <Pressable
                onPress={handleRetryLocation}
                style={({ pressed }) => [
                  styles.weatherRetryButton,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Ionicons
                  color={palette.tint}
                  name="refresh-outline"
                  size={16}
                />
                <ThemedText
                  style={[styles.weatherRetryText, { color: palette.tint }]}
                >
                  Retry location
                </ThemedText>
              </Pressable>
            ) : null}

            {/* <Pressable
              onPress={() => router.push("/weatherBroadcastScreen")}
              style={({ pressed }) => [
                styles.weatherBroadcastButton,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Ionicons color={palette.tint} name="megaphone-outline" size={16} />
              <ThemedText style={[styles.weatherBroadcastButtonText, { color: palette.tint }]}>
                Open weather broadcast
              </ThemedText>
            </Pressable> */}
          </View>

          {authError ? (
            <View
              style={[
                styles.errorBanner,
                {
                  backgroundColor: palette.surfaceStrong,
                  borderColor: palette.danger,
                },
              ]}
            >
              <Ionicons
                color={palette.danger}
                name="alert-circle-outline"
                size={18}
              />
              <ThemedText
                style={[styles.errorBannerText, { color: palette.danger }]}
              >
                {authError}
              </ThemedText>
            </View>
          ) : null}
        </View>

        <View style={styles.metricsGrid}>
          {metrics.map((metric) => {
            const metricToneColor = toneColor[metric.tone];
            const isNeutralCard = Boolean(metric.compact);
            const cardBackgroundColor = isNeutralCard
              ? palette.surface
              : metricToneColor;
            const foregroundColor = isNeutralCard
              ? palette.muted
              : getContrastingTextColor(metricToneColor);
            const cardBorderColor = isNeutralCard
              ? palette.border
              : `${foregroundColor}59`;
            const iconBackgroundColor = isNeutralCard
              ? palette.surfaceStrong
              : `${foregroundColor}24`;
            const iconBorderColor = isNeutralCard
              ? palette.border
              : `${foregroundColor}59`;
            const iconColor = isNeutralCard ? metricToneColor : foregroundColor;
            const labelColor = isNeutralCard ? palette.muted : foregroundColor;
            const valueColor = isNeutralCard ? palette.muted : foregroundColor;

            return (
              <View
                key={metric.label}
                style={[
                  styles.metricCard,
                  {
                    backgroundColor: cardBackgroundColor,
                    borderColor: cardBorderColor,
                  },
                ]}
              >
                <View style={styles.metricHeader}>
                  <View
                    style={[
                      styles.metricIcon,
                      {
                        backgroundColor: iconBackgroundColor,
                        borderColor: iconBorderColor,
                      },
                    ]}
                  >
                    <Ionicons color={iconColor} name={metric.icon} size={18} />
                  </View>
                  <ThemedText
                    style={[styles.metricLabel, { color: labelColor }]}
                  >
                    {metric.label}
                  </ThemedText>
                </View>
                {metric.compact ? (
                  <ThemedText
                    style={[styles.metricValueCompact, { color: valueColor }]}
                  >
                    {metric.value}
                  </ThemedText>
                ) : (
                  <ThemedText
                    type="subtitle"
                    style={[styles.metricValue, { color: valueColor }]}
                  >
                    {metric.value}
                  </ThemedText>
                )}
              </View>
            );
          })}
        </View>

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">Live map</ThemedText>
            <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
              Blue marker: your current location. Red marker: sensor location.
            </ThemedText>
          </View>

          {leafletHtml ? (
            <View
              style={[
                styles.mapWebViewContainer,
                { borderColor: palette.border },
              ]}
            >
              <WebView
                domStorageEnabled
                javaScriptEnabled
                originWhitelist={["*"]}
                scrollEnabled={false}
                source={{ html: leafletHtml }}
                style={styles.mapWebView}
              />
            </View>
          ) : (
            <View
              style={[
                styles.mapPlaceholder,
                {
                  backgroundColor: palette.surfaceStrong,
                  borderColor: palette.border,
                },
              ]}
            >
              <Ionicons color={palette.icon} name="map-outline" size={24} />
              <ThemedText
                style={[styles.mapPlaceholderText, { color: palette.muted }]}
              >
                Map will appear when user or sensor coordinates are available.
              </ThemedText>
            </View>
          )}

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#2f6ff0" }]}
              />
              <ThemedText style={[styles.legendText, { color: palette.muted }]}>
                Your location
              </ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#d2432f" }]}
              />
              <ThemedText style={[styles.legendText, { color: palette.muted }]}>
                Sensor location
              </ThemedText>
            </View>
          </View>
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
  alertModalOverlay: {
    backgroundColor: "rgba(0, 0, 0, 0.46)",
    flex: 1,
    justifyContent: "center",
    padding: 22,
  },
  alertModalCard: {
    borderRadius: 24,
    borderWidth: 2,
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  alertModalBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  alertModalBadgeText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  alertModalTitle: {
    fontFamily: Fonts.sans,
    lineHeight: 28,
  },
  alertModalMessage: {
    fontSize: 14,
    lineHeight: 21,
  },
  alertModalButton: {
    alignItems: "center",
    borderRadius: 14,
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  alertModalButtonText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  content: {
    gap: 18,
    padding: 20,
    paddingBottom: 28,
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
  heroCard: {
    borderRadius: 28,
    borderWidth: 1,
    gap: 10,
    padding: 20,
  },
  heroTop: {
    alignItems: "flex-start",
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
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: Fonts.sans,
    fontSize: 28,
    lineHeight: 34,
  },
  weatherCard: {
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  weatherLoadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  weatherMessage: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  weatherContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    marginTop: 2,
  },
  weatherSummaryRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    width: "56%",
  },
  weatherIconShell: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  weatherCopy: {
    flexShrink: 1,
    gap: 2,
  },
  weatherTemp: {
    fontFamily: Fonts.sans,
  },
  weatherCondition: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  weatherMetaRow: {
    flexDirection: "column",
    gap: 6,
    width: "44%",
  },
  weatherMetaText: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
    textAlign: "left",
    width: "100%",
  },
  weatherRetryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  weatherRetryText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: "700",
  },
  weatherBroadcastButton: {
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
  weatherBroadcastButtonText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: "700",
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
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  metricCard: {
    borderRadius: 22,
    borderWidth: 1,
    gap: 14,
    minHeight: 130,
    padding: 16,
    width: "48%",
  },
  metricHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  metricIcon: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  metricLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  metricValue: {
    fontFamily: Fonts.sans,
    minHeight: 30,
  },
  metricValueCompact: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    lineHeight: 18,
    marginTop: -2,
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
  mapWebViewContainer: {
    borderRadius: 20,
    borderWidth: 1,
    height: 220,
    marginTop: 8,
    overflow: "hidden",
    width: "100%",
  },
  mapWebView: {
    flex: 1,
  },
  mapPlaceholder: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    height: 220,
    justifyContent: "center",
    marginTop: 8,
    paddingHorizontal: 24,
  },
  mapPlaceholderText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 12,
  },
  legendItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  legendDot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  legendText: {
    fontSize: 13,
  },
});
