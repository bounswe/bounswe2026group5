import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface AvailabilitySlot {
  day: string;
  times: (string | { id: string; label: string; isBooked?: boolean })[];
}

interface AvailabilityPreviewProps {
  schedule: AvailabilitySlot[];
  onEdit?: () => void;
  onSelectSlot?: (payload: {
    day: string;
    time: string;
    slotId?: string;
  }) => void;
  selectedSlot?: { day: string; time: string } | null;
}

const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export function AvailabilityPreview({
  schedule = [],
  onEdit,
  onSelectSlot,
  selectedSlot = null,
}: Readonly<AvailabilityPreviewProps>) {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const currentSlots = expandedDay
    ? schedule?.find((s) => s.day === expandedDay)?.times || []
    : [];

  const dotClassByAvailability = (hasSlots: boolean, isExpanded: boolean) => {
    if (!hasSlots) {
      return "bg-transparent";
    }

    return isExpanded ? "bg-white" : "bg-blue-600";
  };

  const handleDayPress = (day: string) => {
    setExpandedDay((prev) => (prev === day ? null : day));
  };

  return (
    <View className="mb-6">
      {/* Header Row */}
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-lg font-bold text-gray-900">Availability</Text>
        {onEdit ? (
          <TouchableOpacity
            onPress={onEdit}
            className="p-1.5 bg-gray-50 rounded-md border border-gray-200"
          >
            <Ionicons name="pencil" size={14} color="#6b7280" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* 1. Horizontal Swipeable Day Strip */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row"
        >
          {WEEK_DAYS.map((day) => {
            const isExpanded = expandedDay === day;
            const hasSlots = schedule?.some(
              (s) => s.day === day && s?.times?.length > 0,
            );

            return (
              <TouchableOpacity
                key={day}
                onPress={() => handleDayPress(day)}
                activeOpacity={0.7}
                className={`py-3 w-16 items-center rounded-2xl mr-2 ${
                  isExpanded ? "bg-gray-900" : "bg-gray-50"
                }`}
              >
                <Text
                  className={`text-xs font-medium mb-1 ${
                    isExpanded ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {day.charAt(0)}
                </Text>

                <Text
                  className={`text-base font-bold ${
                    isExpanded ? "text-white" : "text-gray-900"
                  }`}
                >
                  {day.substring(0, 3)}
                </Text>

                <View
                  className={`w-1 h-1 rounded-full mt-1.5 ${dotClassByAvailability(hasSlots, isExpanded)}`}
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 2. Stacked Time Slots (ONLY renders if a day is expanded) */}
      {expandedDay !== null && (
        <View className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mt-4 min-h-[120px] justify-center animate-fade-in">
          {currentSlots.length === 0 ? (
            <View className="items-center py-4">
              <Ionicons
                name="calendar-clear-outline"
                size={32}
                color="#d1d5db"
                className="mb-2"
              />
              <Text className="text-gray-500 font-medium">
                No availability on {expandedDay}
              </Text>
            </View>
          ) : (
            <View className="gap-y-3">
              {currentSlots.map((entry) => {
                const time = typeof entry === "string" ? entry : entry.label;
                const slotId = typeof entry === "string" ? undefined : entry.id;
                const isBooked =
                  typeof entry === "string" ? false : Boolean(entry.isBooked);
                const isSelected =
                  selectedSlot?.day === expandedDay &&
                  selectedSlot?.time === time;
                let slotContainerClass = "bg-white border-gray-200";
                let slotTextClass = "text-gray-900";

                if (isBooked) {
                  slotContainerClass = "bg-gray-100 border-gray-200";
                  slotTextClass = "text-gray-400";
                } else if (isSelected) {
                  slotContainerClass = "bg-indigo-600 border-indigo-600";
                  slotTextClass = "text-white";
                }

                return (
                  <TouchableOpacity
                    key={`${expandedDay}-${slotId ?? time}`}
                    onPress={() =>
                      expandedDay &&
                      onSelectSlot?.({
                        day: expandedDay,
                        time,
                        slotId,
                      })
                    }
                    activeOpacity={onSelectSlot && !isBooked ? 0.85 : 1}
                    disabled={isBooked}
                    className={`rounded-xl py-4 items-center justify-center shadow-sm border ${slotContainerClass}`}
                  >
                    <Text className={`text-base font-bold ${slotTextClass}`}>
                      {time}
                    </Text>
                    {typeof entry === "string" ? null : (
                      <Text
                        className={`text-xs mt-1 font-medium ${
                          isBooked ? "text-gray-400" : "text-emerald-600"
                        }`}
                      >
                        {isBooked ? "Booked" : "Not Booked"}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
