import MentorProfileScreen from "@/app/(tabs)/user/[username]/index";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";

const mockBack = jest.fn();
const mockCreateRequestMutateAsync = jest.fn();
const mockResendMutateAsync = jest.fn();
const mockSubmitReportMutateAsync = jest.fn();
const mockAvailabilityRefetch = jest.fn();
const mockBookSlotMutateAsync = jest.fn();
const mockToastSuccess = jest.fn();
let mockUsernameParam: string | undefined = "mentor_ada";
let mockAuthUser = {
  username: "mentee_bora",
  app_usage_mode: "MENTEE",
  is_email_verified: false,
};
let mockMatches: any[] = [];
let mockRequests: any[] = [];
let mockAvailabilitySlots: any[] = [
  {
    id: "slot-1",
    date: "2099-04-29",
    startTime: "09:00:00",
    endTime: "10:00:00",
    is_booked: false,
  },
];
let mockReviewsData: any = {
  count: 0,
  page: 1,
  pageSize: 6,
  results: [],
};

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ username: mockUsernameParam }),
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
  }),
}));

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

jest.mock("@/components/ui/ToastProvider", () => ({
  useToast: () => ({
    success: mockToastSuccess,
  }),
}));

jest.mock("@/lib/auth/store", () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      user: mockAuthUser,
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
    data: mockMatches,
  }),
  useMentorshipRequestsQuery: () => ({
    data: mockRequests,
  }),
  useBookAvailabilitySlotMutation: () => ({
    mutateAsync: mockBookSlotMutateAsync,
    isPending: false,
  }),
  useAvailabilitySlotsQuery: () => ({
    data: mockAvailabilitySlots,
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
    data: mockReviewsData,
    isLoading: false,
    isFetching: false,
    error: null,
  }),
  useProfilePostsQuery: () => ({
    data: {
      count: 1,
      results: [{ id: "post-1", content: "hello" }],
    },
    isLoading: false,
  }),
}));

jest.mock("@/lib/queries/reporting", () => ({
  useSubmitReportMutation: () => ({
    mutateAsync: mockSubmitReportMutateAsync,
    isPending: false,
  }),
}));

jest.mock("@/components/profile/ProfileHeader", () => ({
  ProfileHeader: ({ name }: { name: string }) => {
    const { Text } = jest.requireActual("react-native");
    return <Text>{name}</Text>;
  },
}));

