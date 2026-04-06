import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/constants/theme";
import { SubjectExpertisePicker } from "@/components/ui/SubjectExpertisePicker";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuthStore } from "@/lib/auth/store";
import { useRegisterMutation } from "@/lib/queries/auth";
import { updateProfileFn, updateUsageModeFn } from "@/lib/queries/authQueries";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[\w-]+$/;

type RegisterMutation = {
  mutateAsync: (credentials: {
    email: string;
    password: string;
    confirm_password: string;
  }) => Promise<{
    access_token: string;
    user: { id: string; username: string };
  }>;
  isPending: boolean;
};

type UpdateUserFn = (patch: {
  app_usage_mode: "MENTOR" | "MENTEE";
}) => Promise<void>;

type RegistrationErrorState = {
  usernameError: string;
  displayNameError: string;
  emailError: string;
  passwordError: string;
  confirmPasswordError: string;
  skillsError: string;
  termsError: string;
};

type RegistrationInput = {
  preferredUsername: string;
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: "mentor" | "mentee";
  selectedSubjects: string[];
  termsAccepted: boolean;
};

function validateUsername(value: string): string {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "Username is required.";
  if (trimmedValue.length > 50) {
    return "Username must be 50 characters or fewer.";
  }
  if (!USERNAME_REGEX.test(trimmedValue)) {
    return "Use only letters, numbers, underscores, and hyphens.";
  }
  return "";
}

function validateDisplayName(value: string): string {
  if (!value.trim()) return "Display name is required.";
  return "";
}

function validateEmail(value: string): string {
  if (!value.trim()) return "Email is required.";
  if (!EMAIL_REGEX.test(value.trim())) {
    return "Please enter a valid email address.";
  }
  return "";
}

function validatePassword(value: string): string {
  if (!value) return "Password is required.";
  if (value.length < 8) return "Password must be at least 8 characters.";
  return "";
}

function getConfirmPasswordError(
  passwordValue: string,
  confirmPasswordValue: string,
): string {
  if (!confirmPasswordValue) return "Confirm password is required.";
  if (confirmPasswordValue === passwordValue) return "";
  return "Passwords do not match.";
}

function getTermsError(termsAccepted: boolean): string {
  if (termsAccepted) return "";
  return "You must agree to the Terms of Service and Privacy Policy.";
}

function validateRegistrationInput(
  input: RegistrationInput,
): RegistrationErrorState | null {
  const usernameError = validateUsername(input.preferredUsername);
  const displayNameError = validateDisplayName(input.displayName);
  const emailError = validateEmail(input.email);
  const passwordError = validatePassword(input.password);
  const confirmPasswordError = getConfirmPasswordError(
    input.password,
    input.confirmPassword,
  );
  const skillsError =
    input.selectedSubjects.length === 0
      ? "Please select at least one skill."
      : "";
  const termsError = getTermsError(input.termsAccepted);

  if (
    usernameError ||
    displayNameError ||
    emailError ||
    passwordError ||
    confirmPasswordError ||
    skillsError ||
    termsError
  ) {
    return {
      usernameError,
      displayNameError,
      emailError,
      passwordError,
      confirmPasswordError,
      skillsError,
      termsError,
    };
  }

  return null;
}

function applyValidationErrors(
  errors: RegistrationErrorState,
  setErrorState: {
    setUsernameError: (value: string) => void;
    setDisplayNameError: (value: string) => void;
    setEmailError: (value: string) => void;
    setPasswordError: (value: string) => void;
    setConfirmPasswordError: (value: string) => void;
    setSkillsError: (value: string) => void;
    setTermsError: (value: string) => void;
  },
): void {
  setErrorState.setUsernameError(errors.usernameError);
  setErrorState.setDisplayNameError(errors.displayNameError);
  setErrorState.setEmailError(errors.emailError);
  setErrorState.setPasswordError(errors.passwordError);
  setErrorState.setConfirmPasswordError(errors.confirmPasswordError);
  setErrorState.setSkillsError(errors.skillsError);
  setErrorState.setTermsError(errors.termsError);
}

