import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

import type { ProfileReview } from "@/lib/queries/profile";
import { ErrorBanner } from "@/components/ui/ErrorBanner";

interface ProfileReviewsProps {
  reviews?: ProfileReview[];
  isLoading?: boolean;
  isLoadingMore?: boolean;
  errorMessage?: string | null;
  totalCount?: number;
  onLoadMore?: () => void;
  emptyMessage?: string;
  privacyMessage?: string;
}

function formatReviewDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ProfileReviews({
  reviews,
  isLoading,
  isLoadingMore,
  errorMessage,
  totalCount = 0,
  onLoadMore,
  emptyMessage = "No public reviews yet.",
}: Readonly<ProfileReviewsProps>) {
  if (isLoading) {
    return <ActivityIndicator size="small" color="#9ca3af" className="mt-4" />;
  }

  if (errorMessage) {
    return <ErrorBanner title="Unable to load reviews" message={errorMessage} />;
  }

  if (!reviews || reviews.length === 0) {
    return (
      <View className="py-8 items-center bg-surface-card dark:bg-surface-card-dark rounded-2xl border border-divider/20 px-5">
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={32}
          color="#9ca3af"
          className="mb-2"
        />
        <Text className="text-on-surface-muted text-[13px] font-medium text-center">
          {emptyMessage}
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-3">
      {reviews.map((review) => (
        <View
          key={`${review.created_at}-${review.text}`}
          className="bg-surface-card dark:bg-surface-card-dark p-4 rounded-xl border border-divider/20 shadow-sm"
        >
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-lg bg-surface-active dark:bg-surface-active-dark items-center justify-center">
                <Ionicons
                  name="person-outline"
                  size={18}
                  color="#6b7280"
                />
              </View>
              <View>
                <Text className="font-bold text-on-surface dark:text-on-surface-dark text-[15px]">
                  Anonymous mentee
                </Text>
                <View className="flex-row mt-0.5 gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name={review.rating >= star ? "star" : "star-outline"}
                      size={12}
                      color={review.rating >= star ? "#fbbf24" : "#d1d5db"}
                    />
                  ))}
                </View>
              </View>
            </View>

            <Text className="text-[11px] font-bold text-on-surface-muted uppercase tracking-wider">
              {formatReviewDate(review.created_at)}
            </Text>
          </View>

          <Text className="text-[14px] text-on-surface-soft dark:text-on-surface-soft-dark leading-5">
            {review.text}
          </Text>
        </View>
      ))}

      {reviews.length < totalCount && onLoadMore ? (
        <TouchableOpacity
          onPress={onLoadMore}
          disabled={isLoadingMore}
          className="rounded-xl border border-divider/20 bg-surface-card dark:bg-surface-card-dark py-3 items-center"
          accessibilityRole="button"
          accessibilityLabel="Load more reviews"
          style={isLoadingMore ? { opacity: 0.6 } : undefined}
        >
          <Text className="font-semibold text-primary dark:text-primary-dim">
            {isLoadingMore ? "Loading more..." : "Load more reviews"}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
