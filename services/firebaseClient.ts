import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ??
    "AIzaSyBX1WHdNipE-K0rELSX8KpdRIzIeli1gqM",
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    "hillyeah-2a546.firebaseapp.com",
  projectId:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "hillyeah-2a546",
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    "hillyeah-2a546.firebasestorage.app",
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "36453671455",
  appId:
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ??
    "1:36453671455:android:3088001e6cf13dba9b6b2a",
};

export const firebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(firebaseApp);
export const firestoreDb = getFirestore(firebaseApp);
