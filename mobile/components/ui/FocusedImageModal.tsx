import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Image,
  Modal,
  Pressable,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";

interface FocusedImageModalProps {
  visible: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

export function FocusedImageModal({
  visible,
  imageUrl,
  onClose,
}: Readonly<FocusedImageModalProps>) {
  const { width, height } = useWindowDimensions();

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable
        testID="focused-image-backdrop"
        className="flex-1 items-center justify-center bg-black/90"
        onPress={onClose}
      >
        <TouchableOpacity
          testID="focused-image-close"
          activeOpacity={0.8}
          onPress={onClose}
          className="absolute right-5 z-10 h-11 w-11 items-center justify-center rounded-full bg-white/15"
          style={{ top: 48 }}
          accessibilityRole="button"
          accessibilityLabel="Close image"
        >
          <Ionicons name="close" size={24} color="#ffffff" />
        </TouchableOpacity>

        {imageUrl ? (
          <Pressable onPress={(event) => event.stopPropagation()}>
            <Image
              testID="focused-image"
              source={{ uri: imageUrl }}
              resizeMode="contain"
              style={{
                width: width - 32,
                height: height - 140,
              }}
            />
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  );
}