jest.mock("@/components/profile/SkillsCloud", () => ({
  SkillsCloud: ({
    title,
    onViewAll,
  }: {
    title: string;
    onViewAll?: () => void;
  }) => {
    const { Text, TouchableOpacity, View } = jest.requireActual("react-native");
    return (
      <View>
        <Text>{title}</Text>
        <TouchableOpacity testID="view-all-skills" onPress={onViewAll}>
          <Text>View all skills</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

jest.mock("@/components/profile/ProfileReviews", () => ({
  ProfileReviews: () => null,
}));

jest.mock("@/components/profile/ViewAllSkillsModal", () => ({
  ViewAllSkillsModal: ({
    visible,
    title,
    onClose,
  }: {
    visible: boolean;
    title: string;
    onClose: () => void;
  }) => {
    if (!visible) return null;
    const { Text, TouchableOpacity, View } = jest.requireActual("react-native");
    return (
      <View testID="skills-modal">
        <Text>{title}</Text>
        <TouchableOpacity testID="close-skills-modal" onPress={onClose}>
          <Text>Close skills</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

jest.mock("@/components/ui/ConfirmationSheet", () => ({
  ConfirmationSheet: ({
    visible,
    onCancel,
    onConfirm,
  }: {
    visible: boolean;
    onCancel: () => void;
    onConfirm: () => void;
  }) => {
    if (!visible) return null;
    const { Text, TouchableOpacity, View } = jest.requireActual("react-native");
    return (
      <View testID="booking-confirmation">
        <TouchableOpacity testID="cancel-booking" onPress={onCancel}>
          <Text>Cancel booking</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="confirm-booking" onPress={onConfirm}>
          <Text>Confirm booking</Text>
        </TouchableOpacity>
      </View>
    );
  },
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
      <>
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
        <TouchableOpacity
          testID="slot-missing-id"
          onPress={() =>
            onSelectSlot({
              day: "Wednesday",
              time: "11:00 - 12:00",
            })
          }
        >
          <Text>11:00 - 12:00</Text>
        </TouchableOpacity>
      </>
    );
  },
}));

describe("MentorProfileScreen email verification gate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsernameParam = "mentor_ada";
    mockAuthUser = {
      username: "mentee_bora",
      app_usage_mode: "MENTEE",
      is_email_verified: false,
    };
    mockMatches = [];
    mockRequests = [];
    mockAvailabilitySlots = [
      {
        id: "slot-1",
        date: "2099-04-29",
        startTime: "09:00:00",
        endTime: "10:00:00",
        is_booked: false,
      },
    ];
    mockReviewsData = {
      count: 0,
      page: 1,
      pageSize: 6,
      results: [],
    };
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
    mockBookSlotMutateAsync.mockResolvedValue({});
    mockSubmitReportMutateAsync.mockResolvedValue({});
  });

  it("shows an error when the username route param is missing", async () => {
    mockUsernameParam = undefined;

    const { findByText } = render(<MentorProfileScreen />);

    expect(await findByText("Missing mentor username.")).toBeTruthy();
  });

  it("shows profile load failures", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    const { findByText } = render(<MentorProfileScreen />);

    expect(await findByText("Failed to load mentor profile.")).toBeTruthy();
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

  it("sends a mentorship request successfully", async () => {
    mockCreateRequestMutateAsync.mockResolvedValueOnce({});

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

    await waitFor(() => {
      expect(mockCreateRequestMutateAsync).toHaveBeenCalledWith({
        mentor_username: "mentor_ada",
        slot_id: "slot-1",
        cover_letter: "I want to practice frontend architecture.",
      });
    });
    expect(await findByText("Request sent successfully.")).toBeTruthy();
    expect(mockAvailabilityRefetch).toHaveBeenCalledTimes(1);
  });

  it("requires a meaningful cover letter before submitting", async () => {
    const { findByText, getByTestId, getByPlaceholderText } = render(
      <MentorProfileScreen />,
    );

    expect(await findByText("Ada Mentor")).toBeTruthy();

    fireEvent.press(getByTestId("slot-slot-1"));
    fireEvent.changeText(
      getByPlaceholderText("Describe what you want to learn in this session"),
      "short",
    );
    fireEvent.press(getByTestId("send-mentorship-request-button"));

    expect(
      await findByText(
        "Please provide at least 10 characters about what you want to discuss.",
      ),
    ).toBeTruthy();
    expect(mockCreateRequestMutateAsync).not.toHaveBeenCalled();
  });

  it("prevents mentor-mode viewers from sending requests", async () => {
    mockAuthUser = {
      username: "mentor_viewer",
      app_usage_mode: "MENTOR",
      is_email_verified: true,
    };

    const { findByText, getByTestId, queryByText } = render(
      <MentorProfileScreen />,
    );

    expect(await findByText("Ada Mentor")).toBeTruthy();
    expect(
      queryByText("Enable mentee mode in Settings to send requests."),
    ).toBeNull();

    fireEvent.press(getByTestId("slot-slot-1"));
    expect(mockCreateRequestMutateAsync).not.toHaveBeenCalled();
  });

  it("shows an error when selected availability has no slot id", async () => {
    const { findByText, getByTestId } = render(<MentorProfileScreen />);

    expect(await findByText("Ada Mentor")).toBeTruthy();

    fireEvent.press(getByTestId("slot-missing-id"));

    expect(
      await findByText(
        "Selected slot could not be resolved. Please refresh and try again.",
      ),
    ).toBeTruthy();
  });

  it("shows generic request and resend failures", async () => {
    mockCreateRequestMutateAsync.mockRejectedValueOnce(new Error("Request failed."));
    mockResendMutateAsync.mockRejectedValueOnce(new Error("Resend failed."));

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

    expect(await findByText("Request failed.")).toBeTruthy();

    mockCreateRequestMutateAsync.mockRejectedValueOnce(
      Object.assign(
        new Error("Please verify your email address to perform this action."),
        { status: 403 },
      ),
    );
    fireEvent.press(getByTestId("send-mentorship-request-button"));
    expect(await findByText(/Verify your email before sending/)).toBeTruthy();

    fireEvent.press(getByTestId("profile-resend-verification-button"));
    expect(await findByText("Resend failed.")).toBeTruthy();
  });

  it("opens and closes the skills modal", async () => {
    const { findByText, getByTestId, queryByTestId } = render(
      <MentorProfileScreen />,
    );

    expect(await findByText("Ada Mentor")).toBeTruthy();

    fireEvent.press(getByTestId("view-all-skills"));
    expect(getByTestId("skills-modal")).toBeTruthy();

    fireEvent.press(getByTestId("close-skills-modal"));
    expect(queryByTestId("skills-modal")).toBeNull();
  });

  it("submits a profile report from the flag action", async () => {
    const { findByText, getByTestId, getByPlaceholderText } = render(
      <MentorProfileScreen />,
    );

    expect(await findByText("Ada Mentor")).toBeTruthy();

    fireEvent.press(getByTestId("profile-report-button"));
    expect(await findByText("Report Ada Mentor")).toBeTruthy();

    fireEvent.press(getByTestId("report-reason-HARASSMENT"));
    fireEvent.changeText(
      getByPlaceholderText("Additional details (optional)"),
      "Repeatedly sending hostile profile messages.",
    );
    fireEvent.press(getByTestId("submit-report-button"));

    await waitFor(() => {
      expect(mockSubmitReportMutateAsync).toHaveBeenCalledWith({
        reported_username: "mentor_ada",
        reason: "HARASSMENT",
        description: "Repeatedly sending hostile profile messages.",
      });
    });
    expect(
      await findByText(
        "Report submitted. Thank you for helping keep the community safe.",
      ),
    ).toBeTruthy();
  });

  it("does not show the profile report action for your own profile", async () => {
    mockUsernameParam = "mentee_bora";
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        username: "mentee_bora",
        full_name: "Bora Mentee",
        bio: "Learning mobile engineering.",
        hidden: false,
        picture_url: "",
        title: "Learner",
        show_initials_only: false,
        app_usage_mode: "MENTEE",
        skills: ["React Native"],
        average_rating: "0",
        total_mentee_count: 0,
      }),
    }) as unknown as typeof fetch;

    const { findByText, queryByTestId } = render(<MentorProfileScreen />);

    expect(await findByText("Bora Mentee")).toBeTruthy();
    expect(queryByTestId("profile-report-button")).toBeNull();
  });

  it("books sessions for connected mentees and handles booking failures", async () => {
    mockMatches = [
      {
        id: "match-1",
        is_active: true,
        mentor: { username: "mentor_ada" },
        mentee: { username: "mentee_bora" },
      },
    ];

    const { findByText, getByTestId, queryByText } = render(
      <MentorProfileScreen />,
    );

    expect(await findByText("Ada Mentor")).toBeTruthy();

    fireEvent.press(getByTestId("slot-slot-1"));
    fireEvent.press(getByTestId("send-mentorship-request-button"));
    expect(getByTestId("booking-confirmation")).toBeTruthy();

    fireEvent.press(getByTestId("cancel-booking"));
    fireEvent.press(getByTestId("send-mentorship-request-button"));
    fireEvent.press(getByTestId("confirm-booking"));

    await waitFor(() => {
      expect(mockBookSlotMutateAsync).toHaveBeenCalledWith({
        mentorUsername: "mentor_ada",
        slotId: "slot-1",
      });
    });
    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Session booked successfully.",
    );
    expect(queryByText("Session booked successfully.")).toBeNull();

    mockBookSlotMutateAsync.mockRejectedValueOnce(new Error("Booking failed."));
    fireEvent.press(getByTestId("slot-slot-1"));
    fireEvent.press(getByTestId("send-mentorship-request-button"));
    fireEvent.press(getByTestId("confirm-booking"));

    expect(await findByText("Booking failed.")).toBeTruthy();
  });

  it("navigates to the posts route when 'View All' is pressed in the posts preview", async () => {
    const { findByText, getByTestId } = render(<MentorProfileScreen />);

    expect(await findByText("Ada Mentor")).toBeTruthy();

    fireEvent.press(getByTestId("view-all-posts-button"));

    expect(mockPush).toHaveBeenCalledWith("/(tabs)/user/mentor_ada/posts");
  });
});
