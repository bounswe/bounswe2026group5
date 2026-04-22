import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";

export interface PendingRequestCardProps {
  id: string;
  username?: string;
  name: string;
  cover_letter: string;
  slot_date: string | null;
  slot_start_time: string | null;
  slot_end_time: string | null;
  isNew?: boolean;
  avatarUrl?: string;
  disabled?: boolean;
  onPress?: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
}

export function PendingRequestCard({
  name,
  cover_letter,
  slot_date,
  slot_start_time,
  slot_end_time,
  isNew,
  avatarUrl,
  disabled,
  onPress,
  onAccept,
  onDecline,
}: Readonly<PendingRequestCardProps>) {
  const slotLabel =
    slot_date && slot_start_time && slot_end_time
      ? `${slot_date} · ${slot_start_time}–${slot_end_time}`
      : null;

  return (
    <TouchableOpacity
      testID="pending-request-card"
      activeOpacity={0.85}
      onPress={onPress}
      className="bg-gray-100 p-5 rounded-xl mb-3 flex-row flex-wrap gap-4 items-start"
    >
      {/* Avatar */}
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          className="w-[72px] h-[72px] rounded-full"
        />
      ) : (
        <View className="w-[72px] h-[72px] rounded-full bg-surface-active items-center justify-center">
          <Text className="text-[26px] font-bold text-primary">
            {name.charAt(0)}
          </Text>
        </View>
      )}

      {/* Content */}
      <View className="flex-1 min-w-[180px] gap-1.5">
        {/* Name + "New" badge row */}
        <View className="flex-row justify-between items-start">
          <View className="flex-1">
            <Text className="text-lg font-bold text-on-surface">{name}</Text>
            {slotLabel && (
              <Text className="text-[13px] font-bold text-primary mt-0.5">
                {slotLabel}
              </Text>
            )}
          </View>
          {isNew && (
            <View testID="pending-new-badge" className="bg-orange-100 px-2 py-1 rounded ml-2">
              <Text className="text-[10px] font-black text-orange-700 uppercase">
                New
              </Text>
            </View>
          )}
        </View>

        {/* Cover letter excerpt */}
        <Text
          className="text-[13px] text-on-surface-soft leading-[18px] italic"
          numberOfLines={2}
        >
          &ldquo;{cover_letter}&rdquo;
        </Text>

        {/* Action Buttons */}
        <View className="flex-row gap-2.5 mt-1">
          <TouchableOpacity
            testID="pending-decline-button"
            activeOpacity={0.8}
            onPress={onDecline}
            disabled={disabled}
            className="flex-1 py-3 rounded-full border border-divider bg-white items-center"
          >
            <Text className="font-bold text-on-surface text-sm">Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="pending-accept-button"
            activeOpacity={0.85}
            onPress={onAccept}
            disabled={disabled}
            className={`flex-[1.4] py-3 rounded-full items-center ${disabled ? "bg-primary/50" : "bg-primary"}`}
          >
            <Text className="font-bold text-white text-sm">Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}