async function completeRegistration(params: {
  input: RegistrationInput;
  registerAccount: RegisterMutation;
  updateUser: UpdateUserFn;
}): Promise<string> {
  const usageMode = params.input.role === "mentor" ? "MENTOR" : "MENTEE";

  // Register endpoint accepts only email/password fields.
  const authResponse = await params.registerAccount.mutateAsync({
    email: params.input.email.trim(),
    password: params.input.password,
    confirm_password: params.input.confirmPassword,
  });

  await updateUsageModeFn({
    userId: authResponse.user.id,
    app_usage_mode: usageMode,
    accessToken: authResponse.access_token,
    _username: authResponse.user.username,
  });

  await updateProfileFn({
    username: authResponse.user.username,
    accessToken: authResponse.access_token,
    display_name: params.input.displayName.trim(),
    ...(params.input.role === "mentor"
      ? { expertises: params.input.selectedSubjects }
      : { eager_to_learn: params.input.selectedSubjects }),
  });

  await params.updateUser({ app_usage_mode: usageMode });
  return authResponse.user.username;
}

type RegisterFormProps = {
  role: "mentor" | "mentee";
  setRole: (role: "mentor" | "mentee") => void;
  preferredUsername: string;
  setPreferredUsername: (value: string) => void;
  usernameError: string;
  setUsernameError: (value: string) => void;
  displayName: string;
  setDisplayName: (value: string) => void;
  displayNameError: string;
  setDisplayNameError: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  emailError: string;
  setEmailError: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  passwordError: string;
  setPasswordError: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  confirmPasswordError: string;
  setConfirmPasswordError: (value: string) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (value: boolean) => void;
  selectedSubjects: string[];
  setSelectedSubjects: (value: string[]) => void;
  skillsError: string;
  setSkillsError: (value: string) => void;
  terms: boolean;
  setTerms: (value: boolean) => void;
  termsError: string;
  setTermsError: (value: string) => void;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  theme: (typeof Colors)[keyof typeof Colors];
};

