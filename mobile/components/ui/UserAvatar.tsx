import { Image, Text, View } from "react-native";

import { getAbsoluteImageUrl } from "@/lib/api/config";

export type AvatarShape = "circle" | "rounded";
export type AvatarSize = "sm" | "md" | "lg" | "xl";

interface UserAvatarProps {
  imageUrl?: string | null;
  name: string;
  shape?: AvatarShape;
  size?: AvatarSize;
  testIDPrefix?: string;
}

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: "h-12 w-12",
  md: "h-15 w-15",
  lg: "h-[72px] w-[72px]",
  xl: "h-20 w-20",
};

const TEXT_CLASSES: Record<AvatarSize, string> = {
  sm: "text-base",
  md: "text-[22px]",
  lg: "text-[26px]",
  xl: "text-[22px]",
};

function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();

  return initials || "?";
}

export function UserAvatar({
  imageUrl,
  name,
  shape = "circle",
  size = "sm",
  testIDPrefix = "user-avatar",
}: Readonly<UserAvatarProps>) {
  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-lg";
  const sizeClass = SIZE_CLASSES[size];

  if (imageUrl?.trim()) {
    return (
      <Image
        testID={`${testIDPrefix}-image`}
        source={{ uri: getAbsoluteImageUrl(imageUrl) }}
        className={`${sizeClass} ${shapeClass} bg-surface-active dark:bg-surface-active-dark`}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      testID={`${testIDPrefix}-fallback`}
      className={`${sizeClass} ${shapeClass} bg-surface-active dark:bg-surface-active-dark items-center justify-center`}
    >
      <Text
        className={`${TEXT_CLASSES[size]} font-bold text-primary dark:text-primary-dim`}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}
