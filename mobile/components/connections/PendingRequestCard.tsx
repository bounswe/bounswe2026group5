import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

export interface PendingRequestCardProps {
  id: string;
  name: string;
  cover_letter: string;
  slot_date: string | null;
  slot_start_time: string | null;
  slot_end_time: string | null;
  avatarUrl?: string;
  isNew?: boolean;
  onPress?: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  disabled?: boolean;
}

export function PendingRequestCard({
  name,
  cover_letter,
  slot_date,
  slot_start_time,
  slot_end_time,
  isNew,
  onPress,
  onAccept,
  onDecline,
  disabled,
}: Readonly<PendingRequestCardProps>) {
  const shortStart = slot_start_time ? slot_start_time.slice(0, 5) : null;
  const shortEnd = slot_end_time ? slot_end_time.slice(0, 5) : null;
  const schedule =
    slot_date && shortStart && shortEnd
      ? `${slot_date} ${shortStart}-${shortEnd}`
      : "Schedule pending";

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      className="bg-white p-4 rounded-xl border border-divider/20 shadow-sm mb-3"
    >
      <View className="flex-row justify-between items-center mb-2">
        <View className="flex-1 pr-3">
          <Text className="text-base font-bold text-on-surface">{name}</Text>
          <Text className="text-[11px] font-semibold text-on-surface-muted uppercase tracking-wide mt-0.5">
            Mentorship Request
          </Text>
        </View>
        {isNew ? (
          <View className="px-2 py-1 rounded-md bg-primary/10">
            <Text className="text-[10px] font-bold text-primary uppercase">
              New
            </Text>
          </View>
        ) : null}
      </View>

      <Text className="text-sm text-on-surface-soft mb-2" numberOfLines={2}>
        {cover_letter}
      </Text>
      <Text className="text-xs text-on-surface-muted mb-3">{schedule}</Text>

      <View className="flex-row gap-2">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onDecline}
          disabled={disabled}
          className="flex-1 py-2 rounded-lg border border-red-300 items-center"
        >
          <Text className="text-red-500 font-semibold text-xs">Decline</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onAccept}
          disabled={disabled}
          className={`flex-1 py-2 rounded-lg items-center ${disabled ? "bg-primary/50" : "bg-primary"}`}
        >
          <Text className="text-white font-semibold text-xs">Accept</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