function RegisterForm(props: Readonly<RegisterFormProps>) {
  const skillLabel = props.role === "mentor" ? "Teach Skills" : "Learn Skills";

  return (
    <View className="gap-5">
      <View className="gap-1.5">
        <Text className="text-xs font-bold tracking-widest uppercase ml-1 text-on-surface-soft dark:text-on-surface-soft-dark">
          My Role
        </Text>
        <View className="flex-row items-center p-1.5 rounded-xl h-14 bg-surface-input dark:bg-surface-input-dark">
          <Pressable
            onPress={() => props.setRole("mentor")}
            className="flex-1 h-full rounded-lg items-center justify-center"
            style={
              props.role === "mentor"
                ? { backgroundColor: props.theme.cardBackground }
                : undefined
            }
            accessibilityRole="button"
            accessibilityState={{ selected: props.role === "mentor" }}
            accessibilityLabel="I want to be a Mentor"
          >
            <Text
              className="text-sm font-semibold"
              style={{
                color:
                  props.role === "mentor"
                    ? props.theme.primary
                    : props.theme.textSoft,
              }}
            >
              Mentor
            </Text>
          </Pressable>

          <Pressable
            onPress={() => props.setRole("mentee")}
            className="flex-1 h-full rounded-lg items-center justify-center"
            style={
              props.role === "mentee"
                ? { backgroundColor: props.theme.cardBackground }
                : undefined
            }
            accessibilityRole="button"
            accessibilityState={{ selected: props.role === "mentee" }}
            accessibilityLabel="I want to be a Mentee"
          >
            <Text
              className="text-sm font-semibold"
              style={{
                color:
                  props.role === "mentee"
                    ? props.theme.primary
                    : props.theme.textSoft,
              }}
            >
              Mentee
            </Text>
          </Pressable>
        </View>
      </View>

      <View className="gap-1.5">
        <Text className="text-xs font-bold tracking-widest uppercase ml-1 text-on-surface-soft dark:text-on-surface-soft-dark">
          Display Name
        </Text>
        <View className="flex-row items-center h-14 rounded-xl px-4 gap-2 bg-surface-input dark:bg-surface-input-dark">
          <Ionicons
            name="person-outline"
            size={18}
            color={props.theme.textMuted}
          />
          <TextInput
            className="flex-1 text-base font-medium text-on-surface dark:text-on-surface-dark"
            placeholder="Alex Rivers"
            placeholderTextColor={props.theme.textMuted}
            value={props.displayName}
            onChangeText={(text) => {
              props.setDisplayName(text);
              if (props.displayNameError) {
                props.setDisplayNameError(validateDisplayName(text));
              }
            }}
            onBlur={() => props.setDisplayNameError(validateDisplayName(props.displayName))}
            autoCapitalize="words"
            autoComplete="name"
            returnKeyType="next"
            accessibilityLabel="Display name"
          />
        </View>
        {!!props.displayNameError && (
          <Text className="text-xs text-red-500 ml-1">{props.displayNameError}</Text>
        )}
      </View>

      <View className="gap-1.5">
        <Text className="text-xs font-bold tracking-widest uppercase ml-1 text-on-surface-soft dark:text-on-surface-soft-dark">
          Preferred Username
        </Text>
        <View className="flex-row items-center h-14 rounded-xl px-4 gap-2 bg-surface-input dark:bg-surface-input-dark">
          <Text className="text-base font-medium text-on-surface-muted dark:text-on-surface-muted-dark">
            @
          </Text>
          <TextInput
            className="flex-1 text-base font-medium text-on-surface dark:text-on-surface-dark"
            placeholder="alex-rivers"
            placeholderTextColor={props.theme.textMuted}
            value={props.preferredUsername}
            onChangeText={(text) => {
              props.setPreferredUsername(text);
              if (props.usernameError) {
                props.setUsernameError(validateUsername(text));
              }
            }}
            onBlur={() => props.setUsernameError(validateUsername(props.preferredUsername))}
            autoCapitalize="none"
            autoComplete="username"
            returnKeyType="next"
            accessibilityLabel="Preferred username"
          />
        </View>
        {!!props.usernameError && (
          <Text className="text-xs text-red-500 ml-1">{props.usernameError}</Text>
        )}
        <Text className="text-[11px] text-on-surface-muted ml-1">
          Used for profile setup preference. Final username is currently generated by backend.
        </Text>
      </View>

      <View className="gap-1.5">
        <Text className="text-xs font-bold tracking-widest uppercase ml-1 text-on-surface-soft dark:text-on-surface-soft-dark">
          Email
        </Text>
        <View className="flex-row items-center h-14 rounded-xl px-4 gap-2 bg-surface-input dark:bg-surface-input-dark">
          <Ionicons name="mail-outline" size={18} color={props.theme.textMuted} />
          <TextInput
            className="flex-1 text-base font-medium text-on-surface dark:text-on-surface-dark"
            placeholder="alex@example.com"
            placeholderTextColor={props.theme.textMuted}
            value={props.email}
            onChangeText={(text) => {
              props.setEmail(text);
              if (props.emailError) {
                props.setEmailError(validateEmail(text));
              }
            }}
            onBlur={() => props.setEmailError(validateEmail(props.email))}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            returnKeyType="next"
            accessibilityLabel="Email"
          />
        </View>
        {!!props.emailError && (
          <Text className="text-xs text-red-500 ml-1">{props.emailError}</Text>
        )}
      </View>

      <View className="gap-1.5">
        <Text className="text-xs font-bold tracking-widest uppercase ml-1 text-on-surface-soft dark:text-on-surface-soft-dark">
          Password
        </Text>
        <View className="flex-row items-center h-14 rounded-xl px-4 gap-2 bg-surface-input dark:bg-surface-input-dark">
          <Ionicons
            name="lock-closed-outline"
            size={18}
            color={props.theme.textMuted}
          />
          <TextInput
            className="flex-1 text-base font-medium text-on-surface dark:text-on-surface-dark"
            placeholder="Min 8 characters"
            placeholderTextColor={props.theme.textMuted}
            value={props.password}
            onChangeText={(text) => {
              props.setPassword(text);
              if (props.passwordError) {
                props.setPasswordError(validatePassword(text));
              }
              if (props.confirmPassword) {
                props.setConfirmPasswordError(
                  getConfirmPasswordError(text, props.confirmPassword),
                );
              }
            }}
            onBlur={() => props.setPasswordError(validatePassword(props.password))}
            secureTextEntry={!props.showPassword}
            autoComplete="new-password"
            returnKeyType="next"
            accessibilityLabel="Password"
          />
          <Pressable
            onPress={() => props.setShowPassword(!props.showPassword)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={props.showPassword ? "Hide password" : "Show password"}
          >
            <Ionicons
              name={props.showPassword ? "eye-outline" : "eye-off-outline"}
              size={20}
              color={props.theme.textMuted}
            />
          </Pressable>
        </View>
        {!!props.passwordError && (
          <Text className="text-xs text-red-500 ml-1">{props.passwordError}</Text>
        )}
      </View>

      <View className="gap-1.5">
        <Text className="text-xs font-bold tracking-widest uppercase ml-1 text-on-surface-soft dark:text-on-surface-soft-dark">
          Confirm Password
        </Text>
        <View className="flex-row items-center h-14 rounded-xl px-4 gap-2 bg-surface-input dark:bg-surface-input-dark">
          <Ionicons
            name="lock-closed-outline"
            size={18}
            color={props.theme.textMuted}
          />
          <TextInput
            className="flex-1 text-base font-medium text-on-surface dark:text-on-surface-dark"
            placeholder="Re-enter your password"
            placeholderTextColor={props.theme.textMuted}
            value={props.confirmPassword}
            onChangeText={(text) => {
              props.setConfirmPassword(text);
              props.setConfirmPasswordError(getConfirmPasswordError(props.password, text));
            }}
            secureTextEntry={!props.showConfirmPassword}
            autoComplete="new-password"
            returnKeyType="next"
            accessibilityLabel="Confirm password"
          />
          <Pressable
            onPress={() => props.setShowConfirmPassword(!props.showConfirmPassword)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={
              props.showConfirmPassword
                ? "Hide confirm password"
                : "Show confirm password"
            }
          >
            <Ionicons
              name={props.showConfirmPassword ? "eye-outline" : "eye-off-outline"}
              size={20}
              color={props.theme.textMuted}
            />
          </Pressable>
        </View>
        {!!props.confirmPasswordError && (
          <Text className="text-xs text-red-500 ml-1">{props.confirmPasswordError}</Text>
        )}
      </View>

      <View className="gap-1.5 pt-2">
        <Text className="text-xs font-bold tracking-widest uppercase ml-1 text-on-surface-soft dark:text-on-surface-soft-dark">
          {skillLabel}
        </Text>
        <SubjectExpertisePicker
          selected={props.selectedSubjects}
          onChange={(subjects) => {
            props.setSelectedSubjects(subjects);
            if (subjects.length > 0) {
              props.setSkillsError("");
            }
          }}
          role={props.role}
        />
        {!!props.skillsError && (
          <Text className="text-xs text-red-500 ml-1">{props.skillsError}</Text>
        )}
      </View>

      <View className="gap-1.5">
        <Pressable
          onPress={() => {
            props.setTerms(!props.terms);
            props.setTermsError("");
          }}
          className="flex-row items-start gap-3"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: props.terms }}
          accessibilityLabel="I agree to the Terms of Service and Privacy Policy"
        >
          <View
            className="w-5 h-5 rounded mt-0.5 items-center justify-center border"
            style={{
              backgroundColor: props.terms ? props.theme.primary : "transparent",
              borderColor: props.terms ? props.theme.primary : props.theme.textMuted,
            }}
          >
            {props.terms ? <Ionicons name="checkmark" size={13} color="white" /> : null}
          </View>
          <Text className="flex-1 text-sm font-medium text-on-surface dark:text-on-surface-dark leading-snug">
            I agree to the <Text className="text-primary dark:text-primary-dim">Terms of Service</Text> and <Text className="text-primary dark:text-primary-dim">Privacy Policy</Text>.
          </Text>
        </Pressable>
        {!!props.termsError && (
          <Text className="text-xs text-red-500 ml-8">{props.termsError}</Text>
        )}
      </View>

      <View className="gap-5 pt-4">
        <TouchableOpacity
          className="w-full h-16 rounded-xl items-center justify-center flex-row gap-3 bg-primary dark:bg-primary-dim"
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="Complete registration"
          onPress={() => void props.onSubmit()}
          disabled={props.isSubmitting}
        >
          <Text className="text-white font-bold text-lg">
            {props.isSubmitting ? "Creating Account..." : "Complete Registration"}
          </Text>
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
            onPress={() => router.replace("/login")}
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
  );
}

