import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Offering } from "./MentorshipOfferings";
import type { AvailabilitySlot } from "./AvailabilityPreview";

interface BookingModalProps {
  visible: boolean;
  onClose: () => void;
  offering: Offering | null;
  availability: AvailabilitySlot[];
  existingSession?: { date: string; time: string };
  isFirstTime?: boolean;
}

const MAX_COVER_LETTER_LENGTH = 300;
const DEFAULT_START_TIME = "10:00";
const DEFAULT_END_TIME = "11:00";

interface DateOption {
  date: string;
  dayOfWeek: string;
  rawDate: string;
}

function toDateOptions(availability: AvailabilitySlot[]): DateOption[] {
  const options: DateOption[] = [];
  const today = new Date();

  for (let i = 1; i <= 14; i += 1) {
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + i);

    options.push({
      date: nextDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      dayOfWeek: nextDate.toLocaleDateString("en-US", { weekday: "long" }),
      rawDate: nextDate.toISOString().split("T")[0],
    });
  }

  return options.filter((candidate) =>
    availability.some(
      (slot) => slot.day === candidate.dayOfWeek && slot.times.length > 0,
    ),
  );
}

function toSlotLabel(
  entry: string | { id: string; label: string; isBooked?: boolean },
): string {
  return typeof entry === "string" ? entry : entry.label;
}

function expandHourlySlots(daySchedule?: AvailabilitySlot): string[] {
  if (!daySchedule) {
    return [];
  }

  const generatedSlots: string[] = [];

  daySchedule.times.forEach((entry) => {
    const block = toSlotLabel(entry);
    const [start, end] = block.split(" - ");
    const startHour = Number.parseInt(start.split(":")[0], 10);
    const endHour = Number.parseInt(end.split(":")[0], 10);

    for (let hour = startHour; hour < endHour; hour += 1) {
      const formattedStart = `${String(hour).padStart(2, "0")}:00`;
      const formattedEnd = `${String(hour + 1).padStart(2, "0")}:00`;
      generatedSlots.push(`${formattedStart} - ${formattedEnd}`);
    }
  });

  return generatedSlots;
}

function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function getHeaderTitle(isFirstTime: boolean, step: 1 | 2): string {
  if (!isFirstTime) {
    return "Confirm Booking";
  }

  return step === 1 ? "Select Time" : "Cover Letter";
}

