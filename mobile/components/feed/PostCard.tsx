import { useState } from "react";
import {
  Alert,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";

import type { Post } from "@/lib/queries/posts";
import { useDeletePostMutation } from "@/lib/queries/posts";

interface PostCardProps {
  post: Post;
}

function formatTimeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function PostCard({ post }: PostCardProps) {
  const [imgError, setImgError] = useState(false);
  const deleteMutation = useDeletePostMutation();

  const handleDelete = () => {
    Alert.alert("Delete Post", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMutation.mutate(post.id),
      },
    ]);
  };

  const initials = post.author_display_name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <View className="bg-white rounded-2xl mx-4 mb-3 shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <View className="flex-row items-center px-4 pt-4 pb-2">
        {post.author_picture_url ? (
          <ExpoImage
            source={{ uri: post.author_picture_url }}
            className="w-10 h-10 rounded-full bg-gray-200"
            contentFit="cover"
          />
        ) : (
          <View className="w-10 h-10 rounded-full bg-indigo-100 items-center justify-center">
            <Text className="text-indigo-700 font-bold text-sm">{initials}</Text>
          </View>
        )}
        <View className="ml-3 flex-1">
          <Text className="font-semibold text-gray-900 text-sm">
            {post.author_display_name}
          </Text>
          <Text className="text-gray-400 text-xs">
            @{post.author_username} · {formatTimeAgo(post.created_at)}
          </Text>
        </View>
        {post.is_mine && (
          <TouchableOpacity
            onPress={handleDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <Text className="px-4 pb-3 text-gray-800 text-sm leading-5">
        {post.content}
      </Text>

      {/* Image */}
      {post.image_url && !imgError && (
        <Image
          source={{ uri: post.image_url }}
          className="w-full"
          style={{ height: 220 }}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />
      )}
    </View>
  );
}
