import ProfileScreen from "@/app/(tabs)/profile/index";
import { useAvatarVersionStore } from "@/lib/profile/avatarVersion";
import { fireEvent, render, waitFor, act } from "@testing-library/react-native";
import React from "react";
import { Alert } from "react-native";

const mockMatchesQuery = jest.fn();
const mockAvailabilityQuery = jest.fn();
const mockMyCommunitiesQuery = jest.fn();
const mockUpdateProfileMutateAsync = jest.fn();
const mockUploadProfilePicture = jest.fn();
const mockDeleteProfilePicture = jest.fn();
let mockMappedWorkshops: any[] = [];
let mockAuthUser = {
  username: "Ali Aydin",
  app_usage_mode: "MENTOR",
};
const mockLaunchImageLibraryAsync = jest.fn();

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: (...args: unknown[]) =>
    mockLaunchImageLibraryAsync(...args),
}));
jest.mock("@/components/notifications/NotificationBell", () => ({
  NotificationBell: () => null,
}));

jest.mock("@/lib/queries/mentorship", () => {
  const actual = jest.requireActual<Record<string, unknown>>(
    "@/lib/queries/mentorship",
  );
  return {
    ...actual,
    useAvailabilitySlotsQuery: () => mockAvailabilityQuery(),
    useMentorshipMatchesQuery: () => mockMatchesQuery(),
    useMentorshipRequestsQuery: () => ({ data: [] }),
    useCreateAvailabilitySlotMutation: () => ({
      mutateAsync: jest.fn(),
      isPending: false,
    }),
    useDeleteAvailabilitySlotMutation: () => ({
      mutateAsync: jest.fn(),
      isPending: false,
    }),
    useRespondToMentorshipRequestMutation: () => ({
      mutateAsync: jest.fn(),
      isPending: false,
    }),
  };
});

jest.mock("@/lib/auth/store", () => ({
  useAuthStore: (selector: (state: any) => unknown) =>
    selector({
      user: mockAuthUser,
    }),
}));

jest.mock("@/lib/queries/profile", () => ({
  useProfileRatingQuery: () => ({
    data: {
      average_rating: "4.9",
      review_count: 18,
    },
  }),
  useProfileReviewsQuery: () => ({
    data: {
      count: 1,
      page: 1,
      pageSize: 6,
      results: [
        {
          rating: 5,
          text: "Very helpful mentor.",
          created_at: "2026-04-21T12:00:00Z",
        },
      ],
    },
    isLoading: false,
    isFetching: false,
    error: null,
  }),
  useUpdateOwnProfileMutation: () => ({
    mutateAsync: mockUpdateProfileMutateAsync,
    isPending: false,
  }),
  useCreateProfilePostMutation: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
  useUpdateProfilePostMutation: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
  useDeleteProfilePostMutation: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
  useProfilePostsQuery: () => ({
    data: { count: 0, results: [] },
    isLoading: false,
  }),
}));

jest.mock("@/lib/queries/communityPosts", () => ({
  useUpdateCommunityPostMutation: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
  useDeleteCommunityPostMutation: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
}));

jest.mock("@/lib/queries/uploads", () => ({
  useUploadProfilePictureMutation: () => ({
    mutateAsync: (...args: unknown[]) => mockUploadProfilePicture(...args),
    isPending: false,
  }),
  useDeleteProfilePictureMutation: () => ({
    mutateAsync: (...args: unknown[]) => mockDeleteProfilePicture(...args),
    isPending: false,
  }),
  useUploadProfileAudioMutation: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
  useDeleteProfileAudioMutation: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
  useUploadProfileVideoMutation: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
  useDeleteProfileVideoMutation: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
}));

jest.mock("@/lib/queries/communityTags", () => ({
  useMyCommunityTagsQuery: (username?: string) =>
    mockMyCommunitiesQuery(username),
  useCommunityTaggableUsersQuery: () => ({
    data: { count: 0, results: [] },
    isLoading: false,
  }),
}));

jest.mock("@/lib/queries/workshops", () => ({
  mapWorkshopAttendanceToDashboard: () => mockMappedWorkshops,
  useMyWorkshopAttendanceQuery: () => ({
    data: { results: mockMappedWorkshops },
    isError: false,
    refetch: jest.fn(),
  }),
}));

const mockRouterPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

jest.spyOn(Alert, "alert");

describe("ProfileScreen Layout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAvatarVersionStore.setState({ versions: {} });
    mockAuthUser = {
      username: "Ali Aydin",
      app_usage_mode: "MENTOR",
    };
    mockMappedWorkshops = [];
    mockAvailabilityQuery.mockReturnValue({ data: undefined });
    mockMatchesQuery.mockReturnValue({ data: [] });
    mockMyCommunitiesQuery.mockReturnValue({ data: [] });
    mockUpdateProfileMutateAsync.mockResolvedValue({
      display_name: "Ali Aydin",
      bio: "Profile bio",
      picture_url: "https://cdn.example.com/current.jpg",
    });
    mockUploadProfilePicture.mockResolvedValue({
      detail: "Profile picture uploaded.",
      picture_url: "https://cdn.example.com/new-avatar.jpg",
    });
    mockDeleteProfilePicture.mockResolvedValue({
      detail: "Profile picture removed.",
      picture_url: "",
    });
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///tmp/avatar.jpg",
          fileName: "avatar.jpg",
          mimeType: "image/jpeg",
          width: 512,
          height: 512,
        },
      ],
    });

    (globalThis.fetch as jest.Mock) = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          full_name: "Ali Aydin",
          bio: "Profile bio",
          picture_url: "https://cdn.example.com/current.jpg",
          skills: ["React", "Testing"],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ name: "React" }, { name: "Testing" }],
      });
  });

  it("renders the user profile name", async () => {
    const { getByTestId } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByTestId("profile-name")).toBeTruthy();
    });
  });

  it("shows mentees section for mentor with active unique matches", async () => {
    mockMatchesQuery.mockReturnValue({
      data: [
        { id: "m-1", is_active: true, mentee: { username: "mentee-1" } },
        { id: "m-2", is_active: true, mentee: { username: "mentee-1" } },
        { id: "m-3", is_active: true, mentee: { username: "mentee-2" } },
        { id: "m-4", is_active: false, mentee: { username: "mentee-3" } },
      ],
    });

    const { getByTestId } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByTestId("mentees-section")).toBeTruthy();
      expect(getByTestId("mentees-count").props.children).toBe(2);
    });
  });

  it("renders mentor-only profile sections for mentor accounts", async () => {
    const { getByText, getAllByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByText("Ali Aydin")).toBeTruthy();
      expect(getByText("Availability")).toBeTruthy();
      expect(getByText("Mentees")).toBeTruthy();
      expect(getAllByText("Reviews").length).toBeGreaterThan(0);
      expect(getByText("Anonymous mentee")).toBeTruthy();
    });
  });

  it("renders joined communities separately from skills and opens detail", async () => {
    mockMyCommunitiesQuery.mockReturnValue({
      data: [
        {
          id: "tag-1",
          name: "Backend Guild",
          slug: "backend-guild",
          description: "",
          member_count: 4,
          created_at: "2026-04-20T00:00:00Z",
        },
      ],
    });

    const { getByTestId, getByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(mockMyCommunitiesQuery).toHaveBeenCalledWith("Ali Aydin");
      expect(getByTestId("profile-community-tags")).toBeTruthy();
      expect(getByText("Backend Guild")).toBeTruthy();
    });

    fireEvent.press(getByTestId("profile-community-backend-guild"));
    expect(mockRouterPush).toHaveBeenCalledWith(
      "/(tabs)/community/tag-1?from=community",
    );
  });

  it("shows mentor-only My Workshops and opens workshop detail", async () => {
    mockMappedWorkshops = [
      {
        id: "workshop-1",
        workshopId: "workshop-1",
        communityId: "tag-1",
        communityName: "Backend Guild",
        user: "Backend Guild",
        date: "Jun 10",
        rawDate: "2099-06-10",
        time: "13:30 - 15:00",
        status: "Upcoming",
        topic: "API Design Clinic",
        myRole: "Mentor",
        isWorkshop: true,
        workshopStatus: "SCHEDULED",
      },
    ];

    const { getByTestId, getByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByText("My Workshops")).toBeTruthy();
      expect(getByTestId("profile-workshops-rail")).toBeTruthy();
      expect(getByText("API Design Clinic")).toBeTruthy();
    });

    fireEvent.press(getByTestId("profile-workshop-card-workshop-1"));

    expect(mockRouterPush).toHaveBeenCalledWith(
      "/(tabs)/community/tag-1/workshops/workshop-1?from=profile",
    );
  });

  it("hides mentor-only sections for mentee accounts", async () => {
    mockAuthUser = {
      username: "Ece Yilmaz",
      app_usage_mode: "MENTEE",
    };
    globalThis.fetch = jest.fn() as unknown as typeof fetch;
    (globalThis.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          full_name: "Ece Yilmaz",
          bio: "Profile bio",
          picture_url: "",
          skills: ["React", "Testing"],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ name: "React" }, { name: "Testing" }],
      });

    const { queryByTestId, getByText, queryByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByText("Ece Yilmaz")).toBeTruthy();
      expect(queryByText("Availability")).toBeNull();
      expect(queryByText("Mentees")).toBeNull();
      expect(queryByText("Anonymous mentee")).toBeNull();
    });
  });

  it("navigates to settings screen when the settings icon is pressed", async () => {
    const { getByTestId } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByTestId("settings-button")).toBeTruthy();
    });

    fireEvent.press(getByTestId("settings-button"));
    expect(mockRouterPush).toHaveBeenCalledWith("/settings");
  });

  it("loads the current avatar and updates it after profile edit save", async () => {
    const { findByTestId, getByTestId } = render(<ProfileScreen />);

    expect(await findByTestId("profile-avatar-image")).toBeTruthy();

    fireEvent.press(getByTestId("profile-edit-button"));
    fireEvent.press(await findByTestId("avatar-picker-button"));
    expect(await findByTestId("avatar-preview")).toBeTruthy();
    
    await act(async () => {
      fireEvent.press(getByTestId("save-button"));
    });

    await waitFor(() => {
      expect(mockUpdateProfileMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          username: "Ali Aydin",
          display_name: "Ali Aydin",
          bio: "Profile bio",
        }),
      );
      expect(mockUploadProfilePicture).toHaveBeenCalledWith({
        uri: "file:///tmp/avatar.jpg",
        name: "avatar.jpg",
        type: "image/jpeg",
      });
      expect(getByTestId("profile-avatar-image").props.source.uri).toContain(
        "https://cdn.example.com/new-avatar.jpg",
      );
    });
  });

  it("opens the avatar image centered when the profile photo is pressed", async () => {
    const { findByTestId, getByTestId } = render(<ProfileScreen />);

    await findByTestId("profile-avatar-image");
    fireEvent.press(getByTestId("profile-avatar-button"));

    expect(getByTestId("profile-avatar-preview-image").props.source).toEqual({
      uri: "https://cdn.example.com/current.jpg",
    });
  });

  it("removes the current avatar from the edit modal", async () => {
    const { findByTestId, getByTestId, queryByTestId } = render(
      <ProfileScreen />,
    );

    await findByTestId("profile-avatar-image");

    fireEvent.press(getByTestId("profile-edit-button"));
    fireEvent.press(await findByTestId("avatar-remove-button"));

    // Handle Alert
    const [title, message, buttons] = (Alert.alert as jest.Mock).mock.calls[0];
    const removeButton = buttons!.find((b: any) => b.text === "Remove");
    
    await act(async () => {
      removeButton!.onPress!();
    });

    await act(async () => {
      fireEvent.press(getByTestId("save-button"));
    });

    await waitFor(() => {
      expect(mockUpdateProfileMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          picture_url: "",
        }),
      );
      expect(mockDeleteProfilePicture).toHaveBeenCalledTimes(1);
      expect(queryByTestId("profile-avatar-image")).toBeNull();
      expect(getByTestId("profile-avatar-fallback")).toBeTruthy();
    });
  });

  it("does not crash when profile fetch fails", async () => {
    (globalThis.fetch as jest.Mock) = jest
      .fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ name: "React" }],
      });

    const { getByTestId } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByTestId("profile-name")).toBeTruthy();
    });
  });

  it("shows zero mentees count when matches data is empty", async () => {
    mockMatchesQuery.mockReturnValue({ data: [] });

    const { getByTestId } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByTestId("mentees-count").props.children).toBe(0);
    });
  });

  it("counts only active matches for unique mentees", async () => {
    mockMatchesQuery.mockReturnValue({
      data: [
        { id: "m-1", is_active: true, mentee: { username: "mentee-a" } },
        { id: "m-2", is_active: false, mentee: { username: "mentee-b" } },
        { id: "m-3", is_active: true, mentee: { username: "mentee-a" } },
      ],
    });

    const { getByTestId } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByTestId("mentees-count").props.children).toBe(1);
    });
  });
});
