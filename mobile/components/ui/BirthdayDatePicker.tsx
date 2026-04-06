/**
 * BirthdayDatePicker
 *
 * Self-contained birthday picker with three modes:
 *   calendar  — react-native-calendars day grid with tappable Month/Year header labels
 *   month     — drum-roll wheel: January – December (full English names)
 *   year      — drum-roll wheel: 1910 – 2026 (descending, newest first)
 *
 * Trigger: a calendar icon Pressable intended to be placed inside the DOB form field.
 * Uses Modal (transparent + animationType="slide") so it renders above the root Stack
 * without needing an absolute-positioned child inside the register screen tree.
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

// ─── Wheel constants ──────────────────────────────────────────────────────────

const ITEM_H = 54;          // height of every wheel row in px
const VISIBLE = 5;          // number of rows visible at once (must be odd)
const WHEEL_H = ITEM_H * VISIBLE;
const CENTER_PAD = ITEM_H * Math.floor(VISIBLE / 2); // rows of padding above / below

// ─── Data ─────────────────────────────────────────────────────────────────────

const FULL_MONTHS: readonly string[] = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
];

const SHORT_MONTHS: readonly string[] = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MIN_YEAR = 1910;
const MAX_YEAR = 2026;
// Descending so that users born recently reach their year quickly.
const YEAR_LABELS: string[] = Array.from(
  { length: MAX_YEAR - MIN_YEAR + 1 },
  (_, i) => String(MAX_YEAR - i),
);
const YEAR_VALUES: number[] = Array.from(
  { length: MAX_YEAR - MIN_YEAR + 1 },
  (_, i) => MAX_YEAR - i,
);

// ─── Helper ───────────────────────────────────────────────────────────────────

/** MM/DD/YYYY → YYYY-MM-DD (for react-native-calendars). Returns undefined when incomplete. */
function toCalendarDate(formatted: string): string | undefined {
  if (formatted.length !== 10) return undefined;
  const [mm, dd, yyyy] = formatted.split('/');
  if (!mm || !dd || yyyy?.length !== 4) return undefined;
  return `${yyyy}-${mm}-${dd}`;
}

// ─── WheelPicker ─────────────────────────────────────────────────────────────

interface WheelPickerProps {
  items: readonly string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  theme: (typeof Colors)['light'];
}

/**
 * Drum-roll style wheel picker.
 * - Five items visible; selected item centred behind a bordered ring.
 * - Snaps to each item; commits selection on scroll end.
 * - Tapping an item scrolls & commits immediately.
 */
