import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { useResetPasswordMutation } from "@/lib/queries/auth";
import { useAuthStore } from "@/lib/auth/store";

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = params.token?.trim() ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const resetPasswordMutation = useResetPasswordMutation();
  const logout = useAuthStore((state) => state.logout);

  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";
  const theme = Colors[colorScheme];

  // Clear local session and redirect to login on success.
  // Backend blacklists all JWTs on reset, so stored tokens are now invalid.
  useEffect(() => {
    if (resetPasswordMutation.isSuccess) {
      logout();
      const timer = setTimeout(() => {
        router.replace("/login" as Href);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [resetPasswordMutation.isSuccess, logout]);

  const handleSubmit = async () => {
    setLocalError(null);

    if (newPassword.length < 8) {
      setLocalError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }

    try {
      await resetPasswordMutation.mutateAsync({
        token,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
    } catch {
      // Error displayed via resetPasswordMutation.error
    }
  };

  const isLoading = resetPasswordMutation.isPending;
  const serverError = resetPasswordMutation.error?.message ?? null;
  const isTokenError = serverError?.toLowerCase().includes("token") ?? false;

  // ── Invalid/missing token guard ──────────────────────────────────────────
  if (!token) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? "bg-surface-dark" : "bg-surface"}`}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 32,
            paddingTop: 40,
            paddingBottom: 48,
            alignItems: "center",
          }}
        >
          <View className="items-center gap-5 mt-16">
            <View className="w-20 h-20 rounded-full bg-error-container dark:bg-red-950/30 items-center justify-center">
              <Ionicons name="close-circle" size={44} color="#ba1a1a" />
            </View>
            <Text
              className="text-2xl font-extrabold text-on-surface dark:text-on-surface-dark text-center"
              accessibilityRole="header"
            >
              Invalid Reset Link
            </Text>
            <Text className="text-base text-on-surface-soft dark:text-on-surface-soft-dark text-center">
              This link is missing a reset token. Please request a new one.
            </Text>
            <TouchableOpacity
              className="w-full h-14 rounded-full items-center justify-center bg-primary dark:bg-primary-dim shadow-sm mt-4"
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Request new reset link"
              onPress={() => router.replace("/forgot-password" as Href)}
            >
              <Text className="text-white text-lg font-bold">Request New Link</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-surface-dark" : "bg-surface"}`}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 32,
            paddingTop: 40,
            paddingBottom: 48,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Back Button ── */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="mb-8 self-start flex-row items-center gap-1"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color={theme.textMuted} />
            <Text className="text-sm font-semibold text-on-surface-soft dark:text-on-surface-soft-dark">
              Back
            </Text>
          </TouchableOpacity>

          {/* ── Brand Header ── */}
          <View className="flex-row items-center gap-2 mb-12">
            <Ionicons name="people-circle-outline" size={28} color={theme.primary} />
            <Text className="text-2xl font-black tracking-tight text-primary dark:text-primary-dim">
              Neighborship
            </Text>
          </View>

          {/* ── Hero Title ── */}
          <View className="mb-10">
            <Text
              className="text-4xl font-extrabold leading-tight tracking-tight mb-2 text-on-surface dark:text-on-surface-dark"
              accessibilityRole="header"
            >
              Reset Password
            </Text>
            <Text className="text-base font-medium text-on-surface-soft dark:text-on-surface-soft-dark">
              Choose a strong password you haven't used before. All active
              sessions will be signed out.
            </Text>
          </View>

          {/* ── Content ── */}
          {resetPasswordMutation.isSuccess ? (
            <View className="gap-5">
              <ErrorBanner
                variant="success"
                title="Password reset successfully"
                message="Redirecting you to the login page…"
              />
            </View>
          ) : (
            <View className="gap-5">
              {(localError || serverError) && (
                <ErrorBanner message={localError ?? serverError ?? ""} />
              )}

              {isTokenError && !localError && (
                <TouchableOpacity
                  className="w-full h-12 rounded-xl items-center justify-center border border-primary dark:border-primary-dim"
                  activeOpacity={0.88}
                  accessibilityRole="button"
                  accessibilityLabel="Request new reset link"
                  onPress={() => router.replace("/forgot-password" as Href)}
                >
                  <Text className="text-base font-semibold text-primary dark:text-primary-dim">
                    Request New Link
                  </Text>
                </TouchableOpacity>
              )}

              {/* New Password */}
              <View className="gap-1.5">
                <Text className="text-xs font-bold tracking-widest uppercase ml-1 text-on-surface-soft dark:text-on-surface-soft-dark">
                  New Password
                </Text>
                <View className="flex-row items-center h-14 rounded-xl px-4 gap-3 bg-surface-input dark:bg-surface-input-dark">
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={theme.textMuted}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                  <TextInput
                    className="flex-1 text-base font-medium text-on-surface dark:text-on-surface-dark"
                    placeholder="At least 8 characters"
                    placeholderTextColor={theme.textMuted}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    autoComplete="new-password"
                    returnKeyType="next"
                    accessibilityLabel="New password"
                  />
                  <Pressable
                    onPress={() => setShowNewPassword((prev) => !prev)}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                    accessibilityRole="button"
                    accessibilityLabel={showNewPassword ? "Hide password" : "Show password"}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={theme.textMuted}
                    />
                  </Pressable>
                </View>
              </View>

              {/* Confirm Password */}
              <View className="gap-1.5">
                <Text className="text-xs font-bold tracking-widest uppercase ml-1 text-on-surface-soft dark:text-on-surface-soft-dark">
                  Confirm Password
                </Text>
                <View className="flex-row items-center h-14 rounded-xl px-4 gap-3 bg-surface-input dark:bg-surface-input-dark">
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={theme.textMuted}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                  <TextInput
                    className="flex-1 text-base font-medium text-on-surface dark:text-on-surface-dark"
                    placeholder="Repeat your password"
                    placeholderTextColor={theme.textMuted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoComplete="new-password"
                    returnKeyType="done"
                    accessibilityLabel="Confirm password"
                    onSubmitEditing={handleSubmit}
                  />
                  <Pressable
                    onPress={() => setShowConfirmPassword((prev) => !prev)}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                    accessibilityRole="button"
                    accessibilityLabel={showConfirmPassword ? "Hide password" : "Show password"}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={theme.textMuted}
                    />
                  </Pressable>
                </View>
              </View>

              {/* CTA */}
              <TouchableOpacity
                className={`w-full h-14 rounded-full items-center justify-center mt-2 shadow-sm ${
                  isLoading
                    ? "bg-primary/50 dark:bg-primary-dim/50"
                    : "bg-primary dark:bg-primary-dim"
                }`}
                activeOpacity={0.88}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel="Reset password"
                onPress={handleSubmit}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-white text-lg font-bold">Reset Password</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ── Footer ── */}
          <View className="mt-8 items-center">
            <Text className="font-medium text-base text-on-surface-soft dark:text-on-surface-soft-dark">
              Remembered your password?{" "}
              <Text
                className="font-bold text-primary dark:text-primary-dim"
                accessibilityRole="link"
                accessibilityLabel="Log in"
                onPress={() => router.push("/login" as Href)}
              >
                Log In
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}