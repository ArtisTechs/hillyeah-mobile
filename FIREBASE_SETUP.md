# Firebase Setup

This project now uses Firebase Authentication for email/password login and sign-up through `@react-native-firebase/auth`.

Important:

- `@react-native-firebase/*` does not run in Expo Go.
- Use an Expo development build or a native build.

## 1. Create and configure the Firebase project

1. Open the Firebase console and create or select your Firebase project.
2. In Authentication, enable the `Email/Password` sign-in provider.
3. If you want the sign-up flow to save profile data to Firestore, create a Firestore database in the same project.

## 2. Register your mobile apps in Firebase

You need stable app IDs before downloading config files:

- Android package name: add `expo.android.package` in `app.json`
- iOS bundle identifier: add `expo.ios.bundleIdentifier` in `app.json`

Use your own reverse-DNS IDs, for example:

```json
{
  "expo": {
    "android": {
      "package": "com.yourcompany.hillyeahmobile"
    },
    "ios": {
      "bundleIdentifier": "com.yourcompany.hillyeahmobile"
    }
  }
}
```

After that:

1. Register the Android app in Firebase and download `google-services.json`.
2. Register the iOS app in Firebase and download `GoogleService-Info.plist`.

## 3. Place the Firebase config files

Put the files in the project root:

- `./google-services.json`
- `./GoogleService-Info.plist`

Then add these paths to `app.json`:

```json
{
  "expo": {
    "android": {
      "googleServicesFile": "./google-services.json"
    },
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist"
    }
  }
}
```

## 4. Add the required Expo config

This repo already includes the React Native Firebase plugins for:

- `@react-native-firebase/app`
- `@react-native-firebase/auth`

If you want to build for iOS, React Native Firebase documents that you should also use static frameworks through `expo-build-properties`. Example:

```json
{
  "expo": {
    "plugins": [
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      [
        "expo-build-properties",
        {
          "ios": {
            "useFrameworks": "static"
          }
        }
      ]
    ]
  }
}
```

Install the supporting packages if they are not already present:

```bash
npx expo install expo-dev-client expo-build-properties
```

## 5. Build with native Firebase support

Because this app uses native Firebase modules, do not test auth in Expo Go.

Use one of these flows:

```bash
npx expo prebuild --clean
npx expo run:android
```

```bash
npx expo prebuild --clean
npx expo run:ios
```

Or create an EAS development build and install it on your device.

## 6. Firestore rules for user profiles

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

## 7. What was implemented in the app

- Login calls Firebase `signInWithEmailAndPassword`
- Sign-up calls Firebase `createUserWithEmailAndPassword`
- New accounts save a Firestore profile in `users/{uid}`
- Auth state redirects signed-in users to the dashboard
- Sign out calls Firebase `signOut`