function WheelPicker({ items, selectedIndex, onSelect, theme }: WheelPickerProps) {
  const scrollRef = useRef<ScrollView>(null);
  const momentumActive = useRef(false);

  // Auto-scroll to the selected item whenever the index changes (e.g. on open).
  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false });
    }, 60);
    return () => clearTimeout(t);
  }, [selectedIndex]);

  const commitScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const raw = e.nativeEvent.contentOffset.y / ITEM_H;
      const idx = Math.max(0, Math.min(items.length - 1, Math.round(raw)));
      onSelect(idx);
    },
    [items.length, onSelect],
  );

  return (
    <View style={{ height: WHEEL_H, overflow: 'hidden' }}>

      {/* Top fade mask */}
      <View
        pointerEvents="none"
        className="absolute top-0 left-0 right-0 bg-surface-card dark:bg-surface-card-dark"
        style={{ height: CENTER_PAD, opacity: 0.72, zIndex: 3 }}
      />

      {/* Selection ring */}
      <View
        pointerEvents="none"
        className="absolute bg-primary/[0.07] dark:bg-primary-dim/[0.08]"
        style={{
          left: 20,
          right: 20,
          top: CENTER_PAD,
          height: ITEM_H,
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: theme.primary,
          zIndex: 2,
        }}
      />

      {/* Bottom fade mask */}
      <View
        pointerEvents="none"
        className="absolute bottom-0 left-0 right-0 bg-surface-card dark:bg-surface-card-dark"
        style={{ height: CENTER_PAD, opacity: 0.72, zIndex: 3 }}
      />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: CENTER_PAD }}
        onScrollBeginDrag={() => { momentumActive.current = false; }}
        onMomentumScrollBegin={() => { momentumActive.current = true; }}
        onScrollEndDrag={(e) => {
          if (!momentumActive.current) commitScroll(e);
        }}
        onMomentumScrollEnd={(e) => {
          momentumActive.current = false;
          commitScroll(e);
        }}
        scrollEventThrottle={16}
      >
        {items.map((label, idx) => {
          const isActive = idx === selectedIndex;
          return (
            <Pressable
              key={`${label}-${idx}`}
              onPress={() => {
                onSelect(idx);
                scrollRef.current?.scrollTo({ y: idx * ITEM_H, animated: true });
              }}
              style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text
                style={{
                  fontSize: isActive ? 19 : 15,
                  fontWeight: isActive ? '700' : '400',
                  color: isActive ? theme.primary : theme.textSoft,
                  letterSpacing: isActive ? 0.4 : 0,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── BirthdayDatePicker ───────────────────────────────────────────────────────

export interface BirthdayDatePickerProps {
  /** Currently typed / selected date in MM/DD/YYYY format (may be empty or partial). */
  value: string;
  /** Called with a complete MM/DD/YYYY string when the user taps a calendar day. */
  onChange: (date: string) => void;
}

/**
 * Birthday date picker component.
 *
 * Renders a calendar-icon trigger and a Modal bottom-sheet with three views:
 * calendar day grid, month wheel, and year wheel.
 */
export function BirthdayDatePicker({ value, onChange }: BirthdayDatePickerProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const todayStr = new Date().toISOString().split('T')[0];
  const defaultDisplay = `${new Date().getFullYear() - 20}-01-01`;

  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<'calendar' | 'month' | 'year'>('calendar');
  const [displayDate, setDisplayDate] = useState(defaultDisplay);

  // Derived values
  const calendarDate = toCalendarDate(value);
  const displayYear = parseInt(displayDate.slice(0, 4), 10);
  const displayMonth = parseInt(displayDate.slice(5, 7), 10); // 1-indexed

  const selectedMonthIdx = displayMonth - 1; // 0-indexed into FULL_MONTHS
  const rawYearIdx = YEAR_VALUES.indexOf(displayYear);
  const selectedYearIdx = rawYearIdx >= 0 ? rawYearIdx : 0;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const openPicker = useCallback(() => {
    setMode('calendar');
    setDisplayDate(calendarDate ?? defaultDisplay);
    setVisible(true);
  }, [calendarDate, defaultDisplay]);

  const closePicker = useCallback(() => setVisible(false), []);

  const handleDayPress = useCallback(
    (day: DateData) => {
      const mm = String(day.month).padStart(2, '0');
      const dd = String(day.day).padStart(2, '0');
      onChange(`${mm}/${dd}/${day.year}`);
      closePicker();
    },
    [onChange, closePicker],
  );

  const handleMonthSelect = useCallback(
    (idx: number) => {
      const monthNum = idx + 1;
      setDisplayDate(`${displayYear}-${String(monthNum).padStart(2, '0')}-01`);
    },
    [displayYear],
  );

  const handleYearSelect = useCallback(
    (idx: number) => {
      const year = YEAR_VALUES[idx];
      setDisplayDate(`${year}-${String(displayMonth).padStart(2, '0')}-01`);
    },
    [displayMonth],
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  const sheetTitle =
    mode === 'calendar' ? 'Date of Birth'
    : mode === 'month'   ? 'Select Month'
    :                      'Select Year';

  return (
    <>
      {/* ── Trigger ── */}
      <Pressable
        onPress={openPicker}
        style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="Open birthday date picker"
      >
        <Ionicons name="calendar-outline" size={20} color={theme.textMuted} />
      </Pressable>

      {/* ── Modal ── */}
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={closePicker}
        statusBarTranslucent
      >
        {/* Backdrop — tap to dismiss */}
        <Pressable
          className="flex-1 justify-end bg-black/50"
          onPress={closePicker}
        >
          {/* Sheet — stop propagation so inner taps do not dismiss */}
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="rounded-t-3xl bg-surface-card dark:bg-surface-card-dark"
            style={{ paddingBottom: 36 }}
          >
            {/* Drag handle */}
            <View className="items-center pt-3 pb-2">
              <View className="w-10 h-1 rounded-full bg-divider dark:bg-divider-dark" />
            </View>

            {/* ── Sheet Header ── */}
            <View
              className="flex-row items-center px-5 pb-2"
              style={{ gap: 10 }}
            >
              {/* Back button — only visible in month / year mode */}
              {mode !== 'calendar' ? (
                <Pressable
                  onPress={() => setMode('calendar')}
                  style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Back to calendar"
                >
                  <Ionicons name="arrow-back" size={22} color={theme.primary} />
                </Pressable>
              ) : (
                <View style={{ width: 22 }} />
              )}

              <Text className="flex-1 text-center text-lg font-bold text-on-surface dark:text-on-surface-dark">
                {sheetTitle}
              </Text>

              {/* Close button */}
              <Pressable
                onPress={closePicker}
                style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Close date picker"
              >
                <Ionicons name="close" size={22} color={theme.textSoft} />
              </Pressable>
            </View>

            {/* ── Calendar Mode ── */}
            {mode === 'calendar' && (
              <View style={{ paddingHorizontal: 8 }}>
                <Calendar
                  current={displayDate}
                  maxDate={todayStr}
                  minDate={`${MIN_YEAR}-01-01`}
                  onDayPress={handleDayPress}
                  onMonthChange={(month) =>
                    setDisplayDate(
                      `${month.year}-${String(month.month).padStart(2, '0')}-01`,
                    )
                  }
                  markedDates={
                    calendarDate
                      ? { [calendarDate]: { selected: true, selectedColor: theme.primary } }
                      : {}
                  }
                  renderHeader={() => (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      {/* Month label ── opens month wheel */}
                      <Pressable
                        onPress={() => setMode('month')}
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.55 : 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 8,
                          paddingVertical: 5,
                          borderRadius: 10,
                        })}
                        accessibilityRole="button"
                        accessibilityLabel={`Month: ${FULL_MONTHS[displayMonth - 1]}. Tap to change`}
                      >
                        <Text
                          style={{
                            color: theme.textPrimary,
                            fontWeight: '700',
                            fontSize: 15,
                          }}
                        >
                          {SHORT_MONTHS[displayMonth - 1]}
                        </Text>
                        <Ionicons name="chevron-down" size={13} color={theme.primary} />
                      </Pressable>

                      {/* Year label ── opens year wheel */}
                      <Pressable
                        onPress={() => setMode('year')}
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.55 : 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 8,
                          paddingVertical: 5,
                          borderRadius: 10,
                        })}
                        accessibilityRole="button"
                        accessibilityLabel={`Year: ${displayYear}. Tap to change`}
                      >
                        <Text
                          style={{
                            color: theme.textPrimary,
                            fontWeight: '700',
                            fontSize: 15,
                          }}
                        >
                          {displayYear}
                        </Text>
                        <Ionicons name="chevron-down" size={13} color={theme.primary} />
                      </Pressable>
                    </View>
                  )}
                  theme={{
                    backgroundColor: 'transparent',
                    calendarBackground: 'transparent',
                    textSectionTitleColor: theme.textSoft,
                    selectedDayBackgroundColor: theme.primary,
                    selectedDayTextColor: 'white',
                    todayTextColor: theme.primary,
                    dayTextColor: theme.textPrimary,
                    textDisabledColor: theme.textMuted,
                    monthTextColor: theme.textPrimary,
                    textMonthFontWeight: 'bold',
                    arrowColor: theme.primary,
                    textDayFontSize: 14,
                    textMonthFontSize: 15,
                    textDayHeaderFontSize: 12,
                  }}
                />
              </View>
            )}

            {/* ── Month Wheel ── */}
            {mode === 'month' && (
              <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                <WheelPicker
                  items={FULL_MONTHS}
                  selectedIndex={selectedMonthIdx}
                  onSelect={handleMonthSelect}
                  theme={theme}
                />
                <Pressable
                  onPress={() => setMode('calendar')}
                  className="mt-5 mx-4 rounded-2xl items-center justify-center bg-primary dark:bg-primary-dim"
                  style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, height: 52 })}
                  accessibilityRole="button"
                  accessibilityLabel="Apply selected month"
                >
                  <Text className="text-white text-base font-bold tracking-wide">
                    Apply
                  </Text>
                </Pressable>
              </View>
            )}

            {/* ── Year Wheel ── */}
            {mode === 'year' && (
              <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                <WheelPicker
                  items={YEAR_LABELS}
                  selectedIndex={selectedYearIdx}
                  onSelect={handleYearSelect}
                  theme={theme}
                />
                <Pressable
                  onPress={() => setMode('calendar')}
                  className="mt-5 mx-4 rounded-2xl items-center justify-center bg-primary dark:bg-primary-dim"
                  style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, height: 52 })}
                  accessibilityRole="button"
                  accessibilityLabel="Apply selected year"
                >
                  <Text className="text-white text-base font-bold tracking-wide">
                    Apply
                  </Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
