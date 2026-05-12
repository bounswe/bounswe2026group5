import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DiscoverFilterModal } from "@/components/discover/DiscoverFilterModal";
import { DiscoverSearchBar } from "@/components/discover/DiscoverSearchBar";
import { MentorCard } from "@/components/discover/MentorCard";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import {
  DEMO_DISCOVER_PROFILES,
  DEMO_DISCOVER_SKILLS,
} from "@/constants/discover-demo";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRefreshControl } from "@/hooks/use-refresh-control";
import {
  fetchDiscoverPopularProfiles,
  fetchDiscoverProfiles,
  fetchDiscoverRecentlyAddedProfiles,
  fetchDiscoverSkills,
} from "@/lib/discover/client";
import { type DiscoverMentorProfile } from "@/lib/discover/types";
import {
  fetchCommunityTags,
  fetchPopularCommunityTags,
  type CommunityTag,
} from "@/lib/queries/communityTags";

const PAGE_SIZE = 8;
type DiscoverFeedMode = "popular" | "recent";
type DiscoverTab = "mentors" | "communities";
type SortMode = "popular" | "recent";
type CommunitySortMode = "all" | "popular" | "recent";

function formatMemberCount(count: number) {
  if (count === 1) {
    return "1 member";
  }
  return `${count} members`;
}

