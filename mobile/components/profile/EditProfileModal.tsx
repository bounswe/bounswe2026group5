import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { pickImageFile } from "@/lib/uploads/picker";
import type { LocalUploadFile } from "@/lib/queries/uploads";

export interface UserProfileData {
  name: string;
  bio: string;
  pictureUrl?: string;
}

export interface SaveProfileData extends UserProfileData {
  pictureFile?: LocalUploadFile | null;
  removePicture?: boolean;
}

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  initialData: UserProfileData;
  onSave: (data: SaveProfileData) => Promise<boolean | void> | boolean | void;
}

export function EditProfileModal({
  visible,
  onClose,
  initialData,
  onSave,
}: Readonly<EditProfileModalProps>) {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [pictureFile, setPictureFile] = useState<LocalUploadFile | null>(null);
  const [removePicture, setRemovePicture] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [isSaving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(initialData.name);
      setBio(initialData.bio);
      setPictureFile(null);
      setRemovePicture(false);
      setPickerError(null);
    }
  }, [visible, initialData]);

  const handlePickAvatar = async () => {
    try {
      setPickerError(null);
      const nextFile = await pickImageFile();
      if (nextFile) {
        setPictureFile(nextFile);
        setRemovePicture(false);
      }
    } catch (error) {
      setPickerError(
        error instanceof Error && error.message.trim()
          ? error.message
          : "Could not open your photo library.",
      );
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Name cannot be empty!");
      return;
    }

    setSaving(true);
    const didSave = await onSave({
      name: name.trim(),
      bio: bio.trim(),
      pictureUrl: initialData.pictureUrl,
      pictureFile,
      removePicture,
    });
    setSaving(false);

    if (didSave === false) {
      return;
    }
    onClose();
  };

  const previewUrl =
    pictureFile?.uri || (!removePicture ? initialData.pictureUrl : "");

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
        {/* Header */}
        <View className="flex-row justify-between items-center px-6 py-4 border-b border-gray-100 mb-2">
          <TouchableOpacity
            testID="close-button"
            onPress={onClose}
            className="p-2 -ml-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color="#4b5563" />
          </TouchableOpacity>
          <Text className="text-xl font-extrabold text-gray-900">
            Edit Profile
          </Text>
          <TouchableOpacity
            testID="save-button"
            onPress={handleSave}
            disabled={isSaving}
            className="bg-gray-900 px-5 py-2 rounded-full"
          >
            <Text className="text-white font-bold text-sm">
              {isSaving ? "Saving..." : "Save"}
            </Text>
          </TouchableOpacity>
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
            <View className="mb-8">
              {/* 1. The Cover Photo Area */}
              <View className="h-32 bg-indigo-50 relative -mx-6">
                <TouchableOpacity
                  className="absolute bottom-3 right-4 bg-gray-900/60 px-3 py-1.5 rounded-full flex-row items-center"
                  onPress={() => console.log("TODO: Change Cover Photo")}
                >
                  <Ionicons name="camera" size={16} color="white" />
                  <Text className="text-white text-xs font-bold ml-1.5">
                    Edit Cover
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 2. The Overlapping Avatar */}
              <View className="items-center -mt-12">
                <View className="relative">
                  <View className="w-24 h-24 bg-white rounded-full items-center justify-center shadow-sm">
                    {/* Inner circle */}
                    <View
                      className="w-22 h-22 bg-indigo-100 rounded-full items-center justify-center border-4 border-white overflow-hidden"
                      style={{ width: 88, height: 88 }}
                    >
                      {previewUrl ? (
                        <Image
                          testID="avatar-preview"
                          source={{ uri: previewUrl }}
                          className="h-full w-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <Text className="text-3xl font-bold text-indigo-700">
                          {name ? name.charAt(0).toUpperCase() : "?"}
                        </Text>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity
                    testID="avatar-picker-button"
                    className="absolute bottom-0 right-0 bg-gray-900 w-8 h-8 rounded-full items-center justify-center border-2 border-white"
                    onPress={handlePickAvatar}
                  >
                    <Ionicons name="camera" size={14} color="white" />
                  </TouchableOpacity>
                </View>
                {previewUrl ? (
                  <TouchableOpacity
                    testID="avatar-remove-button"
                    onPress={() => {
                      setPictureFile(null);
                      setRemovePicture(true);
                    }}
                    className="mt-3 rounded-full border border-gray-200 px-4 py-2"
                  >
                    <Text className="text-xs font-bold text-gray-600">
                      Remove photo
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {pickerError ? (
                  <Text
                    testID="avatar-picker-error"
                    className="mt-2 text-xs font-semibold text-red-600"
                  >
                    {pickerError}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Form Fields */}
            <View className="gap-y-6 pb-12">
              {/* Name Input - FIXED CLIPPING BUG */}
              <View>
                <Text className="text-sm font-bold text-gray-700 mb-2 ml-1">
                  Full Name
                </Text>
                <TextInput
                  testID="name-input"
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 h-14 text-base text-gray-900 font-medium"
                  style={
                    Platform.OS === "android"
                      ? { textAlignVertical: "center", paddingVertical: 0 }
                      : undefined
                  }
                />
              </View>

              {/* Bio Input */}
              <View>
                <View className="flex-row justify-between items-end mb-2 ml-1 mr-1">
                  <Text className="text-sm font-bold text-gray-700">Bio</Text>
                  <Text className="text-xs text-gray-400 font-medium">
                    {bio.length}/500
                  </Text>
                </View>
                <TextInput
                  testID="bio-input"
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell mentees about yourself..."
                  multiline={true}
                  maxLength={500}
                  textAlignVertical="top"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900 h-32"
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
