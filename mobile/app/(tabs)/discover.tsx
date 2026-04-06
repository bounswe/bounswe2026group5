import React, { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { DiscoverFilterModal } from "@/components/discover/DiscoverFilterModal";
import { DiscoverSearchBar } from "@/components/discover/DiscoverSearchBar";
import { MentorCard } from "@/components/discover/MentorCard";
import {
  DEMO_DISCOVER_PROFILES,
  DEMO_DISCOVER_SKILLS,
} from "@/constants/discover-demo";
import {
  fetchDiscoverProfiles,
  fetchDiscoverSkills,
} from "@/lib/discover/client";
import { type DiscoverMentorProfile } from "@/lib/discover/types";

const PAGE_SIZE = 8;

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [profiles, setProfiles] = useState<DiscoverMentorProfile[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());

  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [isFilterModalOpen, setFilterModalOpen] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    let mounted = true;
    setLoadingSkills(true);

    fetchDiscoverSkills()
      .then((list) => {
        if (!mounted) {
          return;
        }
        const sortedSkills = list
          .map((item) => (typeof item === "string" ? item : item.name))
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
        setSkills(sortedSkills);
      })
      .catch(() => {
        if (mounted) {
          setSkills([]);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingSkills(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const selectedSkillList = useMemo(
    () => Array.from(selectedSkills),
    [selectedSkills],
  );

  useEffect(() => {
    let mounted = true;
    setLoadingProfiles(true);
    setErrorText(null);

    fetchDiscoverProfiles({
      page,
      pageSize: PAGE_SIZE,
      query: debouncedQuery,
      skills: selectedSkillList,
    })
      .then((payload) => {
        if (!mounted) {
          return;
        }

        setTotalCount(payload.count);
        setProfiles((previous) =>
          page === 1 ? payload.results : [...previous, ...payload.results],
        );
      })
      .catch((error) => {
        if (mounted) {
          setErrorText(
            error instanceof Error
              ? error.message
              : "Could not load discovery results.",
          );
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingProfiles(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [page, debouncedQuery, selectedSkillList]);

  const hasMore = profiles.length < totalCount;
  const showDemoContent =
    profiles.length === 0 &&
    !loadingProfiles &&
    !errorText &&
    page === 1 &&
    debouncedQuery.length === 0 &&
    selectedSkillList.length === 0;

  const visibleProfiles = showDemoContent ? DEMO_DISCOVER_PROFILES : profiles;
  const visibleSkills = skills.length > 0 ? skills : DEMO_DISCOVER_SKILLS;

  const toggleSkill = (skill: string) => {
    setPage(1);
    setSelectedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(skill)) {
        next.delete(skill);
      } else {
        next.add(skill);
      }
      return next;
    });
  };

  const clearSkills = () => {
    setPage(1);
    setSelectedSkills(new Set());
  };

  const handleOpenMentorProfile = (profile: DiscoverMentorProfile) => {
    router.push(`/mentor/${encodeURIComponent(profile.username)}`);
  };

  let bodyContent: React.ReactNode = null;

  if (loadingProfiles && page === 1) {
    bodyContent = (
      <View className="py-10 items-center">
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text className="text-gray-500 mt-3">Loading mentors...</Text>
      </View>
    );
  } else if (errorText) {
    bodyContent = (
      <View className="bg-red-50 border border-red-200 rounded-xl p-4">
        <Text className="text-red-700 font-semibold">{errorText}</Text>
      </View>
    );
  } else if (profiles.length === 0) {
    bodyContent = (
      <View>
        <View className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 mb-3">
          <Text className="text-indigo-700 text-xs font-semibold uppercase tracking-wide">
            Demo preview data
          </Text>
          <Text className="text-indigo-700/80 text-sm mt-1">
            Temporary mentors are shown here until backend data is seeded.
          </Text>
        </View>
        {visibleProfiles.map((profile) => (
          <MentorCard
            key={profile.id}
            profile={profile}
            onPress={handleOpenMentorProfile}
          />
        ))}
      </View>
    );
  } else {
    bodyContent = (
      <>
        {visibleProfiles.map((profile) => (
          <MentorCard
            key={profile.id}
            profile={profile}
            onPress={handleOpenMentorProfile}
          />
        ))}

        {hasMore && (
          <TouchableOpacity
            activeOpacity={1.0}
            onPress={() => setPage((prev) => prev + 1)}
            disabled={loadingProfiles}
            className="bg-indigo-600 py-3 rounded-xl items-center mt-2"
          >
            <Text className="text-white font-semibold">
              {loadingProfiles ? "Loading..." : "Load More"}
            </Text>
          </TouchableOpacity>
        )}
      </>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View
        className="bg-white z-10 shadow-sm border-b border-gray-100"
        style={{ paddingTop: insets.top }}
      >
        <View className="px-4 pb-3 pt-2">
          <Text className="text-2xl font-extrabold text-gray-900 mb-3">
            Discover
          </Text>

          <View className="flex-row items-center gap-2">
            <View className="flex-1">
              <DiscoverSearchBar value={query} onChangeText={setQuery} />
            </View>
            <TouchableOpacity
              onPress={() => setFilterModalOpen(true)}
              className="relative h-12 w-12 bg-indigo-600 rounded-xl justify-center items-center"
            >
              <Ionicons name="options-outline" size={17} color="#ffffff" />
              {selectedSkills.size > 0 && (
                <View className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-white items-center justify-center border border-indigo-600">
                  <Text className="text-[10px] font-bold text-indigo-700">
                    {selectedSkills.size}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
      >
        {bodyContent}
      </ScrollView>

      <DiscoverFilterModal
        visible={isFilterModalOpen}
        allSkills={visibleSkills}
        selectedSkills={selectedSkills}
        onToggleSkill={toggleSkill}
        onClear={clearSkills}
        onClose={() => setFilterModalOpen(false)}
      />

      {loadingSkills && (
        <View className="absolute bottom-24 self-center bg-black/70 rounded-full px-4 py-2">
          <Text className="text-white text-xs">Loading skills...</Text>
        </View>
      )}
    </View>
  );
}
