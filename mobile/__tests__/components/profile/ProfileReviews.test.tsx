import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { ProfileReviews } from "@/components/profile/ProfileReviews";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

describe("ProfileReviews", () => {
  it("renders anonymous reviews without reviewer identity", () => {
    const { getByText, queryByText } = render(
      <ProfileReviews
        reviews={[
          {
            rating: 5,
            text: "Very thoughtful guidance.",
            created_at: "2026-04-21T12:00:00Z",
          },
        ]}
      />,
    );

    expect(getByText("Anonymous mentee")).toBeTruthy();
    expect(getByText("Very thoughtful guidance.")).toBeTruthy();
    expect(queryByText("Mentee 1")).toBeNull();
  });

  it("supports loading more reviews like a comment feed", () => {
    const onLoadMore = jest.fn();
    const { getByText } = render(
      <ProfileReviews
        reviews={[
          {
            rating: 4,
            text: "Clear explanations.",
            created_at: "2026-04-21T12:00:00Z",
          },
        ]}
        totalCount={3}
        onLoadMore={onLoadMore}
      />,
    );

    fireEvent.press(getByText("Load more reviews"));

    expect(onLoadMore).toHaveBeenCalled();
  });
});
