# Firebase Setup

This project uses the Firebase JavaScript SDK (`firebase`) for Auth + Firestore.
It works in Expo Go (including iPhone) without native Firebase modules.

## 1. Create and configure the Firebase project

1. Open Firebase console and create/select your project.
2. Enable `Email/Password` in Authentication.
3. Create Firestore in the same project.

## 2. Configure Expo public env vars

Set these in `.env`:

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

The app currently has defaults in `services/firebaseClient.ts` for the existing Firebase project, but env vars are preferred.

## 3. Start in Expo Go mode

```bash
npm start
```

Then scan the QR code with Expo Go on iPhone.

## 4. Firestore rules for user profiles

The sign-up flow writes profile data to `users/{uid}`. A minimal rule set is:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /landslide_data/{document=**} {
      allow read: if request.auth != null;
    }
  }
}
```

Adjust the `landslide_data` rules to match your actual app requirements.

## 5. What is implemented in the app

- Login calls Firebase `signInWithEmailAndPassword`
- Sign-up calls Firebase `createUserWithEmailAndPassword`
- New accounts save a Firestore profile in `users/{uid}`
- Auth state redirects signed-in users to the dashboard
- Sign out calls Firebase `signOut`
