/**
 * SubjectExpertisePicker
 *
 * A self-contained form field that:
 *   - Shows a tappable trigger row (like every other field on the register screen).
 *   - Opens a bottom-sheet Modal with a vertically scrollable, alphabetically sorted
 *     list of subjects rendered with FlatList for optimal frame performance.
 *   - Reflects selected subjects as removable chips beneath the trigger when the
 *     modal is closed.
 *
 * Styling convention
 *   className  — all static design tokens (layout, spacing, border-radius, fixed colors)
 *   style={{}} — only values that depend on state, props, or runtime calculations
 *
 * Color tokens used
 *   bg-surface-active / dark:bg-surface-active-dark  — selected row background
 *   bg-surface-input  / dark:bg-surface-input-dark   — unselected row background
 *   bg-primary        / dark:bg-primary-dim          — checkmark circle fill
 *   text-primary      / dark:text-primary-dim        — selected row text & chip text
 *
 * Performance
 *   - ALL_SUBJECTS is a module-level constant (never recreated).
 *   - selectedSet (Set<string>) is memoised for O(1) membership checks.
 *   - SubjectItem and SelectedChip are wrapped in React.memo; their press handlers
 *     use useCallback to prevent identity changes that would bust memo equality.
 *   - FlatList receives getItemLayout so the virtualisation engine never has to
 *     measure item height.
 *   - extraData={selectedSet} tells FlatList to re-render rows whose selection
 *     state changed without rebuilding the entire list.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItemInfo,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

// ─── Layout constants ─────────────────────────────────────────────────────────

/** Height of every subject row in the modal list (px). */
const ITEM_H = 60;
/** Vertical gap between rows — matches the `mb-2` (8 px) Tailwind utility. */
const ITEM_GAP = 8;
/** Combined stride used by getItemLayout for O(1) offset calculation. */
const ITEM_STRIDE = ITEM_H + ITEM_GAP;

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SubjectItemProps {
  subject: string;
  isSelected: boolean;
  onToggle: (subject: string) => void;
  theme: (typeof Colors)['light'];
}

/**
 * Single row in the modal FlatList.
 * Memoised — only re-renders when `isSelected` flips for this specific subject.
 */
const SubjectItem = React.memo(function SubjectItem({
  subject,
  isSelected,
  onToggle,
  theme,
}: SubjectItemProps) {
  const handlePress = useCallback(() => onToggle(subject), [subject, onToggle]);

  return (
    <Pressable
      onPress={handlePress}
      // Static: fixed height, margin, border-radius
      className="mx-4 mb-2 rounded-2xl"
      style={({ pressed }) => ({
        // Dynamic: pressed feedback + selection-driven background
        opacity: pressed ? 0.7 : 1,
        height: ITEM_H,
        backgroundColor: isSelected ? theme.surfaceActive : theme.inputBackground,
      })}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      accessibilityLabel={subject}
    >
      {/* Inner View owns the row layout — keeps flexDirection:'row' off the
          Pressable style callback to avoid NativeWind v4 layout interference. */}
      <View className="flex-1 flex-row items-center px-4 h-full">

        {/* Subject label */}
        <Text
          className="flex-1 text-base"
          style={{
            // Dynamic: weight and color flip on selection
            fontWeight: isSelected ? '600' : '400',
            color: isSelected ? theme.primary : theme.textPrimary,
          }}
        >
          {subject}
        </Text>

        {/* Circular checkbox — right side, small gap from text */}
        <View
          className="w-6 h-6 rounded-full items-center justify-center ml-3"
          style={{
            // Dynamic: fill and border depend on selection state
            backgroundColor: isSelected ? theme.primary : 'transparent',
            borderWidth: isSelected ? 0 : 1.5,
            borderColor: theme.divider,
          }}
        >
          {isSelected && (
            <Ionicons
              name="checkmark"
              size={14}
              color="white"
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          )}
        </View>
      </View>
    </Pressable>
  );
});

// ─────────────────────────────────────────────────────────────────────────────

interface SelectedChipProps {
  label: string;
  onRemove: (label: string) => void;
  theme: (typeof Colors)['light'];
}

/**
 * Chip rendered on the register screen for each selected subject.
 * Tapping it deselects the subject immediately.
 */
