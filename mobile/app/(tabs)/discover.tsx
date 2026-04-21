import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DiscoverFilterModal } from "@/components/discover/DiscoverFilterModal";
import { DiscoverSearchBar } from "@/components/discover/DiscoverSearchBar";
import { MentorCard } from "@/components/discover/MentorCard";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import {
  DEMO_DISCOVER_PROFILES,
  DEMO_DISCOVER_SKILLS,
} from "@/constants/discover-demo";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  fetchDiscoverPopularProfiles,
  fetchDiscoverProfiles,
  fetchDiscoverRecentlyAddedProfiles,
  fetchDiscoverSkills,
} from "@/lib/discover/client";
import { type DiscoverMentorProfile } from "@/lib/discover/types";

const PAGE_SIZE = 8;
type DiscoverFeedMode = "popular" | "recent";

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [feedMode, setFeedMode] = useState<DiscoverFeedMode>("popular");

  const [profiles, setProfiles] = useState<DiscoverMentorProfile[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());

  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [isFilterModalOpen, setFilterModalOpen] = useState(false);

  const resetDiscoverFilters = useCallback(() => {
    setSelectedSkills(new Set());
    setPage(1);
    setProfiles([]);
    setTotalCount(0);
    setErrorText(null);
    setFilterModalOpen(false);
  }, []);

  useEffect(() => {
    const unsubscribe = (navigation as any).addListener("tabPress", () => {
      resetDiscoverFilters();
    });

    return unsubscribe;
  }, [navigation, resetDiscoverFilters]);

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
  const hasSearchFilters =
    debouncedQuery.length > 0 || selectedSkillList.length > 0;

  useEffect(() => {
    let mounted = true;
    setLoadingProfiles(true);
    setErrorText(null);

    let request: Promise<{ count: number; results: DiscoverMentorProfile[] }>;
    if (hasSearchFilters) {
      request = fetchDiscoverProfiles({
        page,
        pageSize: PAGE_SIZE,
        query: debouncedQuery,
        skills: selectedSkillList,
      }).then((payload) => ({
        count: payload.count,
        results: payload.results,
      }));
    } else if (feedMode === "popular") {
      request = fetchDiscoverPopularProfiles(PAGE_SIZE * page).then(
        (results) => ({
          count: results.length,
          results,
        }),
      );
    } else {
      request = fetchDiscoverRecentlyAddedProfiles(PAGE_SIZE * page).then(
        (results) => ({
          count: results.length,
          results,
        }),
      );
    }

    request
      .then((payload) => {
        if (!mounted) {
          return;
        }

        setTotalCount(payload.count);
        if (hasSearchFilters) {
          setProfiles((previous) =>
            page === 1 ? payload.results : [...previous, ...payload.results],
          );
          return;
        }

        setProfiles(payload.results);
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
  }, [page, debouncedQuery, selectedSkillList, hasSearchFilters, feedMode]);

  const hasMore = hasSearchFilters
    ? profiles.length < totalCount
    : profiles.length >= PAGE_SIZE * page;
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
    router.push(`/user/${encodeURIComponent(profile.username)}`);
  };

  let bodyContent: React.ReactNode = null;

  if (loadingProfiles && page === 1) {
    bodyContent = (
      <View testID="loading-state" className="py-10 items-center">
        <ActivityIndicator size="large" color={theme.primary} />
        <Text className="text-on-surface-soft dark:text-on-surface-soft-dark mt-3">
          Loading mentors...
        </Text>
      </View>
    );
  } else if (errorText) {
    bodyContent = (
      <ErrorBanner message={errorText} />
    );
  } else if (profiles.length === 0) {
    bodyContent = (
      <View testID="empty-state">
        <View className="bg-surface-active dark:bg-surface-active-dark border border-divider dark:border-divider-dark rounded-xl p-3 mb-3">
          <Text className="text-on-surface-soft dark:text-on-surface-soft-dark text-sm mt-1">
            No matches found. Try adjusting your search or filter criteria to
            find more mentors.
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
            testID="load-more-button"
            activeOpacity={1}
            onPress={() => setPage((prev) => prev + 1)}
            disabled={loadingProfiles}
            className="bg-primary py-3 rounded-xl items-center mt-2"
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
    <View className="flex-1 bg-surface dark:bg-surface-dark">
      <View
        className="bg-surface-card dark:bg-surface-card-dark z-10 shadow-sm border-b border-divider dark:border-divider-dark"
        style={{ paddingTop: insets.top }}
      >
        <View className="px-4 pb-3 pt-2">
          <Text className="text-2xl font-extrabold text-on-surface dark:text-on-surface-dark mb-3">
            Discover
          </Text>

          <View className="flex-row items-center gap-2">
            <View className="flex-1">
              <DiscoverSearchBar value={query} onChangeText={setQuery} />
            </View>
            <TouchableOpacity
              onPress={() => setFilterModalOpen(true)}
              className="relative h-12 w-12 bg-primary rounded-xl justify-center items-center"
            >
              <Ionicons name="options-outline" size={17} color="#ffffff" />
              {selectedSkills.size > 0 && (
                <View className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-surface-card dark:bg-surface-card-dark items-center justify-center border border-primary">
                  <Text className="text-[10px] font-bold text-primary dark:text-primary-dim">
                    {selectedSkills.size}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-2 mt-3">
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={hasSearchFilters}
              onPress={() => {
                setPage(1);
                setFeedMode("popular");
              }}
              className={`px-3 py-2 rounded-lg border ${feedMode === "popular" ? "bg-primary border-primary" : "bg-surface-card dark:bg-surface-card-dark border-divider dark:border-divider-dark"}`}
            >
              <Text
                className={`text-xs font-semibold ${feedMode === "popular" ? "text-white" : "text-on-surface dark:text-on-surface-dark"}`}
              >
                Popular
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={hasSearchFilters}
              onPress={() => {
                setPage(1);
                setFeedMode("recent");
              }}
              className={`px-3 py-2 rounded-lg border ${feedMode === "recent" ? "bg-primary border-primary" : "bg-surface-card dark:bg-surface-card-dark border-divider dark:border-divider-dark"}`}
            >
              <Text
                className={`text-xs font-semibold ${feedMode === "recent" ? "text-white" : "text-on-surface dark:text-on-surface-dark"}`}
              >
                Recently Added
              </Text>
            </TouchableOpacity>

            {hasSearchFilters && (
              <View className="px-3 py-2 rounded-lg border bg-surface-active dark:bg-surface-active-dark border-divider dark:border-divider-dark">
                <Text className="text-xs font-semibold text-on-surface-soft dark:text-on-surface-soft-dark">
                  Search Mode
                </Text>
              </View>
            )}
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
