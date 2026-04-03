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

import { DiscoverFilterModal } from "@/components/discover/DiscoverFilterModal";
import { DiscoverSearchBar } from "@/components/discover/DiscoverSearchBar";
import { MentorCard } from "@/components/discover/MentorCard";
import {
  fetchDiscoverProfiles,
  fetchDiscoverSkills,
} from "@/lib/discover/client";
import { type DiscoverMentorProfile } from "@/lib/discover/types";

const PAGE_SIZE = 8;

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();

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
          .map((item) => item.name)
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
      <View className="bg-white border border-gray-200 rounded-xl p-5">
        <Text className="text-gray-900 font-semibold text-base">
          No mentors found.
        </Text>
        <Text className="text-gray-500 mt-1">
          Try a different search term or clear filters.
        </Text>
      </View>
    );
  } else {
    bodyContent = (
      <>
        {profiles.map((profile) => (
          <MentorCard key={profile.id} profile={profile} />
        ))}

        {hasMore && (
          <TouchableOpacity
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
              className="h-11 px-3 bg-indigo-600 rounded-xl justify-center items-center flex-row"
            >
              <Ionicons name="options-outline" size={17} color="#ffffff" />
              <Text className="text-white font-semibold ml-1">
                {selectedSkills.size > 0 ? `(${selectedSkills.size})` : ""}
              </Text>
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
        allSkills={skills}
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
