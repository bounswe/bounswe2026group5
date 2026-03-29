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
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme];

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? 'bg-surface-dark' : 'bg-surface'}`}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 32, paddingTop: 40, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Brand Header ── */}
          <View className="flex-row items-center gap-2 mb-12">
            <Ionicons name="leaf" size={28} color={theme.primary} />
            <Text className="text-2xl font-black tracking-tight text-primary dark:text-primary-dim">
              Mentorship
            </Text>
          </View>

          {/* ── Hero Title ── */}
          <View className="mb-10">
            <Text
              className="text-4xl font-extrabold leading-tight tracking-tight mb-2 text-on-surface dark:text-on-surface-dark"
              accessibilityRole="header"
            >
              Log In to Mentorship
            </Text>
            <Text className="text-base font-medium text-on-surface-soft dark:text-on-surface-soft-dark">
              Enter your details to access your dashboard.
            </Text>
          </View>

          {/* ── Form ── */}
          <View className="gap-5">

            {/* Email / Username */}
            <View className="gap-1.5">
              <Text className="text-xs font-bold tracking-widest uppercase ml-1 text-on-surface-soft dark:text-on-surface-soft-dark">
                Email
              </Text>
              <View className="flex-row items-center h-14 rounded-xl px-4 gap-3 bg-surface-input dark:bg-surface-input-dark">
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={theme.textMuted}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
                <TextInput
                  className="flex-1 text-base font-medium text-on-surface dark:text-on-surface-dark"
                  placeholder="Enter your email"
                  placeholderTextColor={theme.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  returnKeyType="next"
                  accessibilityLabel="Email or username"
                />
              </View>
            </View>

            {/* Password */}
            <View className="gap-1.5">
              <View className="flex-row justify-between items-center ml-1">
                <Text className="text-xs font-bold tracking-widest uppercase text-on-surface-soft dark:text-on-surface-soft-dark">
                  Password
                </Text>
                <TouchableOpacity
                  accessibilityRole="link"
                  accessibilityLabel="Forgot password"
                  onPress={() =>
                    console.log('TODO: Navigate to forgot-password screen')
                  }
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text className="text-sm font-semibold text-primary dark:text-primary-dim">
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="flex-row items-center h-14 rounded-xl px-4 gap-3 bg-surface-input dark:bg-surface-input-dark">
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={theme.textMuted}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
                <TextInput
                  className="flex-1 text-base font-medium text-on-surface dark:text-on-surface-dark"
                  placeholder="Enter your password"
                  placeholderTextColor={theme.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="current-password"
                  returnKeyType="done"
                  accessibilityLabel="Password"
                  onSubmitEditing={() =>
                    console.log('TODO: Trigger login on keyboard done')
                  }
                />
                {/* Pressable avoids the stuck-opacity bug that TouchableOpacity
                    (which wraps children in Animated.View) causes when secureTextEntry
                    toggles rebuild the TextInput and interrupt the fade animation. */}
                <Pressable
                  onPress={() => setShowPassword((prev) => !prev)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={theme.textMuted}
                  />
                </Pressable>
              </View>
            </View>

            {/* Login CTA */}
            <TouchableOpacity
              className="w-full h-14 rounded-full items-center justify-center mt-2 shadow-sm bg-primary dark:bg-primary-dim"
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Log in"
              onPress={() =>
                console.log('TODO: POST /api/auth/login with email + password')
              }
            >
              <Text className="text-white text-lg font-bold">Log In</Text>
            </TouchableOpacity>

          </View>

          {/* ── Divider ── */}
          <View className="flex-row items-center gap-4 mt-12 mb-8">
            <View className="flex-1 h-px bg-divider/50 dark:bg-divider-dark" />
            <Text className="text-xs font-bold uppercase tracking-widest text-on-surface-muted dark:text-on-surface-muted-dark">
              or
            </Text>
            <View className="flex-1 h-px bg-divider/50 dark:bg-divider-dark" />
          </View>

          {/* ── Google Sign-In ── */}
          <TouchableOpacity
            className="w-full h-14 rounded-full flex-row items-center justify-center gap-3 shadow-sm border bg-surface-card dark:bg-surface-card-dark border-divider/25 dark:border-divider-dark"
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Log in with Google"
            onPress={() => console.log('TODO: Implement Google OAuth sign-in')}
          >
            <Ionicons
              name="logo-google"
              size={20}
              color={theme.textPrimary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text className="font-bold text-base text-on-surface dark:text-on-surface-dark">
              Log In with Google
            </Text>
          </TouchableOpacity>

          {/* ── Demo Bypass ── */}
          <TouchableOpacity
            className="w-full rounded-full h-12 mt-8 items-center justify-center"
            style={{
              backgroundColor: isDark ? '#451a03' : '#FEF3C7',
              borderColor: isDark ? '#92400e' : '#d97706',
              borderWidth: 1.5,
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Continue as demo user"
            onPress={() => router.replace('/(tabs)')}
          >
            <Text
              className="text-sm font-semibold"
              style={{ color: isDark ? '#fcd34d' : '#92400e' }}
            >
              Continue without logging in (Demo)
            </Text>
          </TouchableOpacity>

          {/* ── Sign Up Footer ── */}
          <View className="mt-6 items-center">
            <Text className="font-medium text-base text-on-surface-soft dark:text-on-surface-soft-dark">
              Don&apos;t have an account?{' '}
              <Text
                className="font-bold text-primary dark:text-primary-dim"
                accessibilityRole="link"
                accessibilityLabel="Sign up"
                onPress={() =>
                  console.log('TODO: Navigate to /register screen')
                }
              >
                Sign Up
              </Text>
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