function CommunityResultCard({
  tag,
  onPress,
}: Readonly<{ tag: CommunityTag; onPress: (tag: CommunityTag) => void }>) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(tag)}
      testID={`community-result-${tag.slug}`}
      className="bg-surface-card dark:bg-surface-card-dark p-4 rounded-xl border border-divider dark:border-divider-dark mb-3"
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-base font-bold text-on-surface dark:text-on-surface-dark">
            {tag.name}
          </Text>
          {tag.description.trim() ? (
            <Text className="text-sm text-on-surface-soft dark:text-on-surface-soft-dark mt-1">
              {tag.description}
            </Text>
          ) : null}
        </View>
        <Text className="text-xs font-semibold text-primary dark:text-primary-dim">
          {formatMemberCount(tag.member_count)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function DiscoverSortSheet({
  visible,
  activeTab,
  draftMode,
  onSelect,
  onClear,
  onApply,
  onClose,
}: Readonly<{
  visible: boolean;
  activeTab: DiscoverTab;
  draftMode: SortMode | CommunitySortMode;
  onSelect: (mode: SortMode | CommunitySortMode) => void;
  onClear: () => void;
  onApply: () => void;
  onClose: () => void;
}>) {
  const options: { label: string; value: SortMode | CommunitySortMode }[] =
    activeTab === "communities"
      ? [
          { label: "All Communities", value: "all" },
          { label: "Popular", value: "popular" },
          { label: "Recently Added", value: "recent" },
        ]
      : [
          { label: "Popular", value: "popular" },
          { label: "Recently Added", value: "recent" },
        ];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable
          className="bg-surface-card dark:bg-surface-card-dark rounded-t-3xl p-5 pb-8 max-h-[70%] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] border-t border-divider dark:border-divider-dark"
          onPress={(event) => event.stopPropagation()}
        >
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-bold text-on-surface dark:text-on-surface-dark">
              Sort By
            </Text>
            <TouchableOpacity
              testID="sort-close-button"
              onPress={onClose}
              className="p-2 rounded-full bg-surface dark:bg-surface-dark"
            >
              <Ionicons name="close" size={18} color="#4b5563" />
            </TouchableOpacity>
          </View>

          <View className="gap-2">
            {options.map((option) => {
              const selected = draftMode === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  testID={`sort-option-${option.value}`}
                  activeOpacity={0.9}
                  onPress={() => onSelect(option.value)}
                  className={`flex-row items-center justify-between rounded-xl border px-4 py-3 ${
                    selected
                      ? "border-primary bg-primary/10"
                      : "border-divider dark:border-divider-dark bg-surface-card dark:bg-surface-card-dark"
                  }`}
                >
                  <Text
                    className={`font-semibold ${
                      selected
                        ? "text-primary dark:text-primary-dim"
                        : "text-on-surface dark:text-on-surface-dark"
                    }`}
                  >
                    {option.label}
                  </Text>
                  {selected ? (
                    <Ionicons name="checkmark" size={18} color="#2f7d68" />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          <View className="flex-row gap-2 mt-5">
            <TouchableOpacity
              testID="sort-clear-button"
              onPress={onClear}
              className="flex-1 py-3 rounded-xl border border-divider dark:border-divider-dark items-center"
            >
              <Text className="font-semibold text-on-surface dark:text-on-surface-dark">
                Clear
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="sort-apply-button"
              onPress={onApply}
              className="flex-1 py-3 rounded-xl bg-primary items-center"
            >
              <Text className="font-semibold text-white">Apply</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

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
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [feedMode, setFeedMode] = useState<DiscoverFeedMode>("popular");
  const [draftFeedMode, setDraftFeedMode] = useState<SortMode>("popular");
  const [communitySortMode, setCommunitySortMode] =
    useState<CommunitySortMode>("all");
  const [draftCommunitySortMode, setDraftCommunitySortMode] =
    useState<CommunitySortMode>("all");
  const [activeTab, setActiveTab] = useState<DiscoverTab>("mentors");

  const [profiles, setProfiles] = useState<DiscoverMentorProfile[]>([]);
  const [communityTags, setCommunityTags] = useState<CommunityTag[]>([]);
  const [communityFilterTags, setCommunityFilterTags] = useState<CommunityTag[]>(
    [],
  );
  const [communityTotalCount, setCommunityTotalCount] = useState(0);
  const [skills, setSkills] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [selectedCommunityTags, setSelectedCommunityTags] = useState<Set<string>>(
    new Set(),
  );
  const [selectedDistanceKm, setSelectedDistanceKm] = useState<number | null>(
    null,
  );
  const [draftSelectedSkills, setDraftSelectedSkills] = useState<Set<string>>(
    new Set(),
  );
  const [draftSelectedCommunityTags, setDraftSelectedCommunityTags] = useState<
    Set<string>
  >(new Set());
  const [draftSelectedDistanceKm, setDraftSelectedDistanceKm] = useState<
    number | null
  >(null);

  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [isFilterModalOpen, setFilterModalOpen] = useState(false);
  const [isSortSheetOpen, setSortSheetOpen] = useState(false);

  useEffect(() => {
    if (isSortSheetOpen) {
      if (activeTab === "communities") {
        setDraftCommunitySortMode(communitySortMode);
      } else {
        setDraftFeedMode(feedMode);
      }
    }
  }, [activeTab, communitySortMode, feedMode, isSortSheetOpen]);

  const resetDiscoverFilters = useCallback(() => {
    setSelectedSkills(new Set());
    setSelectedCommunityTags(new Set());
    setSelectedDistanceKm(null);
    setDraftSelectedSkills(new Set());
    setDraftSelectedCommunityTags(new Set());
    setDraftSelectedDistanceKm(null);
    setPage(1);
    setProfiles([]);
    setCommunityTags([]);
    setTotalCount(0);
    setCommunityTotalCount(0);
    setErrorText(null);
    setFilterModalOpen(false);
    setSortSheetOpen(false);
    setRefreshVersion((version) => version + 1);
  }, []);
  const refreshDiscover = useCallback(async () => {
    setPage(1);
    setErrorText(null);
    setRefreshVersion((version) => version + 1);
  }, []);
  const { refreshing, onRefresh } = useRefreshControl(refreshDiscover);

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
  const selectedCommunityTagList = useMemo(
    () => Array.from(selectedCommunityTags),
    [selectedCommunityTags],
  );
  const hasMentorSearchFilters =
    debouncedQuery.length > 0 ||
    selectedSkillList.length > 0 ||
    selectedCommunityTagList.length > 0 ||
    selectedDistanceKm !== null;
  const hasCommunitySearchFilters = debouncedQuery.length > 0;

  useEffect(() => {
    if (activeTab !== "mentors") {
      return;
    }

    let mounted = true;
    setLoadingProfiles(true);
    setErrorText(null);

    let request: Promise<{ count: number; results: DiscoverMentorProfile[] }>;
    if (hasMentorSearchFilters) {
      request = fetchDiscoverProfiles({
        page,
        pageSize: PAGE_SIZE,
        query: debouncedQuery,
        skills: selectedSkillList,
        tags: selectedCommunityTagList,
        ...(selectedDistanceKm !== null
          ? { distanceKm: selectedDistanceKm }
          : {}),
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
        if (hasMentorSearchFilters) {
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
  }, [
    page,
    debouncedQuery,
    selectedSkillList,
    selectedCommunityTagList,
    selectedDistanceKm,
    hasMentorSearchFilters,
    feedMode,
    activeTab,
    refreshVersion,
  ]);

  useEffect(() => {
    if (activeTab !== "communities") {
      return;
    }

    let mounted = true;
    setLoadingProfiles(true);
    setErrorText(null);

    let request: Promise<{ count: number; results: CommunityTag[] }>;
    if (hasCommunitySearchFilters || communitySortMode === "all") {
      request = fetchCommunityTags({
        page,
        pageSize: PAGE_SIZE,
        query: debouncedQuery,
      }).then((payload) => ({
        count: payload.count,
        results: payload.results,
      }));
    } else if (communitySortMode === "popular") {
      request = fetchPopularCommunityTags({ limit: PAGE_SIZE * page }).then(
        (results) => ({
          count: results.length,
          results,
        }),
      );
    } else {
      request = fetchCommunityTags({
        page,
        pageSize: PAGE_SIZE,
      }).then((payload) => ({
        count: payload.count,
        results: [...payload.results].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
      }));
    }

    request
      .then((payload) => {
        if (!mounted) {
          return;
        }

        setCommunityTotalCount(payload.count);
        if (hasCommunitySearchFilters) {
          setCommunityTags((previous) =>
            page === 1 ? payload.results : [...previous, ...payload.results],
          );
          return;
        }

        setCommunityTags(payload.results);
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
  }, [
    activeTab,
    page,
    debouncedQuery,
    hasCommunitySearchFilters,
    communitySortMode,
    refreshVersion,
  ]);

  const hasMore =
    activeTab === "mentors"
      ? hasMentorSearchFilters
        ? profiles.length < totalCount
        : profiles.length >= PAGE_SIZE * page
      : hasCommunitySearchFilters
        ? communityTags.length < communityTotalCount
        : communityTags.length >= PAGE_SIZE * page;
  const showDemoContent =
    activeTab === "mentors" &&
    profiles.length === 0 &&
    !loadingProfiles &&
    !errorText &&
    page === 1 &&
    debouncedQuery.length === 0 &&
    selectedSkillList.length === 0 &&
    selectedCommunityTagList.length === 0 &&
    selectedDistanceKm === null;

  const visibleProfiles = showDemoContent ? DEMO_DISCOVER_PROFILES : profiles;
  const visibleSkills = skills.length > 0 ? skills : DEMO_DISCOVER_SKILLS;

  const switchTab = (nextTab: DiscoverTab) => {
    setActiveTab(nextTab);
    setPage(1);
    setErrorText(null);
  };

  const toggleDraftSkill = (skill: string) => {
    setDraftSelectedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(skill)) {
        next.delete(skill);
      } else {
        next.add(skill);
      }
      return next;
    });
  };

  const toggleDraftCommunityTag = (tagSlug: string) => {
    setDraftSelectedCommunityTags((prev) => {
      const next = new Set(prev);
      if (next.has(tagSlug)) {
        next.delete(tagSlug);
      } else {
        next.add(tagSlug);
      }
      return next;
    });
  };

  const clearDraftFilters = () => {
    setDraftSelectedSkills(new Set());
    setDraftSelectedCommunityTags(new Set());
    setDraftSelectedDistanceKm(null);
  };

  const applyFilters = () => {
    setPage(1);
    setSelectedSkills(new Set(draftSelectedSkills));
    setSelectedCommunityTags(new Set(draftSelectedCommunityTags));
    setSelectedDistanceKm(draftSelectedDistanceKm);
    setFilterModalOpen(false);
  };

  const openFilterModal = () => {
    setDraftSelectedSkills(new Set(selectedSkills));
    setDraftSelectedCommunityTags(new Set(selectedCommunityTags));
    setDraftSelectedDistanceKm(selectedDistanceKm);
    setFilterModalOpen(true);
    if (communityFilterTags.length > 0) {
      return;
    }
    fetchPopularCommunityTags({ limit: 20 })
      .then((tags) => setCommunityFilterTags(tags))
      .catch(() => setCommunityFilterTags([]));
  };

  const handleOpenMentorProfile = (profile: DiscoverMentorProfile) => {
    router.push(`/user/${encodeURIComponent(profile.username)}`);
  };

  const handleOpenCommunity = (tag: CommunityTag) => {
    router.push(`/(tabs)/community/${encodeURIComponent(tag.id)}?from=discover`);
  };

  const selectDraftFeedMode = (mode: SortMode) => {
    setDraftFeedMode(mode);
  };

  const selectDraftSortMode = (mode: SortMode | CommunitySortMode) => {
    if (activeTab === "communities") {
      setDraftCommunitySortMode(mode as CommunitySortMode);
      return;
    }
    selectDraftFeedMode(mode as SortMode);
  };

  const clearFeedMode = () => {
    if (activeTab === "communities") {
      setDraftCommunitySortMode("all");
      return;
    }
    setDraftFeedMode("popular");
  };

  const applyFeedMode = () => {
    setPage(1);
    if (activeTab === "communities") {
      setCommunitySortMode(draftCommunitySortMode);
    } else {
      setFeedMode(draftFeedMode);
    }
    setSortSheetOpen(false);
  };

  let bodyContent: React.ReactNode = null;

  if (loadingProfiles && page === 1) {
    bodyContent = (
      <View testID="loading-state" className="py-10 items-center">
        <ActivityIndicator size="large" color={theme.primary} />
        <Text className="text-on-surface-soft dark:text-on-surface-soft-dark mt-3">
          Loading {activeTab === "mentors" ? "mentors" : "communities"}...
        </Text>
      </View>
    );
  } else if (errorText) {
    bodyContent = (
      <View testID="error-state">
        <ErrorBanner message={errorText} />
      </View>
    );
  } else if (activeTab === "communities") {
    if (communityTags.length === 0) {
      bodyContent = (
        <View testID="community-empty-state" className="py-8">
          <Text className="text-on-surface-soft dark:text-on-surface-soft-dark text-sm">
            No communities found. Try adjusting your search.
          </Text>
        </View>
      );
    } else {
      bodyContent = (
        <>
          {communityTags.map((tag) => (
            <CommunityResultCard
              key={tag.id}
              tag={tag}
              onPress={handleOpenCommunity}
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
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-2xl font-extrabold text-on-surface dark:text-on-surface-dark">
              Discover
            </Text>
            <NotificationBell />
          </View>

          <View className="flex-row items-center gap-2">
            <View className="flex-1">
            <DiscoverSearchBar value={query} onChangeText={setQuery} />
            </View>
            <TouchableOpacity
              testID="sort-button"
              accessibilityLabel="Sort by"
              onPress={() => setSortSheetOpen(true)}
              className={`h-12 w-12 rounded-xl justify-center items-center ${
                (activeTab === "communities" && communitySortMode !== "all") ||
                (activeTab === "mentors" && feedMode !== "popular")
                  ? "bg-primary"
                  : "bg-surface-card dark:bg-surface-card-dark border border-divider dark:border-divider-dark"
              }`}
            >
              <Ionicons
                name="swap-vertical-outline"
                size={18}
                color={
                  (activeTab === "communities" && communitySortMode !== "all") ||
                  (activeTab === "mentors" && feedMode !== "popular")
                    ? "#ffffff"
                    : theme.primary
                }
              />
            </TouchableOpacity>
            <TouchableOpacity
              testID="filter-button"
              onPress={openFilterModal}
              disabled={activeTab !== "mentors"}
              className={`relative h-12 w-12 rounded-xl justify-center items-center ${
                activeTab === "mentors"
                  ? "bg-primary"
                  : "bg-surface-active dark:bg-surface-active-dark"
              }`}
            >
              <Ionicons
                name="options-outline"
                size={17}
                color={activeTab === "mentors" ? "#ffffff" : theme.textMuted}
              />
              {selectedSkills.size +
                selectedCommunityTags.size +
                (selectedDistanceKm !== null ? 1 : 0) >
                0 && (
                <View className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-surface-card dark:bg-surface-card-dark items-center justify-center border border-primary">
                  <Text className="text-[10px] font-bold text-primary dark:text-primary-dim">
                    {selectedSkills.size +
                      selectedCommunityTags.size +
                      (selectedDistanceKm !== null ? 1 : 0)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-2 mt-3">
            <TouchableOpacity
              testID="mentors-tab"
              activeOpacity={0.85}
              onPress={() => switchTab("mentors")}
              className={`flex-1 py-2 rounded-lg border items-center ${activeTab === "mentors" ? "bg-primary border-primary" : "bg-surface-card dark:bg-surface-card-dark border-divider dark:border-divider-dark"}`}
            >
              <Text
                className={`text-xs font-semibold ${activeTab === "mentors" ? "text-white" : "text-on-surface dark:text-on-surface-dark"}`}
              >
                Mentors
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="communities-tab"
              activeOpacity={0.85}
              onPress={() => switchTab("communities")}
              className={`flex-1 py-2 rounded-lg border items-center ${activeTab === "communities" ? "bg-primary border-primary" : "bg-surface-card dark:bg-surface-card-dark border-divider dark:border-divider-dark"}`}
            >
              <Text
                className={`text-xs font-semibold ${activeTab === "communities" ? "text-white" : "text-on-surface dark:text-on-surface-dark"}`}
              >
                Communities
              </Text>
            </TouchableOpacity>

          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {bodyContent}
      </ScrollView>

      <DiscoverFilterModal
        visible={isFilterModalOpen}
        allSkills={visibleSkills}
        communityTags={communityFilterTags}
        selectedSkills={draftSelectedSkills}
        selectedCommunityTags={draftSelectedCommunityTags}
        selectedDistanceKm={draftSelectedDistanceKm}
        onToggleSkill={toggleDraftSkill}
        onToggleCommunityTag={toggleDraftCommunityTag}
        onSelectDistanceKm={setDraftSelectedDistanceKm}
        onClear={clearDraftFilters}
        onApply={applyFilters}
        onClose={() => setFilterModalOpen(false)}
      />

      <DiscoverSortSheet
        visible={isSortSheetOpen}
        activeTab={activeTab}
        draftMode={
          activeTab === "communities" ? draftCommunitySortMode : draftFeedMode
        }
        onSelect={selectDraftSortMode}
        onClear={clearFeedMode}
        onApply={applyFeedMode}
        onClose={() => setSortSheetOpen(false)}
      />

      {loadingSkills && (
        <View className="absolute bottom-24 self-center bg-black/70 rounded-full px-4 py-2">
          <Text className="text-white text-xs">Loading skills...</Text>
        </View>
      )}
    </View>
  );
}
