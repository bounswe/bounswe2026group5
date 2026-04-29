import MentorProfileScreen from "@/app/(tabs)/user/[username]";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";

const mockBack = jest.fn();
const mockCreateRequestMutateAsync = jest.fn();
const mockResendMutateAsync = jest.fn();
const mockAvailabilityRefetch = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ username: "mentor_ada" }),
  useRouter: () => ({
    back: mockBack,
  }),
}));

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

jest.mock("@/lib/auth/store", () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      user: {
        username: "mentee_bora",
        app_usage_mode: "MENTEE",
        is_email_verified: false,
      },
    }),
}));

jest.mock("@/lib/queries/auth", () => ({
  isEmailVerificationRequiredError: (error: unknown) =>
    error instanceof Error &&
    "status" in error &&
    error.status === 403 &&
    error.message === "Please verify your email address to perform this action.",
  useResendEmailVerificationMutation: () => ({
    mutateAsync: mockResendMutateAsync,
    isPending: false,
  }),
}));

jest.mock("@/lib/queries/mentorship", () => ({
  useCreateMentorshipRequestMutation: () => ({
    mutateAsync: mockCreateRequestMutateAsync,
    isPending: false,
  }),
  useMentorshipMatchesQuery: () => ({
    data: [],
  }),
  useMentorshipRequestsQuery: () => ({
    data: [],
  }),
  useBookAvailabilitySlotMutation: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
  useAvailabilitySlotsQuery: () => ({
    data: [
      {
        id: "slot-1",
        date: "2099-04-29",
        startTime: "09:00:00",
        endTime: "10:00:00",
        is_booked: false,
      },
    ],
    isLoading: false,
    refetch: mockAvailabilityRefetch,
  }),
}));

jest.mock("@/lib/queries/profile", () => ({
  useProfileRatingQuery: () => ({
    data: {
      average_rating: "4.8",
      review_count: 12,
    },
  }),
  useProfileReviewsQuery: () => ({
    data: {
      count: 0,
      page: 1,
      pageSize: 6,
      results: [],
    },
    isLoading: false,
    isFetching: false,
    error: null,
  }),
}));

jest.mock("@/components/profile/ProfileHeader", () => ({
  ProfileHeader: ({ name }: { name: string }) => {
    const { Text } = jest.requireActual("react-native");
    return <Text>{name}</Text>;
  },
}));

jest.mock("@/components/profile/SkillsCloud", () => ({
  SkillsCloud: ({ title }: { title: string }) => {
    const { Text } = jest.requireActual("react-native");
    return <Text>{title}</Text>;
  },
}));

jest.mock("@/components/profile/ProfileReviews", () => ({
  ProfileReviews: () => null,
}));

jest.mock("@/components/profile/ViewAllSkillsModal", () => ({
  ViewAllSkillsModal: () => null,
}));

jest.mock("@/components/ui/ConfirmationSheet", () => ({
  ConfirmationSheet: () => null,
}));

jest.mock("@/components/profile/AvailabilityPreview", () => ({
  AvailabilityPreview: ({
    onSelectSlot,
  }: {
    onSelectSlot: (slot: {
      day: string;
      time: string;
      slotId?: string;
    }) => void;
  }) => {
    const { TouchableOpacity, Text } = jest.requireActual("react-native");
    return (
      <TouchableOpacity
        testID="slot-slot-1"
        onPress={() =>
          onSelectSlot({
            day: "Wednesday",
            time: "09:00 - 10:00",
            slotId: "slot-1",
          })
        }
      >
        <Text>09:00 - 10:00</Text>
      </TouchableOpacity>
    );
  },
}));

describe("MentorProfileScreen email verification gate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        username: "mentor_ada",
        full_name: "Ada Mentor",
        bio: "I mentor frontend engineers.",
        hidden: false,
        picture_url: "",
        title: "Senior Engineer",
        show_initials_only: false,
        app_usage_mode: "MENTOR",
        skills: ["React"],
        average_rating: "4.8",
        total_mentee_count: 3,
      }),
    }) as unknown as typeof fetch;
    const verificationError = new Error(
      "Please verify your email address to perform this action.",
    ) as Error & { status: number };
    verificationError.status = 403;
    mockCreateRequestMutateAsync.mockRejectedValue(verificationError);
    mockResendMutateAsync.mockResolvedValue({
      detail: "If your email is unverified, a new verification link has been sent.",
    });
  });

  it("shows a verification-specific mentorship request error and resends email", async () => {
    const { findByText, getByTestId, getByPlaceholderText } = render(
      <MentorProfileScreen />,
    );

    expect(await findByText("Ada Mentor")).toBeTruthy();

    fireEvent.press(getByTestId("slot-slot-1"));
    fireEvent.changeText(
      getByPlaceholderText("Describe what you want to learn in this session"),
      "I want to practice frontend architecture.",
    );
    fireEvent.press(getByTestId("send-mentorship-request-button"));

    expect(
      await findByText(
        "Verify your email before sending mentorship requests. You can resend the verification email from here.",
      ),
    ).toBeTruthy();
    expect(getByTestId("profile-resend-verification-button")).toBeTruthy();

    fireEvent.press(getByTestId("profile-resend-verification-button"));

    await waitFor(() => {
      expect(mockResendMutateAsync).toHaveBeenCalledTimes(1);
    });
    expect(
      await findByText(
        "If your email is unverified, a new verification link has been sent.",
      ),
    ).toBeTruthy();
  });
});
