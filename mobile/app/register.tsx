import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { RegistrationProfileSetupSheet } from "@/components/profile/RegistrationProfileSetupSheet";
import { useAuthStore } from "@/lib/auth/store";
import {
  registerFn,
  updateUsageModeFn,
  updateProfileFn,
  fetchSkillsFn,
  type AuthResponse,
} from "@/lib/queries/authQueries";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const [role, setRole] = useState<"mentor" | "mentee">("mentor");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [terms, setTerms] = useState(false);
  const [termsError, setTermsError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [profileSetupVisible, setProfileSetupVisible] = useState(false);
  const [pendingUser, setPendingUser] = useState<{
    id: string;
    username: string;
    accessToken: string;
  } | null>(null);

  const { data: skillsData, isLoading: isLoadingSkills } = useQuery({
    queryKey: ["skills"],
    queryFn: fetchSkillsFn,
    staleTime: 10 * 60 * 1000,
  });

  const skillNames = skillsData?.map((s) => s.name) ?? [];

  // ── Mutations ──────────────────────────────────────────────────────────────

  const completeProfileSetup = useMutation({
    mutationFn: async (params: {
      displayName: string;
      bio: string;
      selectedSkills: string[];
    }) => {
      if (!pendingUser) {
        throw new Error("Registration session not found. Please try again.");
      }

      await updateUsageModeFn({
        userId: pendingUser.id,
        app_usage_mode: role.toUpperCase() as "MENTOR" | "MENTEE",
        accessToken: pendingUser.accessToken,
        _username: pendingUser.username,
      });

      await useAuthStore.getState().updateUser({
        app_usage_mode: role.toUpperCase() as "MENTOR" | "MENTEE",
      });

      await updateProfileFn({
        username: pendingUser.username,
        accessToken: pendingUser.accessToken,
        display_name: params.displayName,
        bio: params.bio.trim() || undefined,
        ...(role === "mentor"
          ? { expertises: params.selectedSkills }
          : { eager_to_learn: params.selectedSkills }),
      });
    },
    onSuccess: () => {
      router.replace("/(tabs)");
    },
    onError: (error: Error) => {
      setSubmitError(error.message);
    },
  });

  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const register = useMutation({
    mutationFn: registerFn,
    onSuccess: async (data: AuthResponse) => {
      await setAuthenticated(data.user as import("@/lib/auth/types").AuthUser, {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });

      setPendingUser({
        id: data.user.id,
        username: data.user.username,
        accessToken: data.access_token,
      });
      setProfileSetupVisible(true);
    },
    onError: (error: Error) => {
      setSubmitError(error.message);
    },
  });

  const isPending = register.isPending || completeProfileSetup.isPending;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleRoleChange = (newRole: "mentor" | "mentee") => {
    setRole(newRole);
  };

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

    const hasErrors = Boolean(eErr || pErr || cpErr || tErr);
    if (hasErrors) return;

    register.mutate({
      email: email.trim(),
      password,
      confirm_password: confirmPassword,
    });
  };

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-surface-dark" : "bg-surface"}`}
    >
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
            {/* Role Segmented Control */}
            <View className="gap-1.5">
              <Text className="text-xs font-bold tracking-widest uppercase ml-1 text-on-surface-soft dark:text-on-surface-soft-dark">
                My Role
              </Text>
              <View className="flex-row items-center p-1.5 rounded-xl h-14 bg-surface-input dark:bg-surface-input-dark">
                <Pressable
                  onPress={() => handleRoleChange("mentor")}
                  className="flex-1 h-full rounded-lg items-center justify-center"
                  style={
                    role === "mentor"
                      ? { backgroundColor: theme.cardBackground }
                      : undefined
                  }
                  accessibilityRole="button"
                  accessibilityState={{ selected: role === "mentor" }}
                  accessibilityLabel="I want to be a Mentor"
                >
                  <Text
                    className="text-sm font-semibold"
                    style={{
                      color: role === "mentor" ? theme.primary : theme.textSoft,
                    }}
                  >
                    Mentor
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handleRoleChange("mentee")}
                  className="flex-1 h-full rounded-lg items-center justify-center"
                  style={
                    role === "mentee"
                      ? { backgroundColor: theme.cardBackground }
                      : undefined
                  }
                  accessibilityRole="button"
                  accessibilityState={{ selected: role === "mentee" }}
                  accessibilityLabel="I want to be a Mentee"
                >
                  <Text
                    className="text-sm font-semibold"
                    style={{
                      color: role === "mentee" ? theme.primary : theme.textSoft,
                    }}
                  >
                    Mentee
                  </Text>
                </Pressable>
              </View>
            </View>

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

            {/* CTA + Log In link */}
            <View className="gap-5 pt-4">
              {submitError ? (
                <Text className="text-xs text-red-500 text-center">
                  {submitError}
                </Text>
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
                  {isPending ? "Creating account…" : "Complete Registration"}
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
        role={role}
        skills={skillNames}
        isLoadingSkills={isLoadingSkills}
        isSubmitting={completeProfileSetup.isPending}
        submitError={submitError}
        username={pendingUser?.username ?? ""}
        onClose={() => {
          setProfileSetupVisible(false);
          setPendingUser(null);
        }}
        onSubmit={(values) => {
          setSubmitError("");
          completeProfileSetup.mutate(values);
        }}
      />
    </SafeAreaView>
  );
}
