import React, { useMemo, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

export interface RequestableSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
}

interface SlotRequestComposerProps {
  canRequest: boolean;
  slots: RequestableSlot[];
  isSubmitting: boolean;
  feedbackMessage?: string | null;
  onSubmit: (payload: { slotId: string; coverLetter: string }) => Promise<void> | void;
}

export function SlotRequestComposer({
  canRequest,
  slots,
  isSubmitting,
  feedbackMessage,
  onSubmit,
}: Readonly<SlotRequestComposerProps>) {
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState("");

  const slotCards = useMemo(
    () =>
      slots.map((slot) => ({
        id: slot.id,
        label: `${slot.date}  ${slot.startTime.slice(0, 5)} - ${slot.endTime.slice(0, 5)}`,
      })),
    [slots],
  );

  const handleSubmit = async () => {
    if (!selectedSlotId || isSubmitting || !canRequest) {
      return;
    }

    await onSubmit({
      slotId: selectedSlotId,
      coverLetter: coverLetter.trim(),
    });

    setSelectedSlotId(null);
    setCoverLetter("");
  };

  return (
    <View className="mb-6">
      <Text className="text-lg font-bold text-gray-900 mb-3">Request a Session</Text>

      {slotCards.length === 0 ? (
        <View className="bg-gray-50 border border-gray-200 rounded-xl p-3">
          <Text className="text-gray-600 text-sm">No upcoming slots available.</Text>
        </View>
      ) : (
        <View className="gap-2 mb-3">
          {slotCards.map((slot) => {
            const isSelected = selectedSlotId === slot.id;
            return (
              <TouchableOpacity
                key={slot.id}
                disabled={!canRequest}
                onPress={() => setSelectedSlotId(slot.id)}
                className={`rounded-xl border p-3 ${
                  isSelected
                    ? "bg-indigo-600 border-indigo-600"
                    : "bg-white border-gray-200"
                }`}
              >
                <Text
                  className={
                    isSelected
                      ? "text-white font-semibold"
                      : "text-gray-900 font-semibold"
                  }
                >
                  {slot.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <TextInput
        value={coverLetter}
        onChangeText={setCoverLetter}
        placeholder="Optional cover letter"
        multiline
        textAlignVertical="top"
        className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 min-h-[88px] text-gray-900"
      />

      <TouchableOpacity
        disabled={!canRequest || !selectedSlotId || isSubmitting}
        onPress={handleSubmit}
        className={`mt-3 rounded-xl py-3 items-center ${
          !canRequest || !selectedSlotId || isSubmitting
            ? "bg-gray-300"
            : "bg-indigo-600"
        }`}
      >
        <Text className="text-white font-semibold">
          {isSubmitting ? "Sending..." : "Send Request"}
        </Text>
      </TouchableOpacity>

      {!!feedbackMessage && (
        <Text className="text-sm text-gray-600 mt-2">{feedbackMessage}</Text>
      )}
    </View>
  );
}
