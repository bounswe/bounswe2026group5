import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RegistrationProfileSetupSheet } from "@/components/profile/RegistrationProfileSetupSheet";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ApiValidationError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/store";
import {
  fetchSkillsFn,
  registerFn,
  updateProfileFn,
  updateUsageModeFn,
  updateUsernameFn,
} from "@/lib/queries/authQueries";
import { useGoogleLoginMutation } from "@/lib/queries/googleAuth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RegistrationLocationPayload = {
  latitude: number;
  longitude: number;
};

function validateEmail(value: string): string {
  if (!value.trim()) return "Email is required.";
  if (!EMAIL_REGEX.test(value.trim()))
    return "Please enter a valid email address.";
  return "";
}

function validatePassword(value: string): string {
  if (!value) return "Password is required.";
  if (value.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(value))
    return "Password must contain at least one uppercase letter.";
  if (!/\d/.test(value)) return "Password must contain at least one number.";
  return "";
}

function buildUsernamePreview(email: string): string {
  const localPart = email.trim().toLowerCase().split("@")[0] ?? "";
  const sanitized = localPart.replaceAll(/[^a-z0-9_]/g, "_");
  return sanitized || "user";
}

async function getRegistrationLocation(): Promise<
  RegistrationLocationPayload | undefined
> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== Location.PermissionStatus.GRANTED) {
      return undefined;
    }

    const currentLocation = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
    };
  } catch (error) {
    console.warn("Could not attach registration location:", error);
    return undefined;
  }
}

function getRegistrationValidationErrors(params: {
  email: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
}): {
  emailError: string;
  passwordError: string;
  confirmPasswordError: string;
  termsError: string;
} {
  const emailError = validateEmail(params.email);
  const passwordError = validatePassword(params.password);
  const confirmPasswordError =
    params.confirmPassword === params.password ? "" : "Passwords do not match.";
  const termsError = params.termsAccepted
    ? ""
    : "You must agree to the Terms of Service and Privacy Policy.";

  return {
    emailError,
    passwordError,
    confirmPasswordError,
    termsError,
  };
}

export default function RegisterScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";
  const theme = Colors[colorScheme];

  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const storedUser = useAuthStore((state) => state.user);
  const storedAccessToken = useAuthStore((state) => state.accessToken);
  const storedRefreshToken = useAuthStore((state) => state.refreshToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const googleLoginMutation = useGoogleLoginMutation();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [shareRegistrationLocation, setShareRegistrationLocation] =
    useState(true);
  const [terms, setTerms] = useState(false);
  const [termsError, setTermsError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [profileSetupVisible, setProfileSetupVisible] = useState(false);

  const {
    data: skillsData,
    isLoading: isLoadingSkills,
    refetch: refetchSkills,
  } = useQuery({
    queryKey: ["skills"],
    queryFn: fetchSkillsFn,
    staleTime: 10 * 60 * 1000,
  });

  const skillNames = skillsData?.map((s) => s.name) ?? [];

  // ── Mutations ──────────────────────────────────────────────────────────────

  const completeRegistration = useMutation({
    mutationFn: async (params: {
      role: "mentor" | "mentee";
      username: string;
      displayName: string;
      bio: string;
      selectedSkills: string[];
    }) => {
      let accessToken: string;
      let refreshToken: string;
      let user: any;

      const hasStoredGoogleSession =
        isAuthenticated &&
        storedUser?.auth_provider === "GOOGLE" &&
        !storedUser?.app_usage_mode &&
        Boolean(storedAccessToken && storedRefreshToken);

      if (hasStoredGoogleSession) {
        accessToken = storedAccessToken as string;
        refreshToken = storedRefreshToken as string;
        user = storedUser;
      } else if (googleLoginMutation.data) {
        // Use existing Google session tokens
        accessToken = googleLoginMutation.data.access_token;
        refreshToken = googleLoginMutation.data.refresh_token;
        user = googleLoginMutation.data.user;
      } else {
        // Normal email/password registration
        const location = shareRegistrationLocation
          ? await getRegistrationLocation()
          : undefined;
        const registration = await registerFn({
          email: email.trim(),
          password,
          confirm_password: confirmPassword,
          ...(location ? { location } : {}),
        });
        accessToken = registration.access_token;
        refreshToken = registration.refresh_token;
        user = registration.user;
      }

      await updateUsageModeFn({
        app_usage_mode: params.role.toUpperCase() as "MENTOR" | "MENTEE",
        accessToken,
      });

      let finalizedUsername = user.username;

      if (params.username !== user.username) {
        const updatedUsername = await updateUsernameFn({
          accessToken,
          username: params.username,
        });
        finalizedUsername = updatedUsername.username ?? params.username;
      }

      const finalizedUser = {
        ...user,
        username: finalizedUsername,
        app_usage_mode: params.role.toUpperCase() as "MENTOR" | "MENTEE",
      };

      await updateProfileFn({
        accessToken,
        display_name: params.displayName,
        bio: params.bio.trim() || undefined,
        skills: params.selectedSkills,
      });

      await setAuthenticated(finalizedUser, {
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    },
    onSuccess: () => {
      router.replace("/(tabs)");
    },
    onError: (error: Error) => {
      if (error instanceof ApiValidationError && error.fieldErrors.username) {
        setUsernameError(error.fieldErrors.username);
        setSubmitError("");
        return;
      }
      setSubmitError(error.message);
    },
  });

  const isPending = completeRegistration.isPending;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    if (text && text !== password) {
      setConfirmPasswordError("Passwords do not match.");
    } else {
      setConfirmPasswordError("");
    }
  };

  const handleSubmit = () => {
    const {
      emailError: eErr,
      passwordError: pErr,
      confirmPasswordError: cpErr,
      termsError: tErr,
    } = getRegistrationValidationErrors({
      email,
      password,
      confirmPassword,
      termsAccepted: terms,
    });

    setEmailError(eErr);
    setPasswordError(pErr);
    setConfirmPasswordError(cpErr);
    setTermsError(tErr);
    setSubmitError("");
    setUsernameError("");

    const hasErrors = Boolean(eErr || pErr || cpErr || tErr);
    if (hasErrors) return;

    setProfileSetupVisible(true);

    if (!skillsData?.length) {
      void refetchSkills();
    }
  };

  /**
   * Handle Google sign-in button press.
   */
  const handleGoogleLogin = async () => {
    setSubmitError("");
    try {
      await googleLoginMutation.mutateAsync();
    } catch (error) {
      console.error("Google login error:", error);
    }
  };

  /**
   * Handle navigation or profile setup when Google login succeeds.
   */
  useEffect(() => {
    if (googleLoginMutation.data) {
      const user = googleLoginMutation.data.user;
      if (!user.app_usage_mode) {
        // New user: pre-fill email and show the onboarding sheet
        setEmail(user.email);
        setProfileSetupVisible(true);
        if (!skillsData?.length) {
          void refetchSkills();
        }
      } else {
        // Existing user: go to dashboard
        router.replace("/(tabs)");
      }
    }
  }, [googleLoginMutation.data, skillsData?.length, refetchSkills]);

  // If we arrived here from the login screen after Google sign-in,
  // the session is already stored in the auth store. Continue profile setup.
  useEffect(() => {
    const shouldContinueGoogleOnboarding =
      isAuthenticated &&
      storedUser?.auth_provider === "GOOGLE" &&
      !storedUser?.app_usage_mode;

    if (!shouldContinueGoogleOnboarding) {
      return;
    }

    setEmail(storedUser.email);
    setProfileSetupVisible(true);

    if (!skillsData?.length) {
      void refetchSkills();
    }
  }, [isAuthenticated, storedUser, skillsData?.length, refetchSkills]);

  const isGoogleLoading = googleLoginMutation.isPending;

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-surface-dark" : "bg-surface"}`}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* ── Top App Bar ── */}
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            className="w-10 h-10 rounded-full items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={theme.primary} />
          </Pressable>
          <Text
            className="text-2xl font-bold text-on-surface dark:text-on-surface-dark"
            accessibilityRole="header"
          >
            Create Account
          </Text>
          {/* Spacer to keep title centred */}
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 8,
            paddingBottom: 48,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Hero ── */}
          <View className="mb-8">
            <Text
              className="text-4xl font-extrabold leading-tight tracking-tight mb-2"
              accessibilityRole="header"
            >
              <Text className="text-on-surface dark:text-on-surface-dark">
                Join the{" "}
              </Text>
              <Text className="text-primary dark:text-primary-dim">
                Circle.
              </Text>
            </Text>
            <Text className="text-base text-on-surface-soft dark:text-on-surface-soft-dark">
              Every expert was once a beginner. Start your journey today.
            </Text>
          </View>

          {/* ── Form ── */}
          <View className="gap-5">
            {/* Email */}
            <View className="gap-1.5">
              <Text className="text-xs font-bold tracking-widest uppercase ml-1 text-on-surface-soft dark:text-on-surface-soft-dark">
                Email
              </Text>
              <View className="flex-row items-center h-14 rounded-xl px-4 gap-2 bg-surface-input dark:bg-surface-input-dark">
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={theme.textMuted}
                />
                <TextInput
                  className="flex-1 text-base font-medium text-on-surface dark:text-on-surface-dark"
                  placeholder="alex@example.com"
                  placeholderTextColor={theme.textMuted}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (emailError) setEmailError(validateEmail(text));
                  }}
                  onBlur={() => setEmailError(validateEmail(email))}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  returnKeyType="next"
                  accessibilityLabel="Email"
                />
              </View>
              {emailError ? (
                <Text className="text-xs text-red-500 ml-1">{emailError}</Text>
              ) : null}
            </View>

            {/* Password */}
            <View className="gap-1.5">
              <Text className="text-xs font-bold tracking-widest uppercase ml-1 text-on-surface-soft dark:text-on-surface-soft-dark">
                Password
              </Text>
              <View className="flex-row items-center h-14 rounded-xl px-4 gap-2 bg-surface-input dark:bg-surface-input-dark">
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={theme.textMuted}
                />
                <TextInput
                  className="flex-1 text-base font-medium text-on-surface dark:text-on-surface-dark"
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  placeholderTextColor={theme.textMuted}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (passwordError) setPasswordError(validatePassword(text));
                    if (confirmPassword && text !== confirmPassword) {
                      setConfirmPasswordError("Passwords do not match.");
                    } else if (confirmPassword) {
                      setConfirmPasswordError("");
                    }
                  }}
                  onBlur={() => setPasswordError(validatePassword(password))}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  returnKeyType="next"
                  accessibilityLabel="Password"
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color={theme.textMuted}
                  />
                </Pressable>
              </View>
              {passwordError ? (
                <Text className="text-xs text-red-500 ml-1">
                  {passwordError}
                </Text>
              ) : null}
            </View>

            {/* Confirm Password */}
            <View className="gap-1.5">
              <Text className="text-xs font-bold tracking-widest uppercase ml-1 text-on-surface-soft dark:text-on-surface-soft-dark">
                Confirm Password
              </Text>
              <View className="flex-row items-center h-14 rounded-xl px-4 gap-2 bg-surface-input dark:bg-surface-input-dark">
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={theme.textMuted}
                />
                <TextInput
                  className="flex-1 text-base font-medium text-on-surface dark:text-on-surface-dark"
                  placeholder="Re-enter your password"
                  placeholderTextColor={theme.textMuted}
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="new-password"
                  returnKeyType="next"
                  accessibilityLabel="Confirm password"
                />
                <Pressable
                  onPress={() => setShowConfirmPassword((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                >
                  <Ionicons
                    name={
                      showConfirmPassword ? "eye-outline" : "eye-off-outline"
                    }
                    size={20}
                    color={theme.textMuted}
                  />
                </Pressable>
              </View>
              {confirmPasswordError ? (
                <Text className="text-xs text-red-500 ml-1">
                  {confirmPasswordError}
                </Text>
              ) : null}
            </View>

            {/* Location Sharing */}
            <View className="gap-1.5">
              <Pressable
                onPress={() => setShareRegistrationLocation((value) => !value)}
                className="flex-row items-start gap-3"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: shareRegistrationLocation }}
                accessibilityLabel="Use my location to find nearby mentors"
              >
                <View
                  className="w-5 h-5 rounded mt-0.5 items-center justify-center border"
                  style={{
                    backgroundColor: shareRegistrationLocation
                      ? theme.primary
                      : "transparent",
                    borderColor: shareRegistrationLocation
                      ? theme.primary
                      : theme.textMuted,
                  }}
                >
                  {shareRegistrationLocation && (
                    <Ionicons name="checkmark" size={13} color="white" />
                  )}
                </View>
                <Text className="flex-1 text-sm font-medium text-on-surface dark:text-on-surface-dark leading-snug">
                  Use my location to find nearby mentors.
                </Text>
              </Pressable>
            </View>

            {/* Terms & Conditions */}
            <View className="gap-1.5">
              <Pressable
                onPress={() => {
                  setTerms((v) => !v);
                  setTermsError("");
                }}
                className="flex-row items-start gap-3"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: terms }}
                accessibilityLabel="I agree to the Terms of Service and Privacy Policy"
              >
                <View
                  className="w-5 h-5 rounded mt-0.5 items-center justify-center border"
                  style={{
                    backgroundColor: terms ? theme.primary : "transparent",
                    borderColor: terms ? theme.primary : theme.textMuted,
                  }}
                >
                  {terms && (
                    <Ionicons name="checkmark" size={13} color="white" />
                  )}
                </View>
                <Text className="flex-1 text-sm font-medium text-on-surface dark:text-on-surface-dark leading-snug">
                  I agree to the{" "}
                  <Text className="text-primary dark:text-primary-dim">
                    Terms of Service
                  </Text>{" "}
                  and{" "}
                  <Text className="text-primary dark:text-primary-dim">
                    Privacy Policy
                  </Text>
                  .
                </Text>
              </Pressable>
              {termsError ? (
                <Text className="text-xs text-red-500 ml-8">{termsError}</Text>
              ) : null}
            </View>

            {/* CTA + Google + Log In link */}
            <View className="gap-5 pt-4">
              {submitError || googleLoginMutation.error ? (
                <ErrorBanner
                  message={
                    submitError || googleLoginMutation.error?.message || ""
                  }
                />
              ) : null}
              <TouchableOpacity
                className="w-full h-16 rounded-xl items-center justify-center flex-row gap-3 bg-primary dark:bg-primary-dim"
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel="Complete registration"
                disabled={isPending}
                style={isPending ? { opacity: 0.6 } : undefined}
                onPress={handleSubmit}
              >
                <Text className="text-white font-bold text-lg">
                  {isPending ? "Creating account…" : "Continue"}
                </Text>
                {!isPending && (
                  <Ionicons
                    name="arrow-forward"
                    size={22}
                    color="white"
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                )}
              </TouchableOpacity>

              {/* ── Divider ── */}
              <View className="flex-row items-center gap-4">
                <View className="flex-1 h-px bg-divider/50 dark:bg-divider-dark" />
                <Text className="text-xs font-bold uppercase tracking-widest text-on-surface-muted dark:text-on-surface-muted-dark">
                  or
                </Text>
                <View className="flex-1 h-px bg-divider/50 dark:bg-divider-dark" />
              </View>

              {/* ── Google Sign-In ── */}
              <TouchableOpacity
                className={`w-full h-14 rounded-full flex-row items-center justify-center gap-3 shadow-sm border bg-surface-card dark:bg-surface-card-dark border-divider/25 dark:border-divider-dark ${
                  isGoogleLoading ? "opacity-60" : ""
                }`}
                activeOpacity={0.8}
                disabled={isGoogleLoading}
                accessibilityRole="button"
                accessibilityLabel="Sign up with Google"
                onPress={handleGoogleLogin}
              >
                {isGoogleLoading ? (
                  <ActivityIndicator size="small" color={theme.textPrimary} />
                ) : (
                  <>
                    <Ionicons
                      name="logo-google"
                      size={20}
                      color={theme.textPrimary}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    />
                    <Text className="font-bold text-base text-on-surface dark:text-on-surface-dark">
                      Sign Up with Google
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <View className="items-center">
                <TouchableOpacity
                  onPress={() => router.replace("/login")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="link"
                  accessibilityLabel="Already have an account? Log In"
                >
                  <Text className="text-base font-bold text-primary dark:text-primary-dim">
                    Already have an account? Log In
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <RegistrationProfileSetupSheet
        visible={profileSetupVisible}
        skills={skillNames}
        isLoadingSkills={isLoadingSkills}
        isSubmitting={completeRegistration.isPending}
        submitError={submitError}
        usernameError={usernameError}
        username={storedUser?.username ?? buildUsernamePreview(email)}
        prefillDisplayName={
          googleLoginMutation.data?.user.display_name ??
          storedUser?.display_name
        }
        onUsernameChange={() => setUsernameError("")}
        onClose={() => {
          setProfileSetupVisible(false);
          setSubmitError("");
          setUsernameError("");
        }}
        onSubmit={(values) => {
          setSubmitError("");
          setUsernameError("");
          completeRegistration.mutate(values);
        }}
      />
    </SafeAreaView>
  );
}
