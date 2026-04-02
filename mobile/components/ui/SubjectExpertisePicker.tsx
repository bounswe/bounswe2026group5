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
 * Color tokens used
 *   bg-surface-active / dark:bg-surface-active-dark  — selected row background
 *   bg-surface-input  / dark:bg-surface-input-dark   — unselected row background
 *   bg-primary        / dark:bg-primary-dim          — checkmark circle fill
 *   text-primary      / dark:text-primary-dim        — selected row text & chip text
 *   bg-primary/15     / dark:bg-primary-dim/15       — chip background tint
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

// ─── Data ─────────────────────────────────────────────────────────────────────

/**
 * Available subjects — sorted strictly in alphabetical order at module level
 * so the array is a stable reference (no runtime sorting cost).
 */
const ALL_SUBJECTS: readonly string[] = [
  'Backend',
  'Career Advice',
  'Data Science',
  'DevOps',
  'Machine Learning',
  'Product Management',
  'React',
  'Software Engineering',
  'UI/UX Design',
];

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
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
        height: ITEM_H,
        backgroundColor: isSelected ? theme.surfaceActive : theme.inputBackground,
        marginHorizontal: 16,
        marginBottom: ITEM_GAP,
        borderRadius: 16,
      })}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      accessibilityLabel={subject}
    >
      {/* Inner View owns the row layout so flexDirection:'row' is never
          inside a style callback — avoids NativeWind v4 layout interference. */}
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          height: '100%',
        }}
      >
        {/* Subject label */}
        <Text
          style={{
            flex: 1,
            fontSize: 16,
            fontWeight: isSelected ? '600' : '400',
            color: isSelected ? theme.primary : theme.textPrimary,
          }}
        >
          {subject}
        </Text>

        {/* Circular checkbox — right side, small gap from text */}
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 12,
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
 * Memoised to prevent re-renders of unrelated chips on each selection change.
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
      style={({ pressed }) => ({
        opacity: pressed ? 0.75 : 1,
        // Chip/tag layout — label + remove icon always on the same row
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingLeft: 12,
        paddingRight: 9,
        paddingVertical: 7,
        borderRadius: 100,
        // Tinted chip appearance: surfaceActive background with primary text.
        // Visually reads as an interactive removable tag — distinct from the
        // solid-primary CTA button further down the screen.
        backgroundColor: theme.surfaceActive,
        borderWidth: 1,
        borderColor: theme.primary + '40', // 25 % opacity border ring
      })}
      accessibilityRole="button"
      accessibilityLabel={`Remove ${label}`}
      accessibilityHint="Double-tap to deselect this subject"
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: theme.cardBackground,
          backgroundColor: theme.primary,
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 999,
          overflow: 'hidden'
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
}

/**
 * Subject expertise picker for the registration form.
 * Renders a trigger field, a removable-chip row, and a bottom-sheet Modal.
 */
export function SubjectExpertisePicker({
  selected,
  onChange,
  role,
}: Readonly<SubjectExpertisePickerProps>) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [modalVisible, setModalVisible] = useState(false);

  // O(1) membership check — recalculated only when selected array reference changes.
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const selectionCount = selected.length;
  const totalCount = ALL_SUBJECTS.length;

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

  // ── Trigger label ──────────────────────────────────────────────────────────

  let triggerLabel = `${selectionCount} subjects selected`;
  if (selectionCount === 0) triggerLabel = 'Select subjects';
  else if (selectionCount === 1) triggerLabel = '1 subject selected';

  const subjectWord = selectionCount === 1 ? 'subject' : 'subjects';
  const doneBtnA11yLabel =
    selectionCount === 0
      ? 'Done, no subjects selected'
      : `Done, ${selectionCount} ${subjectWord} selected`;

  // ── Subtitle inside modal ──────────────────────────────────────────────────

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
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
        className="flex-row items-center justify-between h-14 rounded-xl px-4 bg-surface-input dark:bg-surface-input-dark"
        accessibilityRole="button"
        accessibilityLabel={
          selectionCount === 0
            ? 'Select subject expertise. No subjects selected.'
            : `Subject expertise. ${triggerLabel}. Tap to edit.`
        }
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: '400',
            color: selectionCount === 0 ? theme.textMuted : theme.textPrimary,
          }}
        >
          {triggerLabel}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {selectionCount > 0 && (
            <View
              style={{
                minWidth: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: theme.primary,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 5,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: 'white' }}>
                {selectionCount}
              </Text>
            </View>
          )}
          <Ionicons name="chevron-down" size={20} color={theme.textMuted} />
        </View>
      </Pressable>

      {/* ── Selected subject chips ── */}
      {selectionCount > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
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
        animationType="slide"
        onRequestClose={closeModal}
        statusBarTranslucent
      >
        {/* Backdrop — tap to dismiss without losing selection */}
        <Pressable
          className="flex-1 justify-end bg-black/50"
          onPress={closeModal}
        >
          {/* Sheet content — stop propagation so inner taps don't dismiss */}
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="rounded-t-3xl bg-surface-card dark:bg-surface-card-dark"
            style={{ maxHeight: '88%', paddingBottom: 32 }}
          >
            {/* Drag handle */}
            <View className="items-center pt-3 pb-1">
              <View className="w-10 h-1 rounded-full bg-divider dark:bg-divider-dark" />
            </View>

            {/* ── Sheet header ── */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingTop: 10,
                paddingBottom: 4,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: theme.textPrimary,
                    marginBottom: 2,
                  }}
                >
                  Subject Expertise
                </Text>
                <Text style={{ fontSize: 13, color: theme.textSoft }}>
                  {modalSubtitle}
                </Text>
              </View>

              {/* Selection counter badge */}
              {selectionCount > 0 && (
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: theme.primary,
                    marginRight: 12,
                  }}
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
              style={{
                height: 1,
                backgroundColor: theme.divider,
                marginHorizontal: 20,
                marginTop: 12,
                marginBottom: 8,
                opacity: 0.5,
              }}
            />

            {/* ── Subject list ── */}
            <FlatList
              data={ALL_SUBJECTS as string[]}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              getItemLayout={getItemLayout}
              extraData={selectedSet}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingTop: 4, paddingBottom: 8 }}
              // Disable nested scroll bounce so the parent modal sheet handles it
              bounces={false}
            />

            {/* ── Done button ── */}
            <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
              <Pressable
                onPress={closeModal}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.85 : 1,
                  height: 52,
                  borderRadius: 16,
                  backgroundColor: theme.primary,
                  flexDirection: 'row',
                  
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
                accessibilityRole="button"
                accessibilityLabel={doneBtnA11yLabel}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: 'white' }}>
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
