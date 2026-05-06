import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

import { UserAvatar } from "@/components/ui/UserAvatar";

export interface PendingRequestCardProps {
  id: string;
  username?: string;
  name: string;
  cover_letter: string;
  slot_date: string | null;
  slot_start_time: string | null;
  slot_end_time: string | null;
  requestType?: "incoming" | "outgoing";
  isReschedule?: boolean;
  isNew?: boolean;
  avatarUrl?: string;
  disabled?: boolean;
  onPress?: () => void;
  onShowProfile?: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
}

export function PendingRequestCard({
  name,
  cover_letter,
  slot_date,
  slot_start_time,
  slot_end_time,
  requestType = "incoming",
  isReschedule,
  isNew,
  avatarUrl,
  disabled,
  onPress,
  onShowProfile,
  onAccept,
  onDecline,
}: Readonly<PendingRequestCardProps>) {
  const isIncoming = requestType === "incoming";
  const slotLabel =
    slot_date && slot_start_time && slot_end_time
      ? `${slot_date} · ${slot_start_time}–${slot_end_time}`
      : slot_start_time;
  const messagePreview =
    cover_letter.trim() ||
    (isIncoming
      ? "Would like to connect for mentorship."
      : "Your mentorship request is waiting for a response.");

  return (
    <TouchableOpacity
      testID="pending-request-card"
      activeOpacity={0.85}
      onPress={onPress}
      className="bg-gray-100 p-5 rounded-xl mb-3 flex-row flex-wrap gap-4 items-start"
    >
      {/* Avatar */}
      <TouchableOpacity
        testID="pending-profile-button"
        activeOpacity={onShowProfile ? 0.8 : 1}
        onPress={onShowProfile}
        disabled={!onShowProfile}
      >
        <UserAvatar
          imageUrl={avatarUrl}
          name={name}
          size="lg"
          testIDPrefix="pending-avatar"
        />
      </TouchableOpacity>

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
          {isReschedule && (
            <View testID="pending-reschedule-badge" className="bg-amber-100 px-2 py-1 rounded ml-2">
              <Text className="text-[10px] font-black text-amber-700 uppercase">
                Reschedule
              </Text>
            </View>
          )}
        </View>

        {/* Cover letter excerpt */}
        <Text
          className="text-[13px] text-on-surface-soft leading-[18px] italic"
          numberOfLines={2}
        >
          &ldquo;{messagePreview}&rdquo;
        </Text>

        {/* Action Buttons */}
        {isIncoming ? (
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
        ) : (
          <View
            testID="pending-outgoing-badge"
            className="self-start mt-1 px-4 py-2 rounded-full bg-white border border-divider"
          >
            <Text className="text-sm font-bold text-on-surface-soft">
              Request Pending...
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
