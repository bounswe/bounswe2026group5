import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";

import type { ProfileReview } from "@/lib/queries/profile";

interface ProfileReviewsProps {
  reviews?: ProfileReview[];
  isLoading?: boolean;
}

export function ProfileReviews({ reviews, isLoading }: Readonly<ProfileReviewsProps>) {
  if (isLoading) {
    return <ActivityIndicator size="small" color="#9ca3af" className="mt-4" />;
  }

  if (!reviews || reviews.length === 0) {
    return (
      <View className="py-8 items-center bg-surface-card dark:bg-surface-card-dark rounded-2xl border border-divider/20">
        <Ionicons name="chatbubble-ellipses-outline" size={32} color="#9ca3af" className="mb-2" />
        <Text className="text-on-surface-muted text-[13px] font-medium">No reviews yet.</Text>
      </View>
    );
  }

  return (
    <View className="gap-3">
      {reviews.map((review) => (
        <View
          key={review.id}
          className="bg-surface-card dark:bg-surface-card-dark p-4 rounded-xl border border-divider/20 shadow-sm"
        >
          {/* Header: User Info & Date */}
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-row items-center gap-3">
              {review.submitted_by.picture_url ? (
                <Image
                  source={{ uri: review.submitted_by.picture_url }}
                  className="w-10 h-10 rounded-lg"
                />
              ) : (
                <View className="w-10 h-10 rounded-lg bg-surface-active dark:bg-surface-active-dark items-center justify-center">
                  <Text className="text-primary dark:text-primary-dim font-bold text-lg uppercase">
                    {review.submitted_by.display_name.charAt(0)}
                  </Text>
                </View>
              )}
              <View>
                <Text className="font-bold text-on-surface dark:text-on-surface-dark text-[15px]">
                  {review.submitted_by.display_name}
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
              {new Date(review.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
          </View>

          {/* Review Text */}
          {review.text ? (
            <Text className="text-[14px] text-on-surface-soft dark:text-on-surface-soft-dark leading-5">
              &quot;{review.text}&quot;
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}