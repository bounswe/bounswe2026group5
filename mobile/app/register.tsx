import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

const GENDER_OPTIONS = ['Female', 'Male', 'Non-binary', 'Prefer not to say'] as const;

const SUBJECTS = [
  'Software Engineering',
  'React',
  'Backend',
  'Career Advice',
  'UI/UX Design',
  'Data Science',
  'Machine Learning',
  'DevOps',
  'Product Management',
];

export default function RegisterScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const [role, setRole] = useState<'mentor' | 'mentee'>('mentor');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [genderModalVisible, setGenderModalVisible] = useState(false);

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  };

  return (
    <SafeAreaView className="flex-1 dark:bg-surface-dark bg-surface">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >

        {/* ── Top App Bar ── */}
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            className="w-10 h-10 rounded-full items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={theme.primary} />
          </Pressable>
          <Text
            className="text-2xl font-bold text-on-surface dark:text-on-surface-dark"
            accessibilityRole="header"
          >
            Create Account
          </Text>
          {/* Spacer to keep title centred */}
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Hero ── */}
          <View className="mb-8">
            <Text
              className="text-4xl font-extrabold leading-tight tracking-tight mb-2"
              accessibilityRole="header"
            >
              <Text className="text-on-surface dark:text-on-surface-dark">Join the </Text>
              <Text className="text-primary dark:text-primary-dim">Circle.</Text>
            </Text>
            <Text className="text-base text-on-surface-soft dark:text-on-surface-soft-dark">
              Every expert was once a beginner. Start your journey today.
            </Text>
          </View>

          {/* ── Form ── */}
          <View className="gap-5">

            {/* Role Segmented Control */}
            <View className="gap-1.5">
              <Text className="text-xs font-bold tracking-widest uppercase ml-1 text-on-surface-soft dark:text-on-surface-soft-dark">
                My Role
              </Text>
              <View className="flex-row items-center p-1.5 rounded-xl h-14 bg-surface-input dark:bg-surface-input-dark">
                <Pressable
                  onPress={() => setRole('mentor')}
                  className={`flex-1 h-full rounded-lg items-center justify-center ${
                    role === 'mentor' ? 'bg-surface-card dark:bg-surface-card-dark shadow-sm' : ''
                  }`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: role === 'mentor' }}
                  accessibilityLabel="I want to be a Mentor"
                >
                  <Text
                    className={`text-sm font-semibold ${
                      role === 'mentor'
                        ? 'text-primary dark:text-primary-dim'
                        : 'text-on-surface-soft dark:text-on-surface-soft-dark'
                    }`}
                  >
                    I want to be a Mentor
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setRole('mentee')}
                  className={`flex-1 h-full rounded-lg items-center justify-center ${
                    role === 'mentee' ? 'bg-surface-card dark:bg-surface-card-dark shadow-sm' : ''
                  }`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: role === 'mentee' }}
                  accessibilityLabel="I want to be a Mentee"
                >
                  <Text
                    className={`text-sm font-semibold ${
                      role === 'mentee'
                        ? 'text-primary dark:text-primary-dim'
                        : 'text-on-surface-soft dark:text-on-surface-soft-dark'
                    }`}
                  >
                    I want to be a Mentee
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* First Name + Last Name */}
            <View className="flex-row gap-4">
              <View className="flex-1 gap-1.5">
                <Text className="text-xs font-bold tracking-widest uppercase ml-1 text-on-surface-soft dark:text-on-surface-soft-dark">
                  First Name
                </Text>
                <View className="flex-row items-center h-14 rounded-xl px-4 bg-surface-input dark:bg-surface-input-dark">
                  <TextInput
                    className="flex-1 text-base font-medium text-on-surface dark:text-on-surface-dark"
                    placeholder="Alex"
                    placeholderTextColor={theme.textMuted}
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    autoComplete="given-name"
                    returnKeyType="next"
                    accessibilityLabel="First name"
                  />
                </View>
              </View>
              <View className="flex-1 gap-1.5">
                <Text className="text-xs font-bold tracking-widest uppercase ml-1 text-on-surface-soft dark:text-on-surface-soft-dark">
                  Last Name
                </Text>
                <View className="flex-row items-center h-14 rounded-xl px-4 bg-surface-input dark:bg-surface-input-dark">
                  <TextInput
                    className="flex-1 text-base font-medium text-on-surface dark:text-on-surface-dark"
                    placeholder="Rivers"
                    placeholderTextColor={theme.textMuted}
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                    autoComplete="family-name"
                    returnKeyType="next"
                    accessibilityLabel="Last name"
                  />
                </View>
              </View>
            </View>

            {/* Username */}
            <View className="gap-1.5">
              <Text className="text-xs font-bold tracking-widest uppercase ml-1 text-on-surface-soft dark:text-on-surface-soft-dark">
                Username
              </Text>
              <View className="flex-row items-center h-14 rounded-xl px-4 gap-2 bg-surface-input dark:bg-surface-input-dark">
                <Text className="text-base font-medium text-on-surface-muted dark:text-on-surface-muted-dark">
                  @
                </Text>
                <TextInput
                  className="flex-1 text-base font-medium text-on-surface dark:text-on-surface-dark"
                  placeholder="arivers_dev"
                  placeholderTextColor={theme.textMuted}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoComplete="username"
                  returnKeyType="next"
                  accessibilityLabel="Username"
                />
              </View>
            </View>

            {/* Date of Birth */}
            <View className="gap-1.5">
              <Text className="text-xs font-bold tracking-widest uppercase ml-1 text-on-surface-soft dark:text-on-surface-soft-dark">
                Date of Birth
              </Text>
              <View className="flex-row items-center h-14 rounded-xl px-4 gap-3 bg-surface-input dark:bg-surface-input-dark">
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={theme.textMuted}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
                <TextInput
                  className="flex-1 text-base font-medium text-on-surface dark:text-on-surface-dark"
                  placeholder="MM / DD / YYYY"
                  placeholderTextColor={theme.textMuted}
                  value={dob}
                  onChangeText={setDob}
                  keyboardType="default"
                  returnKeyType="next"
                  accessibilityLabel="Date of birth"
                  maxLength={14}
                />
              </View>
            </View>

            {/* Gender */}
            <View className="gap-1.5">
              <Text className="text-xs font-bold tracking-widest uppercase ml-1 text-on-surface-soft dark:text-on-surface-soft-dark">
                Gender
              </Text>
              <Pressable
                onPress={() => setGenderModalVisible(true)}
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                className="flex-row items-center justify-between h-14 rounded-xl px-4 bg-surface-input dark:bg-surface-input-dark"
                accessibilityRole="button"
                accessibilityLabel={gender ? `Gender: ${gender}` : 'Select gender'}
              >
                <Text
                  className={`text-base font-medium ${
                    gender
                      ? 'text-on-surface dark:text-on-surface-dark'
                      : 'text-on-surface-muted dark:text-on-surface-muted-dark'
                  }`}
                >
                  {gender || 'Select gender'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={theme.textMuted} />
              </Pressable>
            </View>

            {/* Subject Expertise */}
            <View className="gap-3 pt-2">
              <View className="gap-1">
                <Text className="text-xl font-bold text-on-surface dark:text-on-surface-dark">
                  Subject Expertise
                </Text>
                <Text className="text-sm text-on-surface-soft dark:text-on-surface-soft-dark">
                  {role === 'mentor'
                    ? 'Select subjects you feel confident mentoring others in.'
                    : 'Select subjects you want to learn about.'}
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 4, gap: 10 }}
              >
                {SUBJECTS.map((subject) => {
                  const active = selectedSubjects.includes(subject);
                  return (
                    <Pressable
                      key={subject}
                      onPress={() => toggleSubject(subject)}
                      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                      className={`px-5 py-2.5 rounded-full flex-row items-center gap-2 ${
                        active
                          ? 'bg-primary dark:bg-primary-dim'
                          : 'bg-surface-input dark:bg-surface-input-dark'
                      }`}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: active }}
                      accessibilityLabel={subject}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          active
                            ? 'text-white'
                            : 'text-on-surface-soft dark:text-on-surface-soft-dark'
                        }`}
                      >
                        {subject}
                      </Text>
                      {active && (
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color="white"
                          accessibilityElementsHidden
                          importantForAccessibility="no"
                        />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* CTA + Log In link */}
            <View className="gap-5 pt-4">
              <TouchableOpacity
                className="w-full h-16 rounded-xl items-center justify-center flex-row gap-3 bg-primary dark:bg-primary-dim"
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel="Complete registration"
                onPress={() => console.log('TODO: POST /api/auth/register')}
              >
                <Text className="text-white font-bold text-lg">Complete Registration</Text>
                <Ionicons
                  name="arrow-forward"
                  size={22}
                  color="white"
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
              </TouchableOpacity>

              <View className="items-center">
                <TouchableOpacity
                  onPress={() => router.replace('/login')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="link"
                  accessibilityLabel="Already have an account? Log In"
                >
                  <Text className="text-base font-bold text-primary dark:text-primary-dim">
                    Already have an account? Log In
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Gender Picker Modal ── */}
      <Modal
        animationType="fade"
        transparent
        visible={genderModalVisible}
        onRequestClose={() => setGenderModalVisible(false)}
        statusBarTranslucent
      >
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setGenderModalVisible(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="rounded-t-3xl p-6 pb-10 bg-surface-card dark:bg-surface-card-dark"
          >
            {/* Drag handle */}
            <View className="w-10 h-1 rounded-full bg-divider dark:bg-divider-dark self-center mb-5" />
            <Text className="text-lg font-bold mb-4 text-on-surface dark:text-on-surface-dark">
              Select Gender
            </Text>
            {GENDER_OPTIONS.map((option) => (
              <Pressable
                key={option}
                onPress={() => {
                  setGender(option);
                  setGenderModalVisible(false);
                }}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                className={`flex-row items-center justify-between h-14 px-4 rounded-xl mb-2 ${
                  gender === option
                    ? 'bg-surface-card dark:bg-surface-card-dark'
                    : 'bg-surface-input dark:bg-surface-input-dark'
                }`}
                accessibilityRole="radio"
                accessibilityState={{ checked: gender === option }}
                accessibilityLabel={option}
              >
                <Text
                  className={`text-base ${
                    gender === option
                      ? 'font-bold text-primary dark:text-primary-dim'
                      : 'font-medium text-on-surface dark:text-on-surface-dark'
                  }`}
                >
                  {option}
                </Text>
                {gender === option && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={theme.primary}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                )}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}