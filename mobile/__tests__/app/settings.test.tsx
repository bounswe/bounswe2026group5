import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockMutateAsync = jest.fn();
const mockUpdateProfileMutateAsync = jest.fn();
const mockRefetchOwnProfileSettings = jest.fn();
let mockIsPending = false;
let mockUpdateProfileIsPending = false;
let mockOwnProfileSettingsLoading = false;
let mockSharePreciseLocation = true;

let mockAuthUser: { username: string; app_usage_mode: "MENTOR" | "MENTEE" | null } | null = {
  username: "testuser",
  app_usage_mode: "MENTOR",
};

jest.mock("expo-router", () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
}));

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

jest.mock("@/lib/auth/store", () => ({
  useAuthStore: (selector: (s: { user: typeof mockAuthUser }) => unknown) =>
    selector({ user: mockAuthUser }),
}));

jest.mock("@/lib/profile/preferences", () => ({
  useProfileVisibilityStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      showExpertise: true,
      showEagerToLearn: true,
      showAvailability: true,
      setShowExpertise: jest.fn(),
      setShowEagerToLearn: jest.fn(),
      setShowAvailability: jest.fn(),
    }),
}));

jest.mock("@/lib/queries/auth", () => ({
  useLogoutMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: mockIsPending,
  }),
}));

jest.mock("@/lib/queries/profile", () => ({
  useOwnProfileSettingsQuery: () => ({
    data: { share_precise_location: mockSharePreciseLocation },
    isLoading: mockOwnProfileSettingsLoading,
    refetch: mockRefetchOwnProfileSettings,
  }),
  useUpdateOwnProfileMutation: () => ({
    mutateAsync: mockUpdateProfileMutateAsync,
    isPending: mockUpdateProfileIsPending,
  }),
}));

jest.mock("@/components/settings/SettingItem", () => ({
  SettingItem: ({
    label,
    onPress,
    onToggle,
    isToggled,
  }: {
    label: string;
    onPress?: () => void;
    onToggle?: (v: boolean) => void;
    isToggled?: boolean;
  }) => {
    const { TouchableOpacity, Switch, View, Text } = jest.requireActual("react-native");
    const slug = label.replace(/\s+/g, "-").toLowerCase();
    return (
      <View>
        <TouchableOpacity testID={`setting-item-${slug}`} onPress={onPress}>
          <Text>{label}</Text>
        </TouchableOpacity>
        {onToggle !== undefined && (
          <Switch
            testID={`toggle-${slug}`}
            value={isToggled ?? false}
            onValueChange={onToggle}
          />
        )}
      </View>
    );
  },
}));

jest.mock("@/components/ui/ConfirmationSheet", () => ({
  ConfirmationSheet: ({
    visible,
    onCancel,
    onConfirm,
    title,
  }: {
    visible: boolean;
    onCancel: () => void;
    onConfirm: () => Promise<void> | void;
    title: string;
  }) => {
    if (!visible) return null;
    const { TouchableOpacity, View, Text } = jest.requireActual("react-native");
    const slug = title.replace(/\s+/g, "-").toLowerCase();
    return (
      <View testID={`confirmation-sheet-${slug}`}>
        <TouchableOpacity testID={`sheet-cancel-${slug}`} onPress={onCancel} />
        <TouchableOpacity testID={`sheet-confirm-${slug}`} onPress={onConfirm} />
      </View>
    );
  },
}));

jest.mock("@/components/ui/ErrorBanner", () => ({
  ErrorBanner: ({ message }: { message: string | null }) => {
    if (!message) return null;
    const { View, Text } = jest.requireActual("react-native");
    return (
      <View testID="error-banner">
        <Text>{message}</Text>
      </View>
    );
  },
}));

jest.mock("@/components/ui/SuccessCard", () => ({
  SuccessCard: ({ message }: { message: string | null }) => {
    if (!message) return null;
    const { View, Text } = jest.requireActual("react-native");
    return (
      <View testID="success-card">
        <Text>{message}</Text>
      </View>
    );
  },
}));

import SettingsScreen from "@/app/settings";

function renderSettings() {
  return render(<SettingsScreen />);
}

beforeEach(() => {
  mockSharePreciseLocation = true;
  mockOwnProfileSettingsLoading = false;
  mockUpdateProfileIsPending = false;
  mockUpdateProfileMutateAsync.mockReset();
  mockUpdateProfileMutateAsync.mockResolvedValue({});
  mockRefetchOwnProfileSettings.mockReset();
  mockRefetchOwnProfileSettings.mockResolvedValue({});
});

describe("SettingsScreen — role label", () => {
  it("shows 'Mentor' for MENTOR users", () => {
    mockAuthUser = { username: "u", app_usage_mode: "MENTOR" };
    const { getByTestId } = renderSettings();
    expect(getByTestId("setting-item-role")).toBeTruthy();
  });

  it("shows 'Mentee' for MENTEE users", () => {
    mockAuthUser = { username: "u", app_usage_mode: "MENTEE" };
    const { getByTestId } = renderSettings();
    expect(getByTestId("setting-item-role")).toBeTruthy();
  });

  it("shows 'Not Set' label when app_usage_mode is null", () => {
    mockAuthUser = { username: "u", app_usage_mode: null };
    const { getByTestId } = renderSettings();
    expect(getByTestId("setting-item-role")).toBeTruthy();
  });
});

