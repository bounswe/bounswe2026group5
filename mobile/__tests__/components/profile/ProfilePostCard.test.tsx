import { ProfilePostCard } from "@/components/profile/ProfilePostCard";
import type { ProfilePost } from "@/lib/queries/profile";
import { fireEvent, render } from "@testing-library/react-native";
import React from "react";
import { Linking } from "react-native";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

const openUrlSpy = jest
  .spyOn(Linking, "openURL")
  .mockImplementation(() => Promise.resolve({} as never));

function buildPost(overrides: Partial<ProfilePost> = {}): ProfilePost {
  return {
    id: "post-1",
    source_id: "post-1",
    category: "CoP",
    event_type: "social",
    content: "A post",
    media_url: null,
    timestamp: "2026-05-06T10:00:00Z",
    created_at: "2026-05-06T10:00:00Z",
    last_edited: null,
    show_on_profile: true,
    community_id: "tag-1",
    actor_role: null,
    author: {
      id: "profile-1",
      username: "ali",
      display_name: "Ali Mehmet",
      picture_url: "",
      title: "",
    },
    ...overrides,
  };
}

describe("ProfilePostCard", () => {
  beforeEach(() => {
    openUrlSpy.mockClear();
  });

  it("renders image media in a larger filled preview", () => {
    const { getByTestId, queryByTestId } = render(
      <ProfilePostCard
        expanded
        post={buildPost({
          media_url: "https://cdn.example.com/profile-photo.jpg",
        })}
      />,
    );

    const image = getByTestId("post-card-media-post-1");

    expect(image.props.resizeMode).toBe("cover");
    expect(image.props.className).toContain("h-72");
    expect(queryByTestId("post-card-attachment-post-1")).toBeNull();
  });

  it("keeps preview image media compact but still filled", () => {
    const { getByTestId } = render(
      <ProfilePostCard
        post={buildPost({
          media_url: "https://cdn.example.com/profile-photo.webp",
        })}
      />,
    );

    const image = getByTestId("post-card-media-post-1");

    expect(image.props.resizeMode).toBe("cover");
    expect(image.props.className).toContain("h-52");
  });

  it("renders PDF media as an attachment without showing the raw URL", () => {
    const { getByTestId, queryByTestId, queryByText } = render(
      <ProfilePostCard
        post={buildPost({
          media_url: "https://cdn.example.com/files/resume.pdf",
        })}
      />,
    );

    fireEvent.press(getByTestId("post-card-attachment-post-1"));

    expect(queryByTestId("post-card-media-post-1")).toBeNull();
    expect(queryByText("https://cdn.example.com/files/resume.pdf")).toBeNull();
    expect(queryByText("Attachment")).toBeTruthy();
    expect(openUrlSpy).toHaveBeenCalledWith(
      "https://cdn.example.com/files/resume.pdf",
    );
  });

  it("shows a quiet community name in the author metadata and opens the community", () => {
    const onCommunityPress = jest.fn();
    const { getByTestId, getByText, queryByText } = render(
      <ProfilePostCard
        post={buildPost()}
        communityLabel="Backend Guild"
        onCommunityPress={onCommunityPress}
      />,
    );

    const communityLabel = getByTestId("post-card-community-post-1");

    fireEvent.press(communityLabel);

    expect(getByTestId("post-card-event-icon-post-1").props.name).toBe(
      "people-outline",
    );
    expect(getByTestId("post-card-community-icon-post-1").props.name).toBe(
      "pricetag-outline",
    );
    expect(getByText("Backend Guild").props.className).toContain("text-[11px]");
    expect(getByText("Backend Guild").props.className).not.toContain("bg-");
    expect(queryByText("#Backend Guild")).toBeNull();
    expect(onCommunityPress).toHaveBeenCalledWith("tag-1");
  });

  it("does not render a milestone category tag", () => {
    const { queryByText } = render(
      <ProfilePostCard
        post={buildPost({
          category: "MCTE",
          community_id: null,
          event_type: "achievement",
        })}
      />,
    );

    expect(queryByText("Milestone")).toBeNull();
  });
});
