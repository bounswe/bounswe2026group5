import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

const renderHomeIcon = ({ color }: { color: string }) => (
  <IconSymbol size={28} name="house.fill" color={color} />
);

const renderDiscoverIcon = ({ color }: { color: string }) => (
  <IconSymbol size={28} name="magnifyingglass" color={color} />
);

const renderCommunityIcon = ({ color }: { color: string }) => (
  <IconSymbol
    size={30}
    name="person.3.fill"
    color={color}
  />
);

const renderConnectionsIcon = ({ color }: { color: string }) => (
  <IconSymbol
    size={28}
    name="point.3.connected.trianglepath.dotted"
    color={color}
  />
);

const renderProfileIcon = ({ color }: { color: string }) => (
  <IconSymbol size={28} name="person.fill" color={color} />
);

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: renderHomeIcon,
        }}
      />

      <Tabs.Screen
        name="connections"
        options={{
          title: "Connections",
          tabBarIcon: renderConnectionsIcon,
        }}
      />

      <Tabs.Screen
        name="connections/timeline/[matchId]"
        options={{
          href: null,
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="schedule"
        options={{
          href: null,
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarIcon: renderCommunityIcon,
        }}
      />

      <Tabs.Screen
        name="community/[tagId]/index"
        options={{
          href: null,
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="community/[tagId]/members"
        options={{
          href: null,
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: renderDiscoverIcon,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarIcon: renderProfileIcon,
        }}
      />

      <Tabs.Screen
        name="user/[username]"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
