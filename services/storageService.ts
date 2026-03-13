import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  rememberedEmail: "remembered_email",
  lastSensorData: "last_sensor_data",
  lastSensorSync: "last_sensor_sync",
} as const;

export async function saveRememberedEmail(email: string) {
  try {
    await AsyncStorage.setItem(KEYS.rememberedEmail, email);
  } catch (error) {
    console.error("Failed to save remembered email:", error);
  }
}

export async function getRememberedEmail(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(KEYS.rememberedEmail)) ?? "";
  } catch (error) {
    console.error("Failed to get remembered email:", error);
    return "";
  }
}

export async function clearRememberedEmail() {
  try {
    await AsyncStorage.removeItem(KEYS.rememberedEmail);
  } catch (error) {
    console.error("Failed to clear remembered email:", error);
  }
}

export type LocalSensorData = {
  moisture: number;
  latitude: number;
  longitude: number;
  vibration: number;
  tilt: number;
  updatedAt: string;
};

export async function saveLastSensorData(data: LocalSensorData) {
  try {
    await AsyncStorage.setItem(KEYS.lastSensorData, JSON.stringify(data));
    await AsyncStorage.setItem(KEYS.lastSensorSync, data.updatedAt);
  } catch (error) {
    console.error("Failed to save sensor data:", error);
  }
}

export async function getLastSensorData(): Promise<LocalSensorData | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.lastSensorData);
    if (!raw) return null;
    return JSON.parse(raw) as LocalSensorData;
  } catch (error) {
    console.error("Failed to get sensor data:", error);
    return null;
  }
}

export async function getLastSensorSync(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.lastSensorSync);
  } catch (error) {
    console.error("Failed to get last sync:", error);
    return null;
  }
}
