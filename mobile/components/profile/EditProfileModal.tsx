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
  Alert,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getAbsoluteUrl } from "@/lib/api/config";

import { pickImageFile, pickProfileAudioFile, pickProfileVideoFile } from "@/lib/uploads/picker";
import type { LocalUploadFile } from "@/lib/queries/uploads";

export interface UserProfileData {
  name: string;
  bio: string;
  pictureUrl?: string;
  linkedinUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
  showInitialsOnly?: boolean;
}

export interface SaveProfileData extends UserProfileData {
  pictureFile?: LocalUploadFile | null;
  removePicture?: boolean;
  audioFile?: LocalUploadFile | null;
  removeAudio?: boolean;
  videoFile?: LocalUploadFile | null;
  removeVideo?: boolean;
  showInitialsOnly?: boolean;
}

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  initialData: UserProfileData;
  onSave: (data: SaveProfileData) => Promise<boolean | void> | boolean | void;
}

function validateDisplayName(value: string): string | null {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "Name cannot be empty!";
  }

  if (/\d/.test(trimmedValue)) {
    return "Display name cannot contain numbers.";
  }

  return null;
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
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [pictureFile, setPictureFile] = useState<LocalUploadFile | null>(null);
  const [removePicture, setRemovePicture] = useState(false);
  const [audioFile, setAudioFile] = useState<LocalUploadFile | null>(null);
  const [removeAudio, setRemoveAudio] = useState(false);
  const [videoFile, setVideoFile] = useState<LocalUploadFile | null>(null);
  const [removeVideo, setRemoveVideo] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [isSaving, setSaving] = useState(false);
  const [showInitialsOnly, setShowInitialsOnly] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(initialData.name);
      setBio(initialData.bio);
      setLinkedinUrl(initialData.linkedinUrl || "");
      setPictureFile(null);
      setRemovePicture(false);
      setAudioFile(null);
      setRemoveAudio(false);
      setVideoFile(null);
      setRemoveVideo(false);
      setPickerError(null);
      setShowInitialsOnly(initialData.showInitialsOnly ?? false);
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

  const handlePickAudio = async () => {
    try {
      setPickerError(null);
      const nextFile = await pickProfileAudioFile();
      if (nextFile) {
        setAudioFile(nextFile);
        setRemoveAudio(false);
      }
    } catch (error) {
      setPickerError(
        error instanceof Error && error.message.trim()
          ? error.message
          : "Could not open document picker.",
      );
    }
  };

  const handlePickVideo = async () => {
    try {
      setPickerError(null);
      const nextFile = await pickProfileVideoFile();
      if (nextFile) {
        setVideoFile(nextFile);
        setRemoveVideo(false);
      }
    } catch (error) {
      setPickerError(
        error instanceof Error && error.message.trim()
          ? error.message
          : "Could not open document picker.",
      );
    }
  };

  const handleSave = async () => {
    const displayNameError = validateDisplayName(name);
    if (displayNameError) {
      alert(displayNameError);
      return;
    }

    setSaving(true);
    const didSave = await onSave({
      name: name.trim(),
      bio: bio.trim(),
      linkedinUrl: linkedinUrl.trim(),
      pictureUrl: initialData.pictureUrl,
      pictureFile,
      removePicture,
      audioFile,
      removeAudio,
      videoFile,
      removeVideo,
      showInitialsOnly,
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
              {isSaving
                ? pictureFile
                  ? "Uploading..."
                  : "Saving..."
                : "Save"}
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
              <View className="h-32 bg-indigo-50 relative -mx-6" />

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
                          source={{ uri: getAbsoluteUrl(previewUrl) }}
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
                      Alert.alert(
                        "Remove Profile Photo",
                        "Are you sure you want to remove your current profile picture?",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Remove",
                            style: "destructive",
                            onPress: () => {
                              setPictureFile(null);
                              setRemovePicture(true);
                            },
                          },
                        ],
                      );
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

              {/* LinkedIn URL Input */}
              <View>
                <Text className="text-sm font-bold text-gray-700 mb-2 ml-1">
                  LinkedIn Profile (Optional)
                </Text>
                <TextInput
                  value={linkedinUrl}
                  onChangeText={setLinkedinUrl}
                  placeholder="https://linkedin.com/in/username"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 h-14 text-base text-gray-900 font-medium"
                  autoCapitalize="none"
                  keyboardType="url"
                  style={
                    Platform.OS === "android"
                      ? { textAlignVertical: "center", paddingVertical: 0 }
                      : undefined
                  }
                />
              </View>

              {/* Media Introductions */}
              <View className="mt-4 border border-gray-200 rounded-xl p-4 bg-gray-50">
                <Text className="text-base font-bold text-gray-900 mb-1">
                  Extended Media
                </Text>
                <Text className="text-xs text-gray-500 mb-4">
                  Add an audio intro (max 20MB) or a short video (max 150MB).
                </Text>

                {/* Audio */}
                <View className="flex-row items-center justify-between mb-4 pb-4 border-b border-gray-200">
                  <View className="flex-row items-center flex-1 pr-4">
                    <View className="w-10 h-10 bg-indigo-100 rounded-full items-center justify-center mr-3">
                      <Ionicons name="mic" size={20} color="#4338ca" />
                    </View>
                    <View>
                      <Text className="text-sm font-bold text-gray-900">Audio Intro</Text>
                      <Text className="text-xs text-gray-500 mt-0.5">
                        {audioFile ? audioFile.name : (!removeAudio && initialData.audioUrl ? "Audio uploaded" : "No audio selected")}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row gap-2">
                    {(!removeAudio && initialData.audioUrl) || audioFile ? (
                      <TouchableOpacity
                        onPress={() => {
                          setAudioFile(null);
                          setRemoveAudio(true);
                        }}
                        className="p-2 border border-red-200 bg-red-50 rounded-lg"
                      >
                        <Ionicons name="trash" size={16} color="#dc2626" />
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      onPress={handlePickAudio}
                      className="px-3 py-2 bg-gray-900 rounded-lg"
                    >
                      <Text className="text-white text-xs font-bold">Upload</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Video */}
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1 pr-4">
                    <View className="w-10 h-10 bg-indigo-100 rounded-full items-center justify-center mr-3">
                      <Ionicons name="videocam" size={20} color="#4338ca" />
                    </View>
                    <View>
                      <Text className="text-sm font-bold text-gray-900">Video Intro</Text>
                      <Text className="text-xs text-gray-500 mt-0.5">
                        {videoFile ? videoFile.name : (!removeVideo && initialData.videoUrl ? "Video uploaded" : "No video selected")}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row gap-2">
                    {(!removeVideo && initialData.videoUrl) || videoFile ? (
                      <TouchableOpacity
                        onPress={() => {
                          setVideoFile(null);
                          setRemoveVideo(true);
                        }}
                        className="p-2 border border-red-200 bg-red-50 rounded-lg"
                      >
                        <Ionicons name="trash" size={16} color="#dc2626" />
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      onPress={handlePickVideo}
                      className="px-3 py-2 bg-gray-900 rounded-lg"
                    >
                      <Text className="text-white text-xs font-bold">Upload</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Show Initials Only Toggle */}
              <View
                testID="show-initials-toggle-container"
                className="flex-row items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-4"
              >
                <View className="flex-1 mr-3">
                  <Text className="text-sm font-bold text-gray-700">
                    Show initials only
                  </Text>
                  <Text className="text-xs text-gray-400 mt-0.5">
                    Your full name and picture will be hidden from others.
                  </Text>
                </View>
                <Switch
                  testID="show-initials-toggle"
                  value={showInitialsOnly}
                  onValueChange={setShowInitialsOnly}
                  trackColor={{ false: "#d1d5db", true: "#4f46e5" }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
