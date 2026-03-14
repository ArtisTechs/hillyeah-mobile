import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    ToastAndroid,
    View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Fonts } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
    getAuthErrorMessage,
    signInWithEmail,
    signOutCurrentUser,
    signUpWithEmail,
    subscribeToAuthState,
} from "@/services/authService";
import { getRememberedEmail } from "@/services/storageService";

type FormErrors = {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
};

export default function LoginScreen() {
  const { mode: modeParam } = useLocalSearchParams<{
    mode?: string | string[];
  }>();
  const colorScheme = useColorScheme() ?? "light";
  const palette = Colors[colorScheme];
  const [mode, setMode] = useState<"login" | "signup">("login");
  const isLogin = mode === "login";
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const suppressAuthRedirectRef = useRef(false);

  useEffect(() => {
    const requestedMode = Array.isArray(modeParam) ? modeParam[0] : modeParam;

    if (requestedMode !== "login" && requestedMode !== "signup") {
      return;
    }

    setMode(requestedMode);
    setErrors({});
    setShowPassword(false);
    setAuthError("");
  }, [modeParam]);

  useEffect(() => {
    let isMounted = true;

    getRememberedEmail()
      .then((savedEmail) => {
        if (isMounted && savedEmail) {
          setEmail(savedEmail);
        }
      })
      .catch((error) => {
        console.error("Failed to load remembered email:", error);
      });

    const unsubscribe = subscribeToAuthState((user) => {
      if (!isMounted) {
        return;
      }

      if (user) {
        if (suppressAuthRedirectRef.current) {
          return;
        }

        router.replace("/dashboardScreen");
        return;
      }

      if (suppressAuthRedirectRef.current) {
        suppressAuthRedirectRef.current = false;
      }

      setIsInitializing(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const handleModeChange = (nextMode: "login" | "signup") => {
    setMode(nextMode);
    setErrors({});
    setShowPassword(false);
    setAuthError("");
  };

  const handleSubmit = async () => {
    const nextErrors: FormErrors = {};

    if (!isLogin && !firstName.trim()) {
      nextErrors.firstName = "First name is required.";
    }

    if (!isLogin && !lastName.trim()) {
      nextErrors.lastName = "Last name is required.";
    }

    if (!email.trim()) {
      nextErrors.email = "Email address is required.";
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password.trim()) {
      nextErrors.password = "Password is required.";
    } else if (!isLogin && password.trim().length < 6) {
      nextErrors.password = "Use at least 6 characters.";
    }

    setErrors(nextErrors);
    setAuthError("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (isLogin) {
        await signInWithEmail(email, password);
        router.replace("/dashboardScreen");
      } else {
        suppressAuthRedirectRef.current = true;

        await signUpWithEmail({
          email,
          firstName,
          middleName,
          lastName,
          password,
        });

        await signOutCurrentUser();
        suppressAuthRedirectRef.current = false;

        if (Platform.OS === "android") {
          ToastAndroid.show(
            "Account created successfully. Please log in.",
            ToastAndroid.SHORT,
          );
        }

        handleModeChange("login");
        setPassword("");
      }
    } catch (error) {
      suppressAuthRedirectRef.current = false;
      setAuthError(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
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
          <ThemedText type="subtitle">Checking authentication...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView
      style={[styles.screen, { backgroundColor: palette.background }]}
    >
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <View
          style={[
            styles.terrainLine,
            styles.terrainLineTop,
            { borderColor: palette.terrainLine },
          ]}
        />
        <View
          style={[
            styles.terrainLine,
            styles.terrainLineMiddle,
            { borderColor: palette.terrainLine },
          ]}
        />
        <View
          style={[styles.hillLarge, { backgroundColor: palette.success }]}
        />
        <View style={[styles.hillSmall, { backgroundColor: palette.soil }]} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        style={styles.container}
      >
        <View style={styles.authShell}>
          <View style={styles.headerBlock}>
            <View
              style={[
                styles.logoShell,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                  shadowColor: colorScheme === "dark" ? "#000000" : "#314438",
                },
              ]}
            >
              <Image
                contentFit="contain"
                source={require("@/assets/images/logo.png")}
                style={styles.logo}
              />
            </View>

            <View style={styles.copyBlock}>
              <ThemedText style={[styles.eyebrow, { color: palette.success }]}>
                HillYeah!
              </ThemedText>
              <ThemedText type="title" style={styles.title}>
                Landslide Monitoring System
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
                {isLogin
                  ? "Sign in to access terrain conditions, alert feeds, and slope stability dashboards."
                  : "Register a new monitoring account to track sensors, rainfall events, and hazard alerts."}
              </ThemedText>
            </View>

            <View
              style={[
                styles.modeSwitch,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
            >
              <Pressable
                disabled={isSubmitting}
                onPress={() => handleModeChange("login")}
                style={[
                  styles.modeButton,
                  styles.modeButtonLeft,
                  {
                    backgroundColor: isLogin ? palette.tint : "transparent",
                    opacity: isSubmitting ? 0.7 : 1,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.modeButtonText,
                    { color: isLogin ? "#ffffff" : palette.text },
                  ]}
                >
                  Login
                </ThemedText>
              </Pressable>
              <Pressable
                disabled={isSubmitting}
                onPress={() => handleModeChange("signup")}
                style={[
                  styles.modeButton,
                  styles.modeButtonRight,
                  {
                    backgroundColor: !isLogin ? palette.tint : "transparent",
                    opacity: isSubmitting ? 0.7 : 1,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.modeButtonText,
                    { color: !isLogin ? "#ffffff" : palette.text },
                  ]}
                >
                  Sign Up
                </ThemedText>
              </Pressable>
            </View>
          </View>

          <View style={styles.formViewport}>
            <ScrollView
              automaticallyAdjustKeyboardInsets
              bounces={false}
              contentContainerStyle={styles.formScrollContent}
              keyboardDismissMode={
                Platform.OS === "ios" ? "interactive" : "on-drag"
              }
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View
                style={[
                  styles.formCard,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                  },
                ]}
              >
                <View style={styles.formHeader}>
                  <ThemedText type="subtitle" style={styles.formTitle}>
                    {isLogin ? "Login" : "Sign Up"}
                  </ThemedText>
                  <ThemedText
                    style={[styles.formCaption, { color: palette.muted }]}
                  >
                    {isLogin
                      ? "Enter your credentials to open the monitoring dashboard."
                      : "Set up your account credentials for the HillYeah monitoring system."}
                  </ThemedText>
                </View>

                {!isLogin ? (
                  <View style={styles.inputGroup}>
                    <TextInput
                      autoCapitalize="words"
                      editable={!isSubmitting}
                      onChangeText={(value) => {
                        setFirstName(value);
                        setErrors((current) => ({
                          ...current,
                          firstName: undefined,
                        }));
                        setAuthError("");
                      }}
                      placeholder="First name"
                      placeholderTextColor={palette.muted}
                      style={[
                        styles.input,
                        {
                          backgroundColor: palette.surfaceStrong,
                          borderColor: errors.firstName
                            ? palette.danger
                            : palette.border,
                          color: palette.text,
                        },
                      ]}
                      value={firstName}
                    />
                    {errors.firstName ? (
                      <ThemedText
                        style={[styles.errorText, { color: palette.danger }]}
                      >
                        {errors.firstName}
                      </ThemedText>
                    ) : null}
                  </View>
                ) : null}

                {!isLogin ? (
                  <View style={styles.inputGroup}>
                    <TextInput
                      autoCapitalize="words"
                      editable={!isSubmitting}
                      onChangeText={(value) => {
                        setMiddleName(value);
                        setAuthError("");
                      }}
                      placeholder="Middle name"
                      placeholderTextColor={palette.muted}
                      style={[
                        styles.input,
                        {
                          backgroundColor: palette.surfaceStrong,
                          borderColor: palette.border,
                          color: palette.text,
                        },
                      ]}
                      value={middleName}
                    />
                  </View>
                ) : null}

                {!isLogin ? (
                  <View style={styles.inputGroup}>
                    <TextInput
                      autoCapitalize="words"
                      editable={!isSubmitting}
                      onChangeText={(value) => {
                        setLastName(value);
                        setErrors((current) => ({
                          ...current,
                          lastName: undefined,
                        }));
                        setAuthError("");
                      }}
                      placeholder="Last name"
                      placeholderTextColor={palette.muted}
                      style={[
                        styles.input,
                        {
                          backgroundColor: palette.surfaceStrong,
                          borderColor: errors.lastName
                            ? palette.danger
                            : palette.border,
                          color: palette.text,
                        },
                      ]}
                      value={lastName}
                    />
                    {errors.lastName ? (
                      <ThemedText
                        style={[styles.errorText, { color: palette.danger }]}
                      >
                        {errors.lastName}
                      </ThemedText>
                    ) : null}
                  </View>
                ) : null}

                <View style={styles.inputGroup}>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSubmitting}
                    keyboardType="email-address"
                    onChangeText={(value) => {
                      setEmail(value);
                      setErrors((current) => ({
                        ...current,
                        email: undefined,
                      }));
                      setAuthError("");
                    }}
                    placeholder="Email address"
                    placeholderTextColor={palette.muted}
                    style={[
                      styles.input,
                      {
                        backgroundColor: palette.surfaceStrong,
                        borderColor: errors.email
                          ? palette.danger
                          : palette.border,
                        color: palette.text,
                      },
                    ]}
                    value={email}
                  />
                  {errors.email ? (
                    <ThemedText
                      style={[styles.errorText, { color: palette.danger }]}
                    >
                      {errors.email}
                    </ThemedText>
                  ) : null}
                </View>

                <View style={styles.inputGroup}>
                  <View
                    style={[
                      styles.passwordShell,
                      {
                        backgroundColor: palette.surfaceStrong,
                        borderColor: errors.password
                          ? palette.danger
                          : palette.border,
                      },
                    ]}
                  >
                    <TextInput
                      autoCorrect={false}
                      editable={!isSubmitting}
                      onChangeText={(value) => {
                        setPassword(value);
                        setErrors((current) => ({
                          ...current,
                          password: undefined,
                        }));
                        setAuthError("");
                      }}
                      placeholder="Password"
                      placeholderTextColor={palette.muted}
                      secureTextEntry={!showPassword}
                      style={[styles.passwordInput, { color: palette.text }]}
                      value={password}
                    />
                    <Pressable
                      disabled={isSubmitting}
                      hitSlop={8}
                      onPress={() => setShowPassword((current) => !current)}
                      style={styles.eyeButton}
                    >
                      <Ionicons
                        color={palette.muted}
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                      />
                    </Pressable>
                  </View>
                  {errors.password ? (
                    <ThemedText
                      style={[styles.errorText, { color: palette.danger }]}
                    >
                      {errors.password}
                    </ThemedText>
                  ) : null}
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
                      style={[
                        styles.errorBannerText,
                        { color: palette.danger },
                      ]}
                    >
                      {authError}
                    </ThemedText>
                  </View>
                ) : null}

                {!isLogin ? (
                  <View
                    style={[
                      styles.inlineNotice,
                      {
                        backgroundColor: palette.surfaceStrong,
                        borderColor: palette.border,
                      },
                    ]}
                  >
                    <Ionicons
                      color={palette.warning}
                      name="shield-checkmark-outline"
                      size={18}
                    />
                    <ThemedText
                      style={[
                        styles.inlineNoticeText,
                        { color: palette.muted },
                      ]}
                    >
                      New accounts receive dashboard and field alert access
                      after verification.
                    </ThemedText>
                  </View>
                ) : null}

                <Pressable
                  disabled={isSubmitting}
                  onPress={handleSubmit}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    {
                      backgroundColor: palette.tint,
                      opacity: pressed || isSubmitting ? 0.88 : 1,
                    },
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Ionicons
                      color="#ffffff"
                      name={isLogin ? "log-in-outline" : "person-add-outline"}
                      size={18}
                    />
                  )}
                  <ThemedText style={styles.primaryButtonText}>
                    {isSubmitting
                      ? isLogin
                        ? "Logging in..."
                        : "Creating account..."
                      : isLogin
                        ? "Log in"
                        : "Create account"}
                  </ThemedText>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    borderRadius: 28,
    borderWidth: 1,
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 28,
    width: "100%",
  },
  screen: {
    flex: 1,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  terrainLine: {
    position: "absolute",
    borderTopWidth: 1,
    borderRadius: 999,
    opacity: 0.65,
  },
  terrainLineTop: {
    height: 180,
    left: -60,
    right: -20,
    top: 110,
    transform: [{ rotate: "-6deg" }],
  },
  terrainLineMiddle: {
    height: 220,
    left: -90,
    right: -30,
    top: 185,
    transform: [{ rotate: "4deg" }],
  },
  hillLarge: {
    position: "absolute",
    bottom: -110,
    height: 240,
    left: -40,
    right: 60,
    borderTopLeftRadius: 220,
    borderTopRightRadius: 220,
    opacity: 0.18,
  },
  hillSmall: {
    position: "absolute",
    bottom: -135,
    height: 220,
    left: 120,
    right: -80,
    borderTopLeftRadius: 200,
    borderTopRightRadius: 220,
    opacity: 0.16,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  authShell: {
    gap: 20,
    height: "100%",
  },
  headerBlock: {
    gap: 20,
  },
  modeSwitch: {
    alignSelf: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    padding: 4,
    width: "100%",
  },
  modeButton: {
    alignItems: "center",
    borderRadius: 14,
    flex: 1,
    paddingVertical: 13,
  },
  modeButtonLeft: {
    marginRight: 4,
  },
  modeButtonRight: {
    marginLeft: 4,
  },
  modeButtonText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: "700",
  },
  logoShell: {
    alignItems: "center",
    alignSelf: "center",
    borderRadius: 10,
    borderWidth: 1,
    height: 45,
    justifyContent: "center",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    width: 45,
  },
  logo: {
    height: 32,
    width: 32,
  },
  copyBlock: {
    alignItems: "center",
    gap: 10,
  },
  eyebrow: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: Fonts.sans,
    fontSize: 34,
    lineHeight: 40,
  },
  subtitle: {
    lineHeight: 24,
    maxWidth: 330,
    textAlign: "center",
  },
  formCard: {
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    padding: 22,
  },
  formViewport: {
    flex: 1,
    minHeight: 0,
  },
  formScrollContent: {
    flexGrow: 1,
    paddingBottom: 10,
  },
  formHeader: {
    gap: 6,
    marginBottom: 4,
  },
  formTitle: {
    fontFamily: Fonts.sans,
  },
  formCaption: {
    lineHeight: 22,
  },
  inputGroup: {
    gap: 6,
  },
  input: {
    borderRadius: 18,
    borderWidth: 1,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  passwordShell: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    paddingLeft: 16,
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
  },
  eyeButton: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  errorText: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
    paddingHorizontal: 4,
  },
  errorBanner: {
    alignItems: "flex-start",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  inlineNotice: {
    alignItems: "flex-start",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  inlineNoticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 18,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginTop: 6,
    paddingVertical: 16,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontFamily: Fonts.sans,
    fontSize: 16,
    fontWeight: "700",
  },
});