const SelectedChip = React.memo(function SelectedChip({
  label,
  onRemove,
  theme,
}: SelectedChipProps) {
  const handlePress = useCallback(() => onRemove(label), [label, onRemove]);

  return (
    <Pressable
      onPress={handlePress}
      // Static: layout, spacing, shape — no border
      className="flex-row items-center gap-1.5 pl-3 pr-[9px] py-[7px] rounded-full"
      style={({ pressed }) => ({
        // Dynamic: pressed feedback + theme-driven background
        opacity: pressed ? 0.75 : 1,
        backgroundColor: theme.surfaceActive,
      })}
      accessibilityRole="button"
      accessibilityLabel={`Remove ${label}`}
      accessibilityHint="Double-tap to deselect this subject"
    >
      <Text
        // Static: typography, spacing, shape, overflow
        className="text-[13px] font-semibold px-2.5 py-1.5 rounded-full overflow-hidden"
        style={{
          // Dynamic: theme-driven foreground and background
          color: theme.cardBackground,
          backgroundColor: theme.primary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
});

// ─── Main component ───────────────────────────────────────────────────────────

export interface SubjectExpertisePickerProps {
  /** Currently selected subjects (controlled by parent). */
  selected: string[];
  /** Called with the new selection array on every toggle. */
  onChange: (selected: string[]) => void;
  /** Drives the contextual subtitle text shown inside the modal. */
  role: 'mentor' | 'mentee';
  /** Skills list fetched from the API. Shows a loading indicator while undefined. */
  skills?: string[];
  /** Whether the skills list is still loading from the API. */
  isLoadingSkills?: boolean;
}

/**
 * Subject expertise picker for the registration form.
 * Renders a trigger field, a removable-chip row, and a bottom-sheet Modal.
 */
export function SubjectExpertisePicker({
  selected,
  onChange,
  role,
  skills = [],
  isLoadingSkills = false,
}: Readonly<SubjectExpertisePickerProps>) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [modalVisible, setModalVisible] = useState(false);

  // O(1) membership check — recalculated only when selected array reference changes.
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const selectionCount = selected.length;
  const totalCount = skills.length;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleToggle = useCallback(
    (subject: string) => {
      if (selectedSet.has(subject)) {
        onChange(selected.filter((s) => s !== subject));
      } else {
        onChange([...selected, subject]);
      }
    },
    [selected, selectedSet, onChange],
  );

  const handleRemoveChip = useCallback(
    (subject: string) => {
      onChange(selected.filter((s) => s !== subject));
    },
    [selected, onChange],
  );

  const openModal = useCallback(() => setModalVisible(true), []);
  const closeModal = useCallback(() => setModalVisible(false), []);

  // ── FlatList helpers ───────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<string>) => (
      <SubjectItem
        subject={item}
        isSelected={selectedSet.has(item)}
        onToggle={handleToggle}
        theme={theme}
      />
    ),
    [selectedSet, handleToggle, theme],
  );

  const keyExtractor = useCallback((item: string) => item, []);

  const getItemLayout = useCallback(
    (_data: ArrayLike<string> | null | undefined, index: number) => ({
      length: ITEM_H,
      offset: ITEM_STRIDE * index,
      index,
    }),
    [],
  );

  // ── Derived labels ─────────────────────────────────────────────────────────

  let triggerLabel = `${selectionCount} subjects selected`;
  if (selectionCount === 0) triggerLabel = 'Select subjects';
  else if (selectionCount === 1) triggerLabel = '1 subject selected';

  const subjectWord = selectionCount === 1 ? 'subject' : 'subjects';
  const doneBtnA11yLabel =
    selectionCount === 0
      ? 'Done, no subjects selected'
      : `Done, ${selectionCount} ${subjectWord} selected`;

  const modalSubtitle =
    role === 'mentor'
      ? 'Pick the subjects you feel confident mentoring.'
      : 'Pick the subjects you want to learn about.';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View className="gap-3">

      {/* ── Trigger field ── */}
      <Pressable
        onPress={openModal}
        // Static: layout, height, shape, fill
        className="flex-row items-center justify-between h-14 rounded-xl px-4 bg-surface-input dark:bg-surface-input-dark"
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
        accessibilityRole="button"
        accessibilityLabel={
          selectionCount === 0
            ? 'Select subject expertise. No subjects selected.'
            : `Subject expertise. ${triggerLabel}. Tap to edit.`
        }
      >
        <Text
          className="text-base font-normal"
          style={{ color: selectionCount === 0 ? theme.textMuted : theme.textPrimary }}
        >
          {triggerLabel}
        </Text>

        {/* Static: row layout, gap */}
        <View className="flex-row items-center gap-1.5">
          {selectionCount > 0 && (
            <View
              // Static: size, shape, spacing
              className="min-w-[22px] h-[22px] rounded-full items-center justify-center px-[5px]"
              style={{ backgroundColor: theme.primary }}
            >
              <Text className="text-xs font-bold text-white">{selectionCount}</Text>
            </View>
          )}
          <Ionicons name="chevron-down" size={20} color={theme.textMuted} />
        </View>
      </Pressable>

      {/* ── Selected subject chips ── */}
      {selectionCount > 0 && (
        <View className="flex-row flex-wrap gap-2">
          {selected.map((subject) => (
            <SelectedChip
              key={subject}
              label={subject}
              onRemove={handleRemoveChip}
              theme={theme}
            />
          ))}
        </View>
      )}

      {/* ── Modal bottom sheet ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
        statusBarTranslucent
      >
        {/* Backdrop — tap to dismiss without losing selection */}
        <Pressable className="flex-1 justify-end bg-black/50" onPress={closeModal}>

          {/* Sheet content — stop propagation so inner taps don't dismiss */}
          <Pressable
            onPress={(e) => e.stopPropagation()}
            // Static: shape, fill, max-height, padding
            className="rounded-t-3xl bg-surface-card dark:bg-surface-card-dark max-h-[88%] pb-8"
          >
            {/* Drag handle */}
            <View className="items-center pt-3 pb-1">
              <View className="w-10 h-1 rounded-full bg-divider dark:bg-divider-dark" />
            </View>

            {/* ── Sheet header ── */}
            <View className="flex-row items-center px-5 pt-2.5 pb-1">
              <View className="flex-1">
                <Text
                  className="text-lg font-bold mb-0.5"
                  style={{ color: theme.textPrimary }}
                >
                  Subject Expertise
                </Text>
                <Text
                  className="text-[13px]"
                  style={{ color: theme.textSoft }}
                >
                  {modalSubtitle}
                </Text>
              </View>

              {/* Selection counter badge */}
              {selectionCount > 0 && (
                <Text
                  className="text-[13px] font-semibold mr-3"
                  style={{ color: theme.primary }}
                >
                  {selectionCount}/{totalCount}
                </Text>
              )}

              {/* Close button */}
              <Pressable
                onPress={closeModal}
                style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Close subject picker"
              >
                <Ionicons name="close" size={22} color={theme.textSoft} />
              </Pressable>
            </View>

            {/* Divider */}
            <View
              className="h-px mx-5 mt-3 mb-2 opacity-50"
              style={{ backgroundColor: theme.divider }}
            />

            {/* ── Subject list ── */}
            {isLoadingSkills ? (
              <View className="items-center justify-center py-10">
                <ActivityIndicator color={theme.primary} />
              </View>
            ) : (
              <FlatList
                data={skills}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                getItemLayout={getItemLayout}
                extraData={selectedSet}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: 4, paddingBottom: 8 }}
                bounces={false}
              />
            )}

            {/* ── Done button ── */}
            <View className="px-5 pt-2">
              <Pressable
                onPress={closeModal}
                // Static: height, shape, row layout
                className="h-[52px] rounded-2xl flex-row items-center justify-center"
                style={({ pressed }) => ({
                  // Dynamic: pressed feedback + theme fill
                  opacity: pressed ? 0.85 : 1,
                  backgroundColor: theme.primary,
                })}
                accessibilityRole="button"
                accessibilityLabel={doneBtnA11yLabel}
              >
                <Text className="text-base font-bold text-white">
                  {selectionCount === 0
                    ? 'Done'
                    : `Done  ·  ${selectionCount} selected`}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}