import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useToast } from "@/components/ui/ToastProvider";
import type { CommunityWorkshopDetail } from "@/lib/queries/workshops";

type WorkshopPickerMode = "date" | "startTime" | "endTime" | null;

function formatWorkshopDate(value: Date | null) {
  if (!value) {
    return "Select date";
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatWorkshopTime(value: Date | null) {
  if (!value) {
    return "Select time";
  }

  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function buildWorkshopDateTime(dateValue: Date, timeValue: Date) {
  const combined = new Date(dateValue);
  combined.setHours(timeValue.getHours(), timeValue.getMinutes(), 0, 0);
  return combined.toISOString();
}

function toDateOnly(value: string) {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toTimeOnly(value: string) {
  const date = new Date(value);
  return new Date(2000, 0, 1, date.getHours(), date.getMinutes(), 0, 0);
}

export function WorkshopEditorSheet({
  visible,
  workshop,
  isSubmitting = false,
  onClose,
  onSubmit,
}: Readonly<{
  visible: boolean;
  workshop: CommunityWorkshopDetail | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    title: string;
    description: string;
    scheduled_at: string;
    end_at: string;
    max_participants: number;
  }) => Promise<boolean | void> | boolean | void;
}>) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [workshopDate, setWorkshopDate] = useState<Date | null>(null);
  const [workshopStartTime, setWorkshopStartTime] = useState<Date | null>(null);
  const [workshopEndTime, setWorkshopEndTime] = useState<Date | null>(null);
  const [maxParticipants, setMaxParticipants] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [activePicker, setActivePicker] = useState<WorkshopPickerMode>(null);
  const [pickerDraftValue, setPickerDraftValue] = useState(new Date());

  useEffect(() => {
    if (!visible || !workshop) {
      return;
    }

    setTitle(workshop.title);
    setDescription(workshop.description);
    setWorkshopDate(toDateOnly(workshop.scheduled_at));
    setWorkshopStartTime(toTimeOnly(workshop.scheduled_at));
    setWorkshopEndTime(toTimeOnly(workshop.end_at));
    setMaxParticipants(String(workshop.max_participants));
    setFormError(null);
    setActivePicker(null);
    setPickerDraftValue(new Date(workshop.scheduled_at));
  }, [visible, workshop]);

  const showValidationError = (message: string) => {
    setFormError(message);
    toast.warning(message, { title: "Workshop details" });
  };

  const openPicker = (pickerMode: Exclude<WorkshopPickerMode, null>) => {
    setFormError(null);
    const nextValue =
      pickerMode === "date"
        ? workshopDate ?? new Date()
        : pickerMode === "startTime"
          ? workshopStartTime ?? new Date()
          : workshopEndTime ?? workshopStartTime ?? new Date();

    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: nextValue,
        mode: pickerMode === "date" ? "date" : "time",
        is24Hour: true,
        onChange: (event, selectedValue) => {
          if (event.type === "dismissed" || !selectedValue) {
            return;
          }

          if (pickerMode === "date") {
            setWorkshopDate(selectedValue);
          } else if (pickerMode === "startTime") {
            setWorkshopStartTime(selectedValue);
          } else {
            setWorkshopEndTime(selectedValue);
          }
        },
      });
      return;
    }

    setPickerDraftValue(nextValue);
    setActivePicker(pickerMode);
  };

  const handlePickerChange = (
    event: { type?: string },
    selectedValue?: Date,
  ) => {
    if (event.type === "dismissed") {
      setActivePicker(null);
      return;
    }

    if (!selectedValue || !activePicker) {
      return;
    }

    setPickerDraftValue(selectedValue);
    setFormError(null);
  };

  const confirmPickerSelection = () => {
    if (!activePicker) {
      return;
    }

    if (activePicker === "date") {
      setWorkshopDate(pickerDraftValue);
    } else if (activePicker === "startTime") {
      setWorkshopStartTime(pickerDraftValue);
    } else {
      setWorkshopEndTime(pickerDraftValue);
    }

    setActivePicker(null);
  };

  const handleSubmit = async () => {
    if (!workshopDate || !workshopStartTime || !workshopEndTime) {
      showValidationError("Pick a workshop date, start time, and end time.");
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      showValidationError("Workshop title cannot be empty.");
      return;
    }

    const scheduled_at = buildWorkshopDateTime(workshopDate, workshopStartTime);
    const end_at = buildWorkshopDateTime(workshopDate, workshopEndTime);
    const parsedMaxParticipants = Number(maxParticipants.trim());

    if (
      !Number.isInteger(parsedMaxParticipants) ||
      !(parsedMaxParticipants > 0)
    ) {
      showValidationError(
        "Maximum participants must be a whole number greater than 0.",
      );
      return;
    }

    if (new Date(end_at).getTime() <= new Date(scheduled_at).getTime()) {
      showValidationError("Workshop end time must be after the start time.");
      return;
    }

    const didSubmit = await onSubmit({
      title: trimmedTitle,
      description: description.trim(),
      scheduled_at,
      end_at,
      max_participants: parsedMaxParticipants,
    });

    if (didSubmit === false) {
      return;
    }

    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          className="rounded-t-3xl bg-surface px-6 pb-8 pt-5 dark:bg-surface-dark"
        >
          <View className="items-center pb-4">
            <View className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-600" />
          </View>

          <Text className="text-2xl font-extrabold text-on-surface dark:text-on-surface-dark">
            Edit workshop
          </Text>
          <Text className="mt-2 text-sm text-on-surface-soft dark:text-on-surface-soft-dark">
            Update the workshop details before participants arrive.
          </Text>

          <View className="mt-5 gap-3">
            <TextInput
              testID="workshop-editor-title-input"
              value={title}
              onChangeText={(value) => {
                setTitle(value);
                if (formError) {
                  setFormError(null);
                }
              }}
              placeholder="Workshop title"
              placeholderTextColor="#8f939f"
              className="rounded-2xl border border-divider px-4 py-3 text-base text-on-surface dark:border-divider-dark dark:text-on-surface-dark"
            />
            <TextInput
              testID="workshop-editor-description-input"
              value={description}
              onChangeText={(value) => {
                setDescription(value);
                if (formError) {
                  setFormError(null);
                }
              }}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholder="What will this workshop cover?"
              placeholderTextColor="#8f939f"
              className="min-h-[120px] rounded-2xl border border-divider px-4 py-3 text-base text-on-surface dark:border-divider-dark dark:text-on-surface-dark"
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                testID="workshop-editor-date-trigger"
                activeOpacity={0.85}
                onPress={() => openPicker("date")}
                className="flex-1 rounded-2xl border border-divider px-4 py-3 dark:border-divider-dark"
              >
                <Text className="text-sm font-semibold text-on-surface-soft dark:text-on-surface-soft-dark">
                  Date
                </Text>
                <Text className="mt-1 text-base text-on-surface dark:text-on-surface-dark">
                  {formatWorkshopDate(workshopDate)}
                </Text>
              </TouchableOpacity>
              <View className="w-32 rounded-2xl border border-divider px-4 py-3 dark:border-divider-dark">
                <Text className="text-sm font-semibold text-on-surface-soft dark:text-on-surface-soft-dark">
                  Capacity
                </Text>
                <TextInput
                  testID="workshop-editor-capacity-input"
                  value={maxParticipants}
                  onChangeText={(value) => {
                    setMaxParticipants(value.replace(/[^0-9]/g, ""));
                    if (formError) {
                      setFormError(null);
                    }
                  }}
                  keyboardType="number-pad"
                  placeholder="10"
                  placeholderTextColor="#8f939f"
                  className="mt-1 text-base text-on-surface dark:text-on-surface-dark"
                />
              </View>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                testID="workshop-editor-start-time-trigger"
                activeOpacity={0.85}
                onPress={() => openPicker("startTime")}
                className="flex-1 rounded-2xl border border-divider px-4 py-3 dark:border-divider-dark"
              >
                <Text className="text-sm font-semibold text-on-surface-soft dark:text-on-surface-soft-dark">
                  Start
                </Text>
                <Text className="mt-1 text-base text-on-surface dark:text-on-surface-dark">
                  {formatWorkshopTime(workshopStartTime)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="workshop-editor-end-time-trigger"
                activeOpacity={0.85}
                onPress={() => openPicker("endTime")}
                className="flex-1 rounded-2xl border border-divider px-4 py-3 dark:border-divider-dark"
              >
                <Text className="text-sm font-semibold text-on-surface-soft dark:text-on-surface-soft-dark">
                  End
                </Text>
                <Text className="mt-1 text-base text-on-surface dark:text-on-surface-dark">
                  {formatWorkshopTime(workshopEndTime)}
                </Text>
              </TouchableOpacity>
            </View>

            {formError ? (
              <Text className="text-sm font-medium text-error dark:text-red-200">
                {formError}
              </Text>
            ) : null}
          </View>

          <View className="mt-6 flex-row gap-3">
            <TouchableOpacity
              testID="workshop-editor-cancel"
              activeOpacity={0.85}
              onPress={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-2xl border border-divider px-4 py-3 dark:border-divider-dark"
            >
              <Text className="text-center text-base font-semibold text-on-surface dark:text-on-surface-dark">
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="workshop-editor-save"
              activeOpacity={0.88}
              onPress={() => {
                void handleSubmit();
              }}
              disabled={isSubmitting}
              className="flex-1 rounded-2xl bg-primary px-4 py-3 dark:bg-primary-dim"
            >
              <Text className="text-center text-base font-bold text-white">
                {isSubmitting ? "Saving..." : "Save changes"}
              </Text>
            </TouchableOpacity>
          </View>

          {activePicker ? (
            <Modal
              animationType="fade"
              transparent
              visible
              onRequestClose={() => setActivePicker(null)}
            >
              <Pressable
                className="flex-1 items-center justify-center bg-black/45 px-5"
                onPress={() => setActivePicker(null)}
              >
                <Pressable
                  onPress={(event) => event.stopPropagation()}
                  className="w-full max-w-md rounded-3xl bg-surface-card p-5 shadow-lg dark:bg-surface-card-dark"
                >
                  <Text className="text-xl font-extrabold text-on-surface dark:text-on-surface-dark">
                    {activePicker === "date"
                      ? "Select workshop date"
                      : activePicker === "startTime"
                        ? "Select start time"
                        : "Select end time"}
                  </Text>

                  <DateTimePicker
                    testID="workshop-editor-picker"
                    value={pickerDraftValue}
                    mode={activePicker === "date" ? "date" : "time"}
                    display="spinner"
                    is24Hour
                    onChange={handlePickerChange}
                    style={{ alignSelf: "stretch", marginTop: 12 }}
                  />

                  <View className="mt-4 flex-row gap-3">
                    <TouchableOpacity
                      testID="workshop-editor-picker-cancel"
                      activeOpacity={0.85}
                      onPress={() => setActivePicker(null)}
                      className="flex-1 rounded-2xl border border-divider px-4 py-3 dark:border-divider-dark"
                    >
                      <Text className="text-center text-base font-semibold text-on-surface dark:text-on-surface-dark">
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      testID="workshop-editor-picker-confirm"
                      activeOpacity={0.88}
                      onPress={confirmPickerSelection}
                      className="flex-1 rounded-2xl bg-primary px-4 py-3 dark:bg-primary-dim"
                    >
                      <Text className="text-center text-base font-bold text-white">
                        Confirm
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Pressable>
              </Pressable>
            </Modal>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
