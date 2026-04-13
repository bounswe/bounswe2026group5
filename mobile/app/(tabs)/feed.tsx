import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";

import { PostCard } from "@/components/feed/PostCard";
import { useCreatePostMutation, useFeedQuery, type Post } from "@/lib/queries/posts";

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const feedQuery = useFeedQuery();
  const createMutation = useCreatePostMutation();

  const [showCompose, setShowCompose] = useState(false);
  const [content, setContent] = useState("");
  const [pickedImageUri, setPickedImageUri] = useState<string | null>(null);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Allow photo library access to attach images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setPickedImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    try {
      await createMutation.mutateAsync({
        content: content.trim(),
        imageUri: pickedImageUri ?? undefined,
      });
      setContent("");
      setPickedImageUri(null);
      setShowCompose(false);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to post.");
    }
  };

  const handleCloseCompose = () => {
    setContent("");
    setPickedImageUri(null);
    setShowCompose(false);
  };

  const renderItem = ({ item }: { item: Post }) => <PostCard post={item} />;
  const keyExtractor = (item: Post) => item.id;

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View
        className="bg-white border-b border-gray-100 shadow-sm z-10"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row justify-between items-center px-4 pb-3 pt-2">
          <Text className="text-2xl font-extrabold text-gray-900">Feed</Text>
          <TouchableOpacity
            onPress={() => setShowCompose(true)}
            className="bg-indigo-600 flex-row items-center px-3 py-1.5 rounded-full"
          >
            <Ionicons name="add" size={18} color="white" />
            <Text className="text-white font-semibold text-sm ml-1">Post</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Feed list */}
      {feedQuery.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : feedQuery.isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="cloud-offline-outline" size={48} color="#d1d5db" />
          <Text className="text-gray-400 mt-3 text-center">
            Could not load feed. Pull to refresh.
          </Text>
        </View>
      ) : (
        <FlatList
          data={feedQuery.data ?? []}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 120 }}
          onRefresh={feedQuery.refetch}
          refreshing={feedQuery.isRefetching}
          ListEmptyComponent={
            <View className="items-center justify-center pt-20 px-8">
              <Ionicons name="newspaper-outline" size={56} color="#d1d5db" />
              <Text className="text-gray-500 font-semibold text-lg mt-4">No posts yet</Text>
              <Text className="text-gray-400 text-sm mt-1 text-center">
                Be the first to share something with the community!
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Compose Modal */}
      <Modal
        visible={showCompose}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseCompose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 bg-white"
          style={{ paddingTop: insets.top }}
        >
          {/* Modal header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
            <TouchableOpacity onPress={handleCloseCompose}>
              <Text className="text-gray-500 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="font-bold text-gray-900 text-base">New Post</Text>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!content.trim() || createMutation.isPending}
              className={`px-4 py-1.5 rounded-full ${
                content.trim() && !createMutation.isPending
                  ? "bg-indigo-600"
                  : "bg-indigo-200"
              }`}
            >
              {createMutation.isPending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-semibold text-sm">Share</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Text input */}
          <TextInput
            className="px-4 pt-4 text-gray-900 text-base"
            placeholder="What's on your mind?"
            placeholderTextColor="#9ca3af"
            multiline
            autoFocus
            value={content}
            onChangeText={setContent}
            maxLength={1000}
            style={{ minHeight: 120, textAlignVertical: "top" }}
          />

          {/* Picked image preview */}
          {pickedImageUri && (
            <View className="mx-4 mt-2 relative">
              <ExpoImage
                source={{ uri: pickedImageUri }}
                style={{ height: 180, borderRadius: 12 }}
                contentFit="cover"
              />
              <TouchableOpacity
                onPress={() => setPickedImageUri(null)}
                className="absolute top-2 right-2 bg-black/50 rounded-full p-1"
              >
                <Ionicons name="close" size={16} color="white" />
              </TouchableOpacity>
            </View>
          )}

          {/* Bottom toolbar */}
          <View className="flex-row items-center px-4 py-3 border-t border-gray-100 mt-auto">
            <TouchableOpacity
              onPress={handlePickImage}
              className="flex-row items-center"
            >
              <Ionicons name="image-outline" size={24} color="#4f46e5" />
              <Text className="text-indigo-600 font-medium ml-1">Photo</Text>
            </TouchableOpacity>
            <Text className="ml-auto text-gray-400 text-xs">
              {content.length}/1000
            </Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
