import { doc, onSnapshot } from "firebase/firestore";

import { firestoreDb } from "./firebaseClient";
import { saveLastSensorData } from "./storageService";

export type SensorData = {
  moisture: number;
  latitude: number;
  longitude: number;
  vibration: number;
  tilt: number;
  location?: {
    latitude: number;
    longitude: number;
  };
};

const sensorRef = doc(firestoreDb, "landslide_data", "sensor_doc");

export function subscribeToSensor(callback: (data: SensorData | null) => void) {
  return onSnapshot(
    sensorRef,
    async (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      const raw = snapshot.data();

      const parsed: SensorData = {
        moisture: Number(raw?.moisture ?? 0),
        latitude: Number(raw?.latitude ?? 0),
        longitude: Number(raw?.longitude ?? 0),
        vibration: Number(raw?.vibration ?? 0),
        tilt: Number(raw?.tilt ?? 0),
        location: raw?.location
          ? {
              latitude: Number(raw.location.latitude),
              longitude: Number(raw.location.longitude),
            }
          : undefined,
      };

      await saveLastSensorData({
        ...parsed,
        updatedAt: new Date().toISOString(),
      });

      callback(parsed);
    },
    (error) => {
      console.error("Sensor listener error:", error);
      callback(null);
    },
  );
}
