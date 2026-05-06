import CreateCommunityScreen from "@/app/(tabs)/community/create";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";

const mockReplace = jest.fn();
const mockCreateMutation = jest.fn();
let mockUsername: string | undefined = "student";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

jest.mock("@/lib/auth/store", () => ({
  useAuthStore: (selector: (state: any) => unknown) =>
    selector({
      user: mockUsername ? { username: mockUsername } : null,
    }),
}));

jest.mock("@/lib/queries/communityTags", () => ({
  useCreateCommunityTagMutation: (username?: string) =>
    mockCreateMutation(username),
}));

describe("CreateCommunityScreen", () => {
  const mutateAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsername = "student";
    mutateAsync.mockResolvedValue({
      id: "tag-1",
      name: "Backend Guild",
      slug: "backend-guild",
      description: "API design",
      member_count: 1,
      created_at: "2026-05-06T00:00:00Z",
      created_by_username: "student",
      is_member: true,
    });
    mockCreateMutation.mockReturnValue({
      mutateAsync,
      isPending: false,
    });
  });

  it("uses the authenticated username for cache invalidation scope", () => {
    render(<CreateCommunityScreen />);

    expect(mockCreateMutation).toHaveBeenCalledWith("student");
  });

  it("returns to the community tab from the back button", () => {
    const { getByTestId } = render(<CreateCommunityScreen />);

    fireEvent.press(getByTestId("create-community-back-button"));

    expect(mockReplace).toHaveBeenCalledWith("/(tabs)/community");
  });

  it("requires a community name before submit", async () => {
    const { findByText, getByTestId } = render(<CreateCommunityScreen />);

    fireEvent.press(getByTestId("create-community-submit"));

    expect(await findByText("Community name is required.")).toBeTruthy();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("creates a community and routes to its detail screen", async () => {
    const { getByTestId } = render(<CreateCommunityScreen />);

    fireEvent.changeText(
      getByTestId("create-community-name-input"),
      "  Backend Guild  ",
    );
    fireEvent.changeText(
      getByTestId("create-community-description-input"),
      "  API design and Django patterns  ",
    );
    fireEvent.press(getByTestId("create-community-submit"));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        name: "Backend Guild",
        description: "API design and Django patterns",
      });
    });
    expect(mockReplace).toHaveBeenCalledWith(
      "/(tabs)/community/tag-1?from=community",
    );
  });

  it("shows API errors when creation fails", async () => {
    mutateAsync.mockRejectedValueOnce(
      new Error("A community tag with this name already exists."),
    );
    const { findByText, getByTestId } = render(<CreateCommunityScreen />);

    fireEvent.changeText(getByTestId("create-community-name-input"), "Backend");
    fireEvent.press(getByTestId("create-community-submit"));

    expect(
      await findByText("A community tag with this name already exists."),
    ).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
