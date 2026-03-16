import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { firebaseAuth, firestoreDb } from "./firebaseClient";
import { saveRememberedEmail } from "./storageService";

export type AuthUser = User;

export type SignUpParams = {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  password: string;
};

type AuthErrorWithCode = {
  code?: string;
  message?: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function buildDisplayName(params: Pick<SignUpParams, "firstName" | "middleName" | "lastName">) {
  return [params.firstName, params.middleName, params.lastName]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ");
}

export function getCurrentUser() {
  return firebaseAuth.currentUser;
}

export function subscribeToAuthState(callback: (user: AuthUser | null) => void) {
  return onAuthStateChanged(firebaseAuth, callback);
}

export async function signInWithEmail(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const credential = await signInWithEmailAndPassword(
    firebaseAuth,
    normalizedEmail,
    password,
  );

  await saveRememberedEmail(normalizedEmail);

  return credential.user;
}

export async function signUpWithEmail(params: SignUpParams) {
  const normalizedEmail = normalizeEmail(params.email);
  const displayName = buildDisplayName(params);
  const credential = await createUserWithEmailAndPassword(
    firebaseAuth,
    normalizedEmail,
    params.password,
  );

  if (displayName) {
    await updateProfile(credential.user, { displayName });
  }

  try {
    await setDoc(
      doc(firestoreDb, "users", credential.user.uid),
      {
        firstName: params.firstName.trim(),
        middleName: params.middleName?.trim() ?? "",
        lastName: params.lastName.trim(),
        displayName,
        email: normalizedEmail,
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    // Firestore profile creation should not block account creation.
    console.warn("Failed to save user profile:", error);
  }

  await saveRememberedEmail(normalizedEmail);

  return credential.user;
}

export async function signOutCurrentUser() {
  await signOut(firebaseAuth);
}

export function getAuthErrorMessage(error: unknown) {
  const { code, message } = (error ?? {}) as AuthErrorWithCode;

  switch (code) {
    case "auth/email-already-in-use":
      return "That email address is already registered.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/invalid-credential":
      return "The email or password is incorrect.";
    case "auth/user-disabled":
      return "This account has been disabled in Firebase Authentication.";
    case "auth/user-not-found":
      return "No account exists for that email address.";
    case "auth/wrong-password":
      return "The email or password is incorrect.";
    case "auth/weak-password":
      return "Use a stronger password with at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again in a few minutes.";
    case "auth/network-request-failed":
      return "Network request failed. Check your connection and try again.";
    case "auth/operation-not-allowed":
      return "Email/password sign-in is not enabled in Firebase Authentication.";
    default:
      return message ?? "Firebase Authentication request failed.";
  }
}
