import { MentorCard } from "@/components/discover/MentorCard";
import type { DiscoverMentorProfile } from "@/lib/discover/types";
import { render } from "@testing-library/react-native";
import React from "react";

const profile: DiscoverMentorProfile = {
  id: "profile-1",
  username: "ada",
  full_name: "Ada Lovelace",
  bio: "Mentors analytical engine projects.",
  hidden: false,
  picture_url: "",
  title: "Mentor",
  show_initials_only: false,
  skills: ["Math"],
  average_rating: "5.0",
  total_mentee_count: 4,
};

describe("Discover MentorCard", () => {
  it("renders profile pictures from discovery payloads", () => {
    const { getByTestId, queryByTestId } = render(
      <MentorCard
        profile={{
          ...profile,
          picture_url: "https://cdn.example.com/ada.jpg",
        }}
      />,
    );

    expect(getByTestId("discover-avatar-ada-image")).toBeTruthy();
    expect(queryByTestId("discover-avatar-ada-fallback")).toBeNull();
  });

  it("falls back to initials when discovery has no profile picture", () => {
    const { getByTestId, queryByTestId, getByText } = render(
      <MentorCard profile={profile} />,
    );

    expect(getByTestId("discover-avatar-ada-fallback")).toBeTruthy();
    expect(queryByTestId("discover-avatar-ada-image")).toBeNull();
    expect(getByText("AL")).toBeTruthy();
  });
});
