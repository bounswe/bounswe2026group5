import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import {
  useCreateAvailabilitySlotMutation,
  useDeleteAvailabilitySlotMutation,
  useRespondToMentorshipRequestMutation,
} from "@/lib/queries/mentorship";

interface BackendAvailabilitySlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  is_booked: boolean;
}

interface EditAvailabilityModalProps {
  visible: boolean;
  onClose: () => void;
  username: string;
  slots: BackendAvailabilitySlot[];
  requests?: {
    id: string;
    slotId: string | null;
    status: "PENDING" | "ACCEPTED" | "REJECTED";
  }[];
  onChanged?: () => void;
}

const HOURS = Array.from({ length: 13 }, (_, index) => 9 + index);

function getMonday(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1);
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatWeekLabel(monday: Date): string {
  const sunday = addDays(monday, 6);
  return `${monday.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })} - ${sunday.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

function formatHourRange(hour: number): string {
  const start = `${String(hour).padStart(2, "0")}:00`;
  const end = `${String(hour + 1).padStart(2, "0")}:00`;
  return `${start} - ${end}`;
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function isPastDate(date: Date): boolean {
  return startOfDay(date) < startOfDay(new Date());
}

function isPastHourSlot(date: Date, hour: number): boolean {
  const end = new Date(date);
  end.setHours(hour + 1, 0, 0, 0);
  return end <= new Date();
}

export function EditAvailabilityModal({
  visible,
  onClose,
  username,
  slots,
  requests = [],
  onChanged,
}: Readonly<EditAvailabilityModalProps>) {
  const insets = useSafeAreaInsets();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setWeekOffset(0);
      setSelectedDayIndex(0);
      setTogglingKey(null);
    }
  }, [visible]);

  const createSlotMutation = useCreateAvailabilitySlotMutation(username);
  const deleteSlotMutation = useDeleteAvailabilitySlotMutation(username);
  const respondToRequestMutation = useRespondToMentorshipRequestMutation();

  const monday = useMemo(
    () => getMonday(addDays(new Date(), weekOffset * 7)),
    [weekOffset],
  );

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(monday, index)),
    [monday],
  );

  const selectedDate = weekDays[selectedDayIndex] ?? weekDays[0];
  const selectedDateString = toDateString(selectedDate);

  const slotsByDateHour = useMemo(() => {
    const byDateHour: Record<string, BackendAvailabilitySlot> = {};
    slots.forEach((slot) => {
      const hour = Number(slot.startTime.split(":")[0]);
      byDateHour[`${slot.date}-${hour}`] = slot;
    });
    return byDateHour;
  }, [slots]);

  const requestsBySlotId = useMemo(() => {
    const grouped: Record<
      string,
      {
        id: string;
        status: "PENDING" | "ACCEPTED" | "REJECTED";
      }[]
    > = {};

    requests.forEach((request) => {
      if (!request.slotId) {
        return;
      }

      grouped[request.slotId] = grouped[request.slotId] ?? [];
      grouped[request.slotId].push({
        id: request.id,
        status: request.status,
      });
    });

    return grouped;
  }, [requests]);

  const isPending =
    createSlotMutation.isPending ||
    deleteSlotMutation.isPending ||
    respondToRequestMutation.isPending;

  const deactivateSlot = async (
    key: string,
    slotId: string,
    pendingRequestIds: string[] = [],
  ) => {
    setTogglingKey(key);

    try {
      for (const requestId of pendingRequestIds) {
        await respondToRequestMutation.mutateAsync({
          requestId,
          action: "reject",
        });
      }

      await deleteSlotMutation.mutateAsync(slotId);
      onChanged?.();
    } catch (error) {
      Alert.alert(
        "Update Failed",
        error instanceof Error
          ? error.message
          : "Could not update availability slot.",
      );
    } finally {
      setTogglingKey(null);
    }
  };

  const handleToggleSlot = async (hour: number) => {
    const key = `${selectedDateString}-${hour}`;
    const existing = slotsByDateHour[key];

    if (togglingKey === key || !username) {
      return;
    }

    if (isPastHourSlot(selectedDate, hour)) {
      Alert.alert(
        "Past Slot",
        "Past availability slots cannot be modified.",
      );
      return;
    }

    if (existing) {
      const linkedRequests = requestsBySlotId[existing.id] ?? [];
      const pendingRequests = linkedRequests.filter(
        (request) => request.status === "PENDING",
      );
      const acceptedRequests = linkedRequests.filter(
        (request) => request.status === "ACCEPTED",
      );

      if (existing.is_booked || acceptedRequests.length > 0) {
        Alert.alert(
          "Cannot Make Slot Unavailable",
          `This slot has ${acceptedRequests.length} planned session(s). TODO: Cancelling accepted sessions from availability editing requires a backend endpoint that is not available yet.`,
        );
        return;
      }

      if (pendingRequests.length > 0) {
        Alert.alert(
          "Confirm Make Unavailable",
          `This will decline ${pendingRequests.length} pending request(s) for this slot and then make it unavailable.`,
          [
            { text: "Keep Slot", style: "cancel" },
            {
              text: "Make Unavailable",
              style: "destructive",
              onPress: () => {
                void deactivateSlot(
                  key,
                  existing.id,
                  pendingRequests.map((request) => request.id),
                );
              },
            },
          ],
        );
        return;
      }

      await deactivateSlot(key, existing.id);
      return;
    }

    setTogglingKey(key);

    try {
      await createSlotMutation.mutateAsync({
        date: selectedDateString,
        startTime: `${String(hour).padStart(2, "0")}:00:00`,
        endTime: `${String(hour + 1).padStart(2, "0")}:00:00`,
      });

      onChanged?.();
    } catch (error) {
      Alert.alert(
        "Update Failed",
        error instanceof Error
          ? error.message
          : "Could not update availability slot.",
      );
    } finally {
      setTogglingKey(null);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <View
        className="flex-1 bg-white"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
          <TouchableOpacity
            onPress={onClose}
            className="p-2 -ml-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={1}
          >
            <Ionicons name="close" size={24} color="#4b5563" />
          </TouchableOpacity>
          <Text className="text-xl font-extrabold text-gray-900">
            Availability
          </Text>
          <TouchableOpacity
            onPress={onClose}
            className="px-3 py-1.5 rounded-full bg-gray-900"
            activeOpacity={1}
          >
            <Text className="text-white text-xs font-bold">Done</Text>
          </TouchableOpacity>
        </View>

        <View className="px-6 pt-4">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              className="w-8 h-8 rounded-full items-center justify-center bg-gray-100"
              onPress={() => {
                setWeekOffset((previous) => Math.max(previous - 1, -4));
                setSelectedDayIndex(0);
              }}
              disabled={weekOffset <= -4}
              activeOpacity={1}
            >
              <Ionicons name="chevron-back" size={18} color="#1f2937" />
            </TouchableOpacity>
            <Text className="text-xs text-gray-600 font-semibold">
              {formatWeekLabel(monday)}
            </Text>
            <TouchableOpacity
              className="w-8 h-8 rounded-full items-center justify-center bg-gray-100"
              onPress={() => {
                setWeekOffset((previous) => Math.min(previous + 1, 4));
                setSelectedDayIndex(0);
              }}
              disabled={weekOffset >= 4}
              activeOpacity={1}
            >
              <Ionicons name="chevron-forward" size={18} color="#1f2937" />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-4"
          >
            {weekDays.map((day, index) => {
              const dateString = toDateString(day);
              const isSelected = index === selectedDayIndex;
              const isPastDay = isPastDate(day);

              let dayContainerClass = "bg-white border-gray-200";
              if (isSelected) {
                dayContainerClass = "bg-gray-900 border-gray-900";
              } else if (isPastDay) {
                dayContainerClass = "bg-gray-100 border-gray-200";
              }

              let weekdayClass = "text-gray-500";
              if (isSelected) {
                weekdayClass = "text-gray-300";
              } else if (isPastDay) {
                weekdayClass = "text-gray-400";
              }

              let dateLabelClass = "text-gray-900";
              if (isSelected) {
                dateLabelClass = "text-white";
              } else if (isPastDay) {
                dateLabelClass = "text-gray-400";
              }

              return (
                <TouchableOpacity
                  key={dateString}
                  onPress={() => setSelectedDayIndex(index)}
                  activeOpacity={1}
                  className={`mr-2 px-4 py-3 rounded-xl border ${dayContainerClass}`}
                >
                  <Text className={`text-xs font-medium ${weekdayClass}`}>
                    {day.toLocaleDateString("en-GB", { weekday: "short" })}
                  </Text>
                  <Text className={`text-sm font-bold mt-1 ${dateLabelClass}`}>
                    {day.toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text className="text-xs text-gray-500 mt-4">
            Tap a 1-hour slot to activate/deactivate it. Active slots are saved
            to the database instantly. Slots with pending requests or planned
            sessions are highlighted below.
          </Text>
        </View>

        <ScrollView
          className="flex-1 px-6 mt-4"
          showsVerticalScrollIndicator={false}
        >
          <View className="pb-10 gap-y-3">
            {HOURS.map((hour) => {
              const key = `${selectedDateString}-${hour}`;
              const slot = slotsByDateHour[key];
              const linkedRequests = slot
                ? (requestsBySlotId[slot.id] ?? [])
                : [];
              const pendingRequestsCount = linkedRequests.filter(
                (request) => request.status === "PENDING",
              ).length;
              const acceptedRequestsCount = linkedRequests.filter(
                (request) => request.status === "ACCEPTED",
              ).length;
              const isToggling = togglingKey === key;
              const isBooked = Boolean(slot?.is_booked);
              const isPast = isPastHourSlot(selectedDate, hour);
              const isActive = Boolean(slot) && !isBooked;
              let impactLabel: string | null = null;
              let impactLabelClass = "text-amber-700";

              if (isPast) {
                impactLabel = "Past slot";
                impactLabelClass = "text-gray-500";
              } else if (acceptedRequestsCount > 0 || isBooked) {
                impactLabel = "Planned session exists";
                impactLabelClass = "text-red-600";
              } else if (pendingRequestsCount > 0) {
                impactLabel = `${pendingRequestsCount} pending request${
                  pendingRequestsCount > 1 ? "s" : ""
                } will be declined`;
              }

              let containerClass = "bg-white border-gray-200";
              let labelClass = "text-gray-900";
              let stateLabel = "Inactive";
              let statusIconName:
                | "lock-closed"
                | "checkmark-circle"
                | "add-circle-outline" = "add-circle-outline";
              let statusIconColor = "#6b7280";

              if (isPast) {
                containerClass = "bg-gray-100 border-gray-200";
                labelClass = "text-gray-400";
                stateLabel = "Past";
                statusIconName = "lock-closed";
                statusIconColor = "#9ca3af";
              } else if (isBooked) {
                containerClass = "bg-gray-100 border-gray-200";
                labelClass = "text-gray-500";
                stateLabel = "Booked";
                statusIconName = "lock-closed";
                statusIconColor = "#9ca3af";
              } else if (isActive) {
                containerClass = "bg-emerald-50 border-emerald-400";
                labelClass = "text-emerald-700";
                stateLabel = "Active";
                statusIconName = "checkmark-circle";
                statusIconColor = "#059669";
              }

              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => handleToggleSlot(hour)}
                  disabled={isToggling || isPending || isPast}
                  activeOpacity={isBooked || isPast ? 1 : 0.85}
                  className={`rounded-xl border px-4 py-4 flex-row items-center justify-between ${containerClass}`}
                >
                  <View>
                    <Text className={`font-bold ${labelClass}`}>
                      {formatHourRange(hour)}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-1">
                      {stateLabel}
                    </Text>
                    {impactLabel ? (
                      <Text
                        className={`text-xs mt-1 font-medium ${impactLabelClass}`}
                      >
                        {impactLabel}
                      </Text>
                    ) : null}
                  </View>

                  {isToggling ? (
                    <ActivityIndicator size="small" color="#4b5563" />
                  ) : (
                    <Ionicons
                      name={statusIconName}
                      size={20}
                      color={statusIconColor}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
