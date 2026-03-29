import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
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
            <Text
              className="text-2xl font-black tracking-tight"
              style={{ color: theme.primary }}
            >
              Mentorship
            </Text>
          </View>

          {/* ── Hero Title ── */}
          <View className="mb-10">
            <Text
              className="text-4xl font-extrabold leading-tight tracking-tight mb-2"
              style={{ color: theme.textPrimary }}
              accessibilityRole="header"
            >
              Log In to Mentorship
            </Text>
            <Text
              className="text-base font-medium"
              style={{ color: theme.textSoft }}
            >
              Enter your details to access your dashboard.
            </Text>
          </View>

          {/* ── Form ── */}
          <View className="gap-5">

            {/* Email / Username */}
            <View className="gap-1.5">
              <Text
                className="text-xs font-bold tracking-widest uppercase ml-1"
                style={{ color: theme.textSoft }}
              >
                Email
              </Text>
              <View
                className="flex-row items-center h-14 rounded-xl px-4 gap-3"
                style={{ backgroundColor: theme.inputBackground }}
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={theme.textMuted}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
                <TextInput
                  className="flex-1 text-base font-medium"
                  style={{ color: theme.textPrimary }}
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
                <Text
                  className="text-xs font-bold tracking-widest uppercase"
                  style={{ color: theme.textSoft }}
                >
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
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: theme.primary }}
                  >
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </View>

              <View
                className="flex-row items-center h-14 rounded-xl px-4 gap-3"
                style={{ backgroundColor: theme.inputBackground }}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={theme.textMuted}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
                <TextInput
                  className="flex-1 text-base font-medium"
                  style={{ color: theme.textPrimary }}
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
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? 'Hide password' : 'Show password'
                  }
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={theme.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Login CTA */}
            <TouchableOpacity
              className="w-full h-14 rounded-full items-center justify-center mt-2 shadow-sm"
              style={{ backgroundColor: theme.primary }}
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
            <View
              className="flex-1 h-px"
              style={{ backgroundColor: isDark ? theme.divider : `${theme.divider}80` }}
            />
            <Text
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: theme.textMuted }}
            >
              or
            </Text>
            <View
              className="flex-1 h-px"
              style={{ backgroundColor: isDark ? theme.divider : `${theme.divider}80` }}
            />
          </View>

          {/* ── Google Sign-In ── */}
          <TouchableOpacity
            className="w-full h-14 rounded-full flex-row items-center justify-center gap-3 shadow-sm border"
            style={{
              backgroundColor: theme.cardBackground,
              borderColor: isDark ? theme.divider : `${theme.divider}40`,
            }}
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
            <Text
              className="font-bold text-base"
              style={{ color: theme.textPrimary }}
            >
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
            <Text
              className="font-medium text-base"
              style={{ color: theme.textSoft }}
            >
              Don&apos;t have an account?{' '}
              <Text
                className="font-bold"
                style={{ color: theme.primary }}
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