export default function RegisterScreenContent() {
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";
  const theme = Colors[colorScheme];

  const [role, setRole] = useState<"mentor" | "mentee">("mentor");
  const [preferredUsername, setPreferredUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [displayNameError, setDisplayNameError] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [skillsError, setSkillsError] = useState("");
  const [terms, setTerms] = useState(false);
  const [termsError, setTermsError] = useState("");

  const registerMutation = useRegisterMutation();
  const updateUser = useAuthStore((state) => state.updateUser);

  const handleSubmit = async () => {
    const input: RegistrationInput = {
      preferredUsername,
      displayName,
      email,
      password,
      confirmPassword,
      role,
      selectedSubjects,
      termsAccepted: terms,
    };

    const validationErrors = validateRegistrationInput(input);
    if (validationErrors) {
      applyValidationErrors(validationErrors, {
        setUsernameError,
        setDisplayNameError,
        setEmailError,
        setPasswordError,
        setConfirmPasswordError,
        setSkillsError,
        setTermsError,
      });
      return;
    }

    try {
      const generatedUsername = await completeRegistration({
        input,
        registerAccount: registerMutation,
        updateUser,
      });

      if (generatedUsername !== preferredUsername.trim()) {
        Alert.alert(
          "Username Preference Saved",
          `Your current username is @${generatedUsername}. Preferred username support is pending in backend profile update APIs.`,
        );
      }

      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert(
        "Registration Failed",
        error instanceof Error
          ? error.message
          : "Could not create your account.",
      );
    }
  };

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-surface-dark" : "bg-surface"}`}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
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
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 8,
            paddingBottom: 48,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-8">
            <Text
              className="text-4xl font-extrabold leading-tight tracking-tight mb-2"
              accessibilityRole="header"
            >
              <Text className="text-on-surface dark:text-on-surface-dark">
                Join the{" "}
              </Text>
              <Text className="text-primary dark:text-primary-dim">Circle.</Text>
            </Text>
            <Text className="text-base text-on-surface-soft dark:text-on-surface-soft-dark">
              Every expert was once a beginner. Start your journey today.
            </Text>
          </View>

          <RegisterForm
            role={role}
            setRole={setRole}
            preferredUsername={preferredUsername}
            setPreferredUsername={setPreferredUsername}
            usernameError={usernameError}
            setUsernameError={setUsernameError}
            displayName={displayName}
            setDisplayName={setDisplayName}
            displayNameError={displayNameError}
            setDisplayNameError={setDisplayNameError}
            email={email}
            setEmail={setEmail}
            emailError={emailError}
            setEmailError={setEmailError}
            password={password}
            setPassword={setPassword}
            passwordError={passwordError}
            setPasswordError={setPasswordError}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            confirmPasswordError={confirmPasswordError}
            setConfirmPasswordError={setConfirmPasswordError}
            showConfirmPassword={showConfirmPassword}
            setShowConfirmPassword={setShowConfirmPassword}
            selectedSubjects={selectedSubjects}
            setSelectedSubjects={setSelectedSubjects}
            skillsError={skillsError}
            setSkillsError={setSkillsError}
            terms={terms}
            setTerms={setTerms}
            termsError={termsError}
            setTermsError={setTermsError}
            onSubmit={handleSubmit}
            isSubmitting={registerMutation.isPending}
            theme={theme}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
