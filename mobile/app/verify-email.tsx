import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SuccessCard } from "@/components/ui/SuccessCard";
import { useAuthStore } from "@/lib/auth/store";
import {
  useCurrentUserMutation,
  useResendEmailVerificationMutation,
  useVerifyEmailMutation,
} from "@/lib/queries/auth";

type VerificationState = "verifying" | "success" | "error";

function getTokenParam(value: string | string[] | undefined): string | null {
  const token = Array.isArray(value) ? value[0] : value;
  return token?.trim() ? token : null;
}

export default function VerifyEmailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = useMemo(() => getTokenParam(params.token), [params.token]);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const updateUser = useAuthStore((state) => state.updateUser);

  const verifyEmailMutation = useVerifyEmailMutation();
  const currentUserMutation = useCurrentUserMutation();
  const resendVerificationMutation = useResendEmailVerificationMutation();
  const verifyEmailMutationRef = useRef(verifyEmailMutation);
  const currentUserMutationRef = useRef(currentUserMutation);

  const [state, setState] = useState<VerificationState>("verifying");
  const [message, setMessage] = useState("Verifying your email address...");
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
    verifyEmailMutationRef.current = verifyEmailMutation;
  }, [verifyEmailMutation]);

  useEffect(() => {
    currentUserMutationRef.current = currentUserMutation;
  }, [currentUserMutation]);

  useEffect(() => {
    let mounted = true;

    async function verify() {
      if (!token) {
        setState("error");
        setMessage("This verification link is missing a token.");
        return;
      }

      setState("verifying");
      setMessage("Verifying your email address...");
      setResendMessage(null);

      try {
        const response =
          await verifyEmailMutationRef.current.mutateAsync(token);

        if (isAuthenticated) {
          try {
            const user =
              await currentUserMutationRef.current.mutateAsync();
            await updateUser(user);
          } catch {
            await updateUser({ is_email_verified: true });
          }
        }

        if (mounted) {
          setState("success");
          setMessage(response.detail);
        }
      } catch (error) {
        if (mounted) {
          setState("error");
          setMessage(
            error instanceof Error
              ? error.message
              : "This verification link is invalid or expired.",
          );
        }
      }
    }

    void verify();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, token, updateUser]);

  const handleResend = async () => {
    try {
      setResendMessage(null);
      const response = await resendVerificationMutation.mutateAsync();
      setResendMessage(response.detail);
    } catch (error) {
      setResendMessage(
        error instanceof Error
          ? error.message
          : "Could not send a new verification email.",
      );
    }
  };

  const goToDashboard = () => {
    router.replace("/(tabs)");
  };

  return (
    <View className="flex-1 bg-surface dark:bg-surface-dark">
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 48,
        }}
      >
        <Text className="text-2xl font-extrabold text-on-surface dark:text-on-surface-dark">
          Email verification
        </Text>

        <View className="mt-6">
          {state === "verifying" ? (
            <View
              className="items-center rounded-2xl border border-divider bg-surface-card p-6 dark:border-divider-dark dark:bg-surface-card-dark"
              testID="email-verification-loading"
            >
              <ActivityIndicator size="large" color="#4f46e5" />
              <Text className="mt-4 text-center text-sm text-on-surface-variant dark:text-on-surface-variant-dark">
                {message}
              </Text>
            </View>
          ) : null}

          {state === "success" ? (
            <SuccessCard title="Email verified" message={message} />
          ) : null}

          {state === "error" ? (
            <ErrorBanner
              title="Verification failed"
              message={message}
              variant="warning"
            />
          ) : null}
        </View>

        {resendMessage ? (
          <View className="mt-4">
            <ErrorBanner message={resendMessage} variant="info" />
          </View>
        ) : null}

        {state !== "verifying" ? (
          <View className="mt-6 gap-3">
            {isAuthenticated && state === "error" ? (
              <TouchableOpacity
                testID="resend-verification-button"
                activeOpacity={0.85}
                disabled={resendVerificationMutation.isPending}
                onPress={() => {
                  void handleResend();
                }}
                className="items-center rounded-xl border border-amber-300 px-4 py-3 dark:border-amber-900/60"
              >
                <Text className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  {resendVerificationMutation.isPending
                    ? "Sending..."
                    : "Resend Verification Email"}
                </Text>
              </TouchableOpacity>
            ) : null}

            {isAuthenticated ? (
              <TouchableOpacity
                testID="go-to-dashboard-button"
                activeOpacity={0.85}
                onPress={goToDashboard}
                className="items-center rounded-xl bg-primary px-4 py-3"
              >
                <Text className="text-sm font-semibold text-white">
                  Go to Dashboard
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
