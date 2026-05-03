import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

type Role = "mentor" | "mentee";

interface RegistrationProfileSetupSheetProps {
  visible: boolean;
  initialRole?: Role;
  username: string;
  prefillDisplayName?: string;
  skills: string[];
  isLoadingSkills: boolean;
  isSubmitting: boolean;
  submitError: string;
  usernameError?: string;
  onUsernameChange?: () => void;
  onClose: () => void;
  onSubmit: (values: {
    role: Role;
    username: string;
    displayName: string;
    bio: string;
    selectedSkills: string[];
  }) => void;
}

function validateUsername(value: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "Username is required.";
  }

  if (!/^[a-zA-Z0-9_]+$/.test(trimmedValue)) {
    return "Use only letters, numbers, and underscores.";
  }

  return "";
}

function buildDisplayNameSuggestion(username: string): string {
  if (!username) {
    return "";
  }

  return username
    .replaceAll(".", " ")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatUsername(username: string): string {
  if (!username) {
    return "Assigned during registration";
  }

  return username.startsWith("@") ? username : `@${username}`;
}

export function RegistrationProfileSetupSheet({
  visible,
  initialRole,
  username,
  prefillDisplayName,
  skills,
  isLoadingSkills,
  isSubmitting,
  submitError,
  usernameError,
  onUsernameChange,
  onClose,
  onSubmit,
}: Readonly<RegistrationProfileSetupSheetProps>) {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  const [role, setRole] = useState<Role>(initialRole ?? "mentor");

  const roleCopy = role === "mentor" ? "mentor" : "mentee";
  const skillLabel = role === "mentor" ? "Teach skills" : "Learn skills";
  const skillHint =
    role === "mentor"
      ? "Pick the topics you can teach."
      : "Pick the topics you want to learn.";

  const [displayName, setDisplayName] = useState("");
  const [editableUsername, setEditableUsername] = useState("");
  const [bio, setBio] = useState("");
  const [search, setSearch] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [localUsernameError, setLocalUsernameError] = useState("");
  const [displayNameError, setDisplayNameError] = useState("");
  const [skillsError, setSkillsError] = useState("");

  const suggestedDisplayName = useMemo(
    () => buildDisplayNameSuggestion(username),
    [username],
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    setRole(initialRole ?? "mentor");
    setEditableUsername(username);
    const nextPrefill = prefillDisplayName?.trim() ?? "";
    setDisplayName(nextPrefill || suggestedDisplayName);
    setBio("");
    setSearch("");
    setSelectedSkills([]);
    setLocalUsernameError("");
    setDisplayNameError("");
    setSkillsError("");
  }, [
    username,
    visible,
    suggestedDisplayName,
    prefillDisplayName,
    initialRole,
  ]);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((current) =>
      current.includes(skill)
        ? current.filter((item) => item !== skill)
        : [...current, skill],
    );
    setSkillsError("");
  };

  const filteredSkills = skills.filter((skill) => {
    const matchesSearch = skill.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && !selectedSkills.includes(skill);
  });

  let skillsListContent: React.ReactNode;
  if (isLoadingSkills) {
    skillsListContent = (
      <View className="items-center justify-center py-8">
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  } else if (filteredSkills.length === 0) {
    skillsListContent = (
      <View className="items-center justify-center py-8 px-4">
        <Text className="text-sm text-on-surface-soft dark:text-on-surface-soft-dark text-center">
          No matching skills found.
        </Text>
      </View>
    );
  } else {
    skillsListContent = (
      <>
        {filteredSkills.map((skill, index) => {
          const isLastItem = index + 1 === filteredSkills.length;

          return (
            <TouchableOpacity
              key={skill}
              onPress={() => toggleSkill(skill)}
              className={`flex-row items-center justify-between px-4 py-4 ${isLastItem ? "" : "border-b border-divider dark:border-divider-dark"}`}
              accessibilityRole="button"
              accessibilityLabel={`Add ${skill}`}
            >
              <Text className="text-base font-medium text-on-surface dark:text-on-surface-dark">
                {skill}
              </Text>
              <Ionicons
                name="add-circle-outline"
                size={20}
                color={theme.textMuted}
              />
            </TouchableOpacity>
          );
        })}
      </>
    );
  }

  const handleSubmit = () => {
    const trimmedUsername = editableUsername.trim();
    const trimmedDisplayName = displayName.trim();
    const trimmedBio = bio.trim();

    const nextUsernameError = validateUsername(trimmedUsername);
    const nextDisplayNameError = trimmedDisplayName
      ? ""
      : "Display name is required.";
    const nextSkillsError =
      selectedSkills.length === 0 ? "Please select at least one skill." : "";

    setLocalUsernameError(nextUsernameError);
    setDisplayNameError(nextDisplayNameError);
    setSkillsError(nextSkillsError);

    if (nextUsernameError || nextDisplayNameError || nextSkillsError) {
      return;
    }

    onSubmit({
      role,
      username: trimmedUsername,
      displayName: trimmedDisplayName,
      bio: trimmedBio,
      selectedSkills,
    });
  };

  if (!visible) {
    return null;
  }

  return (
    <SafeAreaView className="absolute inset-0 z-50 flex-1 bg-surface dark:bg-surface-dark">
      <View className="flex-1 bg-surface dark:bg-surface-dark">
        <View className="flex-row items-start justify-between px-5 pt-4 pb-3 border-b border-divider/50 dark:border-divider-dark/50">
          <View className="flex-1 pr-4">
            <Text className="text-2xl font-bold mb-1 text-on-surface dark:text-on-surface-dark">
              Complete profile setup
            </Text>
            <Text className="text-sm text-on-surface-soft dark:text-on-surface-soft-dark">
              Finish your {roleCopy} profile before entering the app.
            </Text>
          </View>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Close profile setup"
          >
            <Ionicons name="close" size={24} color={theme.textSoft} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 40,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {submitError ? (
            <View className="mb-4">
              <ErrorBanner message={submitError} />
            </View>
          ) : null}

          <View className="gap-5">
            {/* Role Segmented Control */}
            <View className="gap-1.5">
              <Text className="text-xs font-bold tracking-widest uppercase ml-1 text-on-surface-soft dark:text-on-surface-soft-dark">
                My Role
              </Text>
              <View className="flex-row items-center p-1.5 rounded-xl h-14 bg-surface-input dark:bg-surface-input-dark">
                <Pressable
                  onPress={() => setRole("mentor")}
                  className="flex-1 h-full rounded-lg items-center justify-center"
                  style={
                    role === "mentor"
                      ? { backgroundColor: theme.cardBackground }
                      : undefined
                  }
                  accessibilityRole="button"
                  accessibilityState={{ selected: role === "mentor" }}
                  accessibilityLabel="I want to be a Mentor"
                >
                  <Text
                    className="text-sm font-semibold"
                    style={{
                      color: role === "mentor" ? theme.primary : theme.textSoft,
                    }}
                  >
                    Mentor
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setRole("mentee")}
                  className="flex-1 h-full rounded-lg items-center justify-center"
                  style={
                    role === "mentee"
                      ? { backgroundColor: theme.cardBackground }
                      : undefined
                  }
                  accessibilityRole="button"
                  accessibilityState={{ selected: role === "mentee" }}
                  accessibilityLabel="I want to be a Mentee"
                >
                  <Text
                    className="text-sm font-semibold"
                    style={{
                      color: role === "mentee" ? theme.primary : theme.textSoft,
                    }}
                  >
                    Mentee
                  </Text>
                </Pressable>
              </View>
            </View>

            <View className="gap-1.5">
              <Text className="text-xs font-bold tracking-widest uppercase ml-1 text-on-surface-soft dark:text-on-surface-soft-dark">
                Username
              </Text>
              <View className="flex-row items-center h-14 rounded-xl px-4 gap-2 bg-surface-input dark:bg-surface-input-dark">
                <Ionicons name="at-outline" size={18} color={theme.textMuted} />
                <TextInput
                  className="flex-1 text-base font-medium text-on-surface dark:text-on-surface-dark"
                  placeholder="your_username"
                  placeholderTextColor={theme.textMuted}
                  value={editableUsername}
                  onChangeText={(text) => {
                    setEditableUsername(text);
                    onUsernameChange?.();
                    if (localUsernameError) {
                      setLocalUsernameError(validateUsername(text));
                    }
                  }}
                  onBlur={() =>
                    setLocalUsernameError(validateUsername(editableUsername))
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  accessibilityLabel="Username"
                />
              </View>
              <Text
                className={`text-xs ml-1 ${localUsernameError || usernameError ? "text-red-500" : "text-on-surface-soft dark:text-on-surface-soft-dark"}`}
              >
                {localUsernameError ||
                  usernameError ||
                  `This will be your username: ${formatUsername(
                    editableUsername || username,
                  )}`}
              </Text>
              {usernameError ? (
                <Text className="text-xs text-red-500 mt-1">
                  {usernameError}
                </Text>
              ) : null}
            </View>

            <View className="gap-1.5">
              <Text className="text-xs font-bold tracking-widest uppercase ml-1 text-on-surface-soft dark:text-on-surface-soft-dark">
                Display Name
              </Text>
              <View className="flex-row items-center h-14 rounded-xl px-4 gap-2 bg-surface-input dark:bg-surface-input-dark">
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={theme.textMuted}
                />
                <TextInput
                  className="flex-1 text-base font-medium text-on-surface dark:text-on-surface-dark"
                  placeholder={suggestedDisplayName || "Your display name"}
                  placeholderTextColor={theme.textMuted}
                  value={displayName}
                  onChangeText={(text) => {
                    setDisplayName(text);
                    if (displayNameError) {
                      setDisplayNameError("");
                    }
                  }}
                  autoCapitalize="words"
                  returnKeyType="next"
                  accessibilityLabel="Display Name"
                />
              </View>
              {displayNameError ? (
                <Text className="text-xs text-red-500 ml-1">
                  {displayNameError}
                </Text>
              ) : null}
            </View>

            <View className="gap-1.5">
              <Text className="text-xs font-bold tracking-widest uppercase ml-1 text-on-surface-soft dark:text-on-surface-soft-dark">
                Bio
              </Text>
              <View className="rounded-xl bg-surface-input dark:bg-surface-input-dark px-4 py-3">
                <TextInput
                  className="min-h-[112px] text-base font-medium text-on-surface dark:text-on-surface-dark"
                  placeholder="Tell people a bit about yourself..."
                  placeholderTextColor={theme.textMuted}
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  textAlignVertical="top"
                  maxLength={500}
                  accessibilityLabel="Bio"
                />
              </View>
              <Text className="text-xs ml-1 text-on-surface-soft dark:text-on-surface-soft-dark">
                {bio.length}/500
              </Text>
            </View>

            <View className="gap-1.5 pt-1">
              <Text className="text-xs font-bold tracking-widest uppercase ml-1 text-on-surface-soft dark:text-on-surface-soft-dark">
                {skillLabel}
              </Text>
              <Text className="text-sm ml-1 text-on-surface-soft dark:text-on-surface-soft-dark">
                {skillHint}
              </Text>

              <View className="flex-row items-center h-14 rounded-xl px-4 gap-2 bg-surface-input dark:bg-surface-input-dark">
                <Ionicons
                  name="search-outline"
                  size={18}
                  color={theme.textMuted}
                />
                <TextInput
                  className="flex-1 text-base font-medium text-on-surface dark:text-on-surface-dark"
                  placeholder="Search skills"
                  placeholderTextColor={theme.textMuted}
                  value={search}
                  onChangeText={setSearch}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Search skills"
                />
              </View>

              {selectedSkills.length > 0 ? (
                <View className="flex-row flex-wrap gap-2 pt-1">
                  {selectedSkills.map((skill) => (
                    <TouchableOpacity
                      key={skill}
                      onPress={() => toggleSkill(skill)}
                      className="rounded-full px-3 py-2"
                      style={{ backgroundColor: theme.surfaceActive }}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${skill}`}
                    >
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: theme.primary }}
                      >
                        {skill}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              <View className="rounded-2xl border border-divider dark:border-divider-dark bg-surface-card dark:bg-surface-card-dark overflow-hidden">
                {skillsListContent}
              </View>

              {skillsError ? (
                <Text className="text-xs text-red-500 ml-1">{skillsError}</Text>
              ) : null}
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.88}
              className="mt-2 w-full h-14 rounded-xl items-center justify-center flex-row gap-2 bg-primary dark:bg-primary-dim"
              style={isSubmitting ? { opacity: 0.6 } : undefined}
              accessibilityRole="button"
              accessibilityLabel="Save profile setup"
            >
              <Text className="text-white font-bold text-base">
                {isSubmitting ? "Saving profile…" : "Save and continue"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