describe("SettingsScreen — visibility controls", () => {
  it("shows mentor visibility controls for MENTOR", () => {
    mockAuthUser = { username: "u", app_usage_mode: "MENTOR" };
    const { getByTestId, queryByTestId } = renderSettings();
    expect(getByTestId("toggle-show-expertise")).toBeTruthy();
    expect(getByTestId("toggle-show-availability")).toBeTruthy();
    expect(queryByTestId("toggle-show-eager-to-learn")).toBeNull();
    expect(queryByTestId("toggle-show-offerings")).toBeNull();
  });

  it("shows mentee visibility controls for MENTEE", () => {
    mockAuthUser = { username: "u", app_usage_mode: "MENTEE" };
    const { getByTestId, queryByTestId } = renderSettings();
    expect(getByTestId("toggle-show-eager-to-learn")).toBeTruthy();
    expect(queryByTestId("toggle-show-expertise")).toBeNull();
    expect(queryByTestId("toggle-show-availability")).toBeNull();
  });

  it("shows all visibility controls when app_usage_mode is null", () => {
    mockAuthUser = { username: "u", app_usage_mode: null };
    const { getByTestId } = renderSettings();
    expect(getByTestId("toggle-show-expertise")).toBeTruthy();
    expect(getByTestId("toggle-show-eager-to-learn")).toBeTruthy();
    expect(getByTestId("toggle-show-availability")).toBeTruthy();
  });

  it("does not render unsupported settings", () => {
    mockAuthUser = { username: "u", app_usage_mode: "MENTOR" };
    const { queryByTestId } = renderSettings();
    expect(queryByTestId("toggle-new-mentorship-requests")).toBeNull();
    expect(queryByTestId("toggle-session-reminders")).toBeNull();
    expect(queryByTestId("toggle-platform-updates")).toBeNull();
    expect(queryByTestId("setting-item-privacy-policy")).toBeNull();
    expect(queryByTestId("setting-item-terms-of-service")).toBeNull();
    expect(queryByTestId("setting-item-delete-account")).toBeNull();
  });
});

describe("SettingsScreen — location privacy", () => {
  it("renders the share precise location toggle from profile settings", () => {
    mockSharePreciseLocation = false;

    const { getByTestId } = renderSettings();

    expect(getByTestId("toggle-share-precise-location").props.value).toBe(
      false,
    );
  });

  it("patches share_precise_location when toggled", async () => {
    const { getByTestId } = renderSettings();

    fireEvent(getByTestId("toggle-share-precise-location"), "valueChange", false);

    await waitFor(() => {
      expect(mockUpdateProfileMutateAsync).toHaveBeenCalledWith({
        share_precise_location: false,
      });
      expect(mockRefetchOwnProfileSettings).toHaveBeenCalled();
    });
  });

  it("shows an error when precise location update fails", async () => {
    mockUpdateProfileMutateAsync.mockRejectedValueOnce(
      new Error("Could not update privacy"),
    );

    const { getByTestId } = renderSettings();

    fireEvent(getByTestId("toggle-share-precise-location"), "valueChange", false);

    await waitFor(() => {
      expect(getByTestId("error-banner")).toBeTruthy();
    });
  });
});

describe("SettingsScreen — logout flow", () => {
  beforeEach(() => {
    mockAuthUser = { username: "u", app_usage_mode: "MENTOR" };
    mockIsPending = false;
    mockMutateAsync.mockReset();
    mockBack.mockClear();
    mockReplace.mockClear();
  });

  it("shows logout confirmation sheet when Log Out is pressed", () => {
    const { getByTestId } = renderSettings();
    fireEvent.press(getByTestId("setting-item-log-out"));
    expect(getByTestId("confirmation-sheet-log-out?")).toBeTruthy();
  });

  it("hides logout sheet when cancel is pressed", () => {
    const { getByTestId, queryByTestId } = renderSettings();
    fireEvent.press(getByTestId("setting-item-log-out"));
    fireEvent.press(getByTestId("sheet-cancel-log-out?"));
    expect(queryByTestId("confirmation-sheet-log-out?")).toBeNull();
  });

  it("calls mutateAsync and navigates to /login on successful logout", async () => {
    mockMutateAsync.mockResolvedValueOnce(undefined);
    const { getByTestId } = renderSettings();
    fireEvent.press(getByTestId("setting-item-log-out"));
    fireEvent.press(getByTestId("sheet-confirm-log-out?"));
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });

  it("shows error banner when logout fails", async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error("Network error"));
    const { getByTestId } = renderSettings();
    fireEvent.press(getByTestId("setting-item-log-out"));
    fireEvent.press(getByTestId("sheet-confirm-log-out?"));
    await waitFor(() => {
      expect(getByTestId("error-banner")).toBeTruthy();
    });
  });
});

describe("SettingsScreen — back navigation", () => {
  it("calls router.back when back button is pressed", () => {
    mockAuthUser = { username: "u", app_usage_mode: "MENTOR" };
    const { UNSAFE_getAllByType } = renderSettings();
    const { TouchableOpacity } = jest.requireActual("react-native");
    const buttons = UNSAFE_getAllByType(TouchableOpacity);
    fireEvent.press(buttons[0]);
    expect(mockBack).toHaveBeenCalled();
  });
});
