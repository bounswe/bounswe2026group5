import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { useForgotPasswordMutation } from "@/lib/queries/auth";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const forgotPasswordMutation = useForgotPasswordMutation();

  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";
  const theme = Colors[colorScheme];

  const handleSubmit = async () => {
    setLocalError(null);

    if (!email.trim()) {
      setLocalError("Please enter your email address.");
      return;
    }

    try {
      await forgotPasswordMutation.mutateAsync(email.trim());
      setSubmitted(true);
    } catch (error) {
      // network/server failure — show error banner so user can retry
      setLocalError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please check your connection and try again.",
      );
    }
  };

  const isLoading = forgotPasswordMutation.isPending;

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
              Forgot Password
            </Text>
            <Text className="text-base font-medium text-on-surface-soft dark:text-on-surface-soft-dark">
              Enter your email and we'll send you a secure link to reset your
              password. The link expires in 30 minutes.
            </Text>
          </View>

          {/* ── Content ── */}
          {submitted ? (
            <View className="gap-5">
              <ErrorBanner
                variant="success"
                title="Check your inbox"
                message="If an account exists for that email, a reset link has been sent. Please check your spam folder if you don't see it."
              />
              <TouchableOpacity
                className="w-full h-14 rounded-full items-center justify-center bg-primary dark:bg-primary-dim shadow-sm"
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel="Back to login"
                onPress={() => router.replace("/login" as Href)}
              >
                <Text className="text-white text-lg font-bold">Back to Login</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="gap-5">
              {localError && <ErrorBanner message={localError} />}

              {/* Email */}
              <View className="gap-1.5">
                <Text className="text-xs font-bold tracking-widest uppercase ml-1 text-on-surface-soft dark:text-on-surface-soft-dark">
                  Email
                </Text>
                <View className="flex-row items-center h-14 rounded-xl px-4 gap-3 bg-surface-input dark:bg-surface-input-dark">
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={theme.textMuted}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                  <TextInput
                    className="flex-1 text-base font-medium text-on-surface dark:text-on-surface-dark"
                    placeholder="Enter your email"
                    placeholderTextColor={theme.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    returnKeyType="send"
                    accessibilityLabel="Email address"
                    onSubmitEditing={handleSubmit}
                  />
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
                accessibilityLabel="Send reset link"
                onPress={handleSubmit}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-white text-lg font-bold">Send Reset Link</Text>
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