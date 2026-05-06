import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import { ProfilePostsPreview } from "@/components/profile/ProfilePostsPreview";
import * as profileQueries from "@/lib/queries/profile";

jest.mock("@/lib/queries/profile", () => ({
  useProfilePostsQuery: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

jest.mock("@/components/profile/ProfilePostCard", () => ({
  ProfilePostCard: ({ post }: { post: any }) => {
    const { Text, View } = jest.requireActual("react-native");
    return (
      <View testID={`mock-post-card-${post.id}`}>
        <Text>{post.content}</Text>
      </View>
    );
  },
}));

describe("ProfilePostsPreview", () => {
  const useProfilePostsQueryMock =
    profileQueries.useProfilePostsQuery as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing when no posts returned", () => {
    useProfilePostsQueryMock.mockReturnValue({
      data: { count: 0, results: [] },
      isLoading: false,
    });

    const { queryByTestId } = render(
      <ProfilePostsPreview username="testuser" onViewAll={jest.fn()} />,
    );

    expect(queryByTestId("profile-posts-preview")).toBeNull();
  });

  it("renders up to 3 posts in the preview stack", () => {
    useProfilePostsQueryMock.mockReturnValue({
      data: {
        count: 3,
        results: [
          { id: "post-1", content: "Post 1" },
          { id: "post-2", content: "Post 2" },
          { id: "post-3", content: "Post 3" },
        ],
      },
      isLoading: false,
    });

    const { getByTestId, getByText } = render(
      <ProfilePostsPreview username="testuser" onViewAll={jest.fn()} />,
    );

    expect(getByTestId("profile-posts-preview")).toBeTruthy();
    expect(getByTestId("mock-post-card-post-1")).toBeTruthy();
    expect(getByTestId("mock-post-card-post-2")).toBeTruthy();
    expect(getByTestId("mock-post-card-post-3")).toBeTruthy();
    expect(getByText("Post 1")).toBeTruthy();
    expect(getByText("Posts")).toBeTruthy();
  });

  it("does not render AGTE events even if backend returns them", () => {
    useProfilePostsQueryMock.mockReturnValue({
      data: {
        count: 1,
        results: [
          { id: "post-1", content: "Post 1", category: "PrP", show_on_profile: true },
        ],
      },
      isLoading: false,
    });

    const { getByText, queryByText } = render(
      <ProfilePostsPreview username="testuser" onViewAll={jest.fn()} />,
    );

    expect(getByText("Post 1")).toBeTruthy();
    expect(queryByText("System AGTE")).toBeNull();
  });

  it("View All Posts button calls onViewAll", () => {
    useProfilePostsQueryMock.mockReturnValue({
      data: {
        count: 5, // more than the 3 previewed
        results: [
          { id: "post-1", content: "Post 1" },
        ],
      },
      isLoading: false,
    });

    const onViewAll = jest.fn();
    const { getByTestId } = render(
      <ProfilePostsPreview username="testuser" onViewAll={onViewAll} />,
    );

    fireEvent.press(getByTestId("view-all-posts-button"));
    expect(onViewAll).toHaveBeenCalledTimes(1);
  });
});