export function BookingModal({
  visible,
  onClose,
  offering,
  availability,
  existingSession,
  isFirstTime = true,
}: Readonly<BookingModalProps>) {
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDateObj, setSelectedDateObj] = useState<DateOption | null>(
    null,
  );
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [isCustomTime, setIsCustomTime] = useState(false);
  const [customStartTime, setCustomStartTime] = useState(DEFAULT_START_TIME);
  const [customEndTime, setCustomEndTime] = useState(DEFAULT_END_TIME);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setStep(1);
    setSelectedDateObj(null);
    setSelectedSlot(null);
    setCoverLetter("");
    setIsCustomTime(false);
    setCustomStartTime(DEFAULT_START_TIME);
    setCustomEndTime(DEFAULT_END_TIME);
    setIsLoading(false);
  }, [visible]);

  const availableDates = useMemo(
    () => toDateOptions(availability),
    [availability],
  );

  const dynamicSlots = useMemo(() => {
    if (!selectedDateObj) {
      return [];
    }

    const daySchedule = availability.find(
      (slot) => slot.day === selectedDateObj.dayOfWeek,
    );
    return expandHourlySlots(daySchedule);
  }, [availability, selectedDateObj]);

  if (!offering) {
    return null;
  }

  const handleTimeInput = (text: string, setValue: (next: string) => void) => {
    const cleaned = text.replaceAll(/\D/g, "");
    if (cleaned.length <= 2) {
      setValue(cleaned);
      return;
    }

    setValue(`${cleaned.slice(0, 2)}:${cleaned.slice(2, 4)}`);
  };

  const handleCloseWithWarning = () => {
    const hasUnsavedChanges =
      selectedDateObj !== null || isCustomTime || coverLetter.length > 0;

    if (!hasUnsavedChanges || isLoading) {
      onClose();
      return;
    }

    Alert.alert(
      "Discard Request?",
      "You have unsaved changes. Are you sure you want to discard this and go back?",
      [
        { text: "Keep Editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: onClose },
      ],
    );
  };

  const getProposedTime = (): string | null => {
    if (isCustomTime) {
      return `${customStartTime} - ${customEndTime}`;
    }

    return selectedSlot;
  };

  const validateSelection = (): string | null => {
    if (!selectedDateObj) {
      return "Please select a date for the session.";
    }

    if (!isCustomTime && !selectedSlot) {
      return "Please select an available slot or propose a custom time.";
    }

    if (!isCustomTime) {
      return null;
    }

    if (!isValidTime(customStartTime) || !isValidTime(customEndTime)) {
      return "Please use a valid 24-hour format (e.g., 09:00, 14:30).";
    }

    if (toMinutes(customStartTime) >= toMinutes(customEndTime)) {
      return "The start time must be strictly before the end time.";
    }

    return null;
  };

  const submit = () => {
    if (isFirstTime && coverLetter.trim().length < 10) {
      Alert.alert(
        "Cover Letter too short",
        "Please provide a bit more detail about what you want to discuss.",
      );
      return;
    }

    const finalTime = getProposedTime();
    if (!finalTime || !selectedDateObj) {
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      Alert.alert(
        isFirstTime ? "Request Sent!" : "Booking Confirmed!",
        isFirstTime
          ? `Your request for ${offering.title} on ${selectedDateObj.date} at ${finalTime} has been sent.`
          : `Your booking for ${offering.title} on ${selectedDateObj.date} at ${finalTime} is confirmed.`,
        [{ text: "Great", onPress: onClose }],
      );
    }, 1500);
  };

  const handlePrimaryAction = () => {
    const validationError = validateSelection();
    if (validationError) {
      Alert.alert("Missing Information", validationError);
      return;
    }

    const finalTime = getProposedTime();
    if (existingSession && selectedDateObj && finalTime) {
      if (
        selectedDateObj.rawDate === existingSession.date &&
        finalTime === existingSession.time
      ) {
        Alert.alert(
          "No Change Detected",
          "You selected the exact same date and time as your current session. Please select a new slot to reschedule.",
        );
        return;
      }
    }

    if (!isFirstTime) {
      submit();
      return;
    }

    if (step === 1) {
      setStep(2);
      return;
    }

    submit();
  };

  const showCoverLetter = isFirstTime && step === 2;
  const title = getHeaderTitle(isFirstTime, step);

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
        <View className="flex-row justify-between items-center px-6 py-4 border-b border-gray-100 mb-2">
          <TouchableOpacity
            onPress={() => {
              if (showCoverLetter) {
                setStep(1);
                return;
              }

              handleCloseWithWarning();
            }}
            className="p-2 -ml-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={isLoading}
          >
            <Ionicons
              name={showCoverLetter ? "arrow-back" : "close"}
              size={24}
              color="#4b5563"
            />
          </TouchableOpacity>

          <Text className="text-xl font-extrabold text-gray-900">{title}</Text>
          <View className="w-8" />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            className="flex-1 px-6"
            keyboardShouldPersistTaps="handled"
          >
            <View className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 mb-8 mt-4">
              <View className="flex-row items-center mb-3">
                <View className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm mr-3">
                  <Ionicons
                    name={offering.icon as never}
                    size={20}
                    color="#4f46e5"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-900">
                    {offering.title}
                  </Text>
                  <Text className="text-indigo-600 font-semibold">
                    {offering.duration} • {offering.level}
                  </Text>
                </View>
              </View>
              <Text className="text-gray-700 leading-5">
                {offering.description ||
                  "A comprehensive mentorship session tailored to your needs."}
              </Text>
            </View>

            {step === 1 ? (
              <View className="pb-12">
                <Text className="text-base font-bold text-gray-900 mb-3">
                  1. Select a Date
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-8 -mx-6 px-6"
                >
                  {availableDates.length === 0 ? (
                    <Text className="text-gray-500 italic">
                      No available dates found.
                    </Text>
                  ) : (
                    availableDates.map((dateObj) => {
                      const isSelected = selectedDateObj?.date === dateObj.date;
                      return (
                        <TouchableOpacity
                          key={dateObj.date}
                          activeOpacity={0.9}
                          onPress={() => {
                            setSelectedDateObj(dateObj);
                            setSelectedSlot(null);
                          }}
                          className={
                            isSelected
                              ? "mr-3 py-3 px-5 rounded-xl border bg-indigo-600 border-indigo-600"
                              : "mr-3 py-3 px-5 rounded-xl border bg-white border-gray-200"
                          }
                        >
                          <Text
                            className={`font-bold ${isSelected ? "text-white" : "text-gray-700"}`}
                          >
                            {dateObj.date}
                          </Text>
                          <Text
                            className={`text-xs mt-0.5 ${isSelected ? "text-indigo-100" : "text-gray-400"}`}
                          >
                            {dateObj.dayOfWeek}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>

                {selectedDateObj ? (
                  <View>
                    <Text className="text-base font-bold text-gray-900 mb-3">
                      2. Select an Available Slot
                    </Text>

                    {dynamicSlots.length === 0 ? (
                      <Text className="text-gray-500 italic mb-4">
                        No slots available for this day.
                      </Text>
                    ) : (
                      <View className="flex-row flex-wrap gap-3 mb-4">
                        {dynamicSlots.map((slot) => {
                          const isSelected =
                            !isCustomTime && selectedSlot === slot;
                          return (
                            <TouchableOpacity
                              key={slot}
                              activeOpacity={0.9}
                              onPress={() => {
                                setSelectedSlot(slot);
                                setIsCustomTime(false);
                              }}
                              className={
                                isSelected
                                  ? "py-3 px-4 rounded-xl border w-[47%] items-center bg-indigo-600 border-indigo-600"
                                  : "py-3 px-4 rounded-xl border w-[47%] items-center bg-white border-gray-200"
                              }
                            >
                              <Text
                                className={`font-bold ${isSelected ? "text-white" : "text-gray-700"}`}
                              >
                                {slot}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    <View className="flex-row items-center mb-4 mt-2">
                      <View className="flex-1 h-[1px] bg-gray-200" />
                      <Text className="text-xs font-bold text-gray-400 px-3 uppercase tracking-wider">
                        OR
                      </Text>
                      <View className="flex-1 h-[1px] bg-gray-200" />
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => {
                        setIsCustomTime(true);
                        setSelectedSlot(null);
                      }}
                      className={
                        isCustomTime
                          ? "py-4 rounded-xl items-center border bg-indigo-600 border-indigo-600"
                          : "py-4 rounded-xl items-center border bg-white border-gray-200"
                      }
                    >
                      <Text
                        className={`font-bold ${isCustomTime ? "text-white" : "text-gray-700"}`}
                      >
                        Propose Another Time
                      </Text>
                    </TouchableOpacity>

                    {isCustomTime ? (
                      <View className="flex-row items-center gap-4 mt-4">
                        <View className="flex-1">
                          <Text className="text-xs font-bold text-gray-500 mb-1 ml-1">
                            Start Time
                          </Text>
                          <TextInput
                            value={customStartTime}
                            onChangeText={(value) =>
                              handleTimeInput(value, setCustomStartTime)
                            }
                            keyboardType="number-pad"
                            maxLength={5}
                            className="bg-white border border-gray-200 py-4 px-4 rounded-xl text-center text-gray-900 font-bold text-lg"
                          />
                        </View>
                        <Text className="text-gray-400 font-bold mt-4">-</Text>
                        <View className="flex-1">
                          <Text className="text-xs font-bold text-gray-500 mb-1 ml-1">
                            End Time
                          </Text>
                          <TextInput
                            value={customEndTime}
                            onChangeText={(value) =>
                              handleTimeInput(value, setCustomEndTime)
                            }
                            keyboardType="number-pad"
                            maxLength={5}
                            className="bg-white border border-gray-200 py-4 px-4 rounded-xl text-center text-gray-900 font-bold text-lg"
                          />
                        </View>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : (
              <View className="pb-12 mt-2">
                <View className="flex-row justify-between items-end mb-2 ml-1 mr-1">
                  <Text className="text-base font-bold text-gray-900">
                    Add a Cover Letter
                  </Text>
                  <Text
                    className={`text-xs font-bold ${coverLetter.length >= MAX_COVER_LETTER_LENGTH ? "text-red-500" : "text-gray-400"}`}
                  >
                    {coverLetter.length}/{MAX_COVER_LETTER_LENGTH}
                  </Text>
                </View>
                <TextInput
                  value={coverLetter}
                  onChangeText={setCoverLetter}
                  placeholder="Introduce yourself and explain what you'd like to achieve in this session..."
                  multiline={true}
                  maxLength={MAX_COVER_LETTER_LENGTH}
                  textAlignVertical="top"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900 h-48"
                />
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        <View className="px-6 py-4 border-t border-gray-100">
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handlePrimaryAction}
            disabled={isLoading}
            className={`py-4 rounded-xl items-center shadow-sm flex-row justify-center ${isLoading ? "bg-indigo-400" : "bg-indigo-600"}`}
          >
            {isLoading ? (
              <ActivityIndicator color="white" className="mr-2" />
            ) : null}
            <Text className="text-lg font-bold text-white">
              {isLoading
                ? isFirstTime
                  ? "Sending Request..."
                  : "Confirming..."
                : isFirstTime
                  ? step === 1
                    ? "Continue"
                    : "Send Request"
                  : "Confirm Booking"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
