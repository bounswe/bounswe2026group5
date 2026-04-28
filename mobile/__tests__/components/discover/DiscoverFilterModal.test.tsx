import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { DiscoverFilterModal } from "@/components/discover/DiscoverFilterModal";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

const communityTags = [
  {
    id: "tag-1",
    name: "Backend Guild",
    slug: "backend-guild",
    description: "",
    member_count: 4,
    created_at: "2026-04-20T00:00:00Z",
  },
];

describe("DiscoverFilterModal", () => {
  it("filters skills by search text and calls onToggleSkill", () => {
    const onToggleSkill = jest.fn();
    const onClear = jest.fn();
    const onClose = jest.fn();

    const { getByTestId, queryByTestId } = render(
      <DiscoverFilterModal
        visible
        allSkills={["Docker", "GraphQL", "React Native"]}
        communityTags={communityTags}
        selectedSkills={new Set(["GraphQL"])}
        selectedCommunityTags={new Set()}
        onToggleSkill={onToggleSkill}
        onToggleCommunityTag={jest.fn()}
        onClear={onClear}
        onClose={onClose}
      />,
    );

    // Docker is visible before filtering
    expect(getByTestId("skill-Docker")).toBeTruthy();

    // Filter to only Docker
    fireEvent.changeText(getByTestId("skill-search-input"), "dock");

    expect(getByTestId("skill-Docker")).toBeTruthy();
    expect(queryByTestId("skill-GraphQL")).toBeNull();

    // Toggle Docker skill
    fireEvent.press(getByTestId("skill-Docker"));
    expect(onToggleSkill).toHaveBeenCalledWith("Docker");
  });

  it("calls onToggleCommunityTag when a community chip is pressed", () => {
    const onToggleCommunityTag = jest.fn();

    const { getByTestId } = render(
      <DiscoverFilterModal
        visible
        allSkills={["Docker"]}
        communityTags={communityTags}
        selectedSkills={new Set()}
        selectedCommunityTags={new Set(["backend-guild"])}
        onToggleSkill={jest.fn()}
        onToggleCommunityTag={onToggleCommunityTag}
        onClear={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId("community-filter-backend-guild"));
    expect(onToggleCommunityTag).toHaveBeenCalledWith("backend-guild");
  });

  it("calls onClear when clear button is pressed", () => {
    const onClear = jest.fn();

    const { getByTestId } = render(
      <DiscoverFilterModal
        visible
        allSkills={["Docker"]}
        communityTags={[]}
        selectedSkills={new Set()}
        selectedCommunityTags={new Set()}
        onToggleSkill={jest.fn()}
        onToggleCommunityTag={jest.fn()}
        onClear={onClear}
        onClose={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId("clear-button"));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when apply button is pressed", () => {
    const onClose = jest.fn();

    const { getByTestId } = render(
      <DiscoverFilterModal
        visible
        allSkills={["Docker"]}
        communityTags={[]}
        selectedSkills={new Set()}
        selectedCommunityTags={new Set()}
        onToggleSkill={jest.fn()}
        onToggleCommunityTag={jest.fn()}
        onClear={jest.fn()}
        onClose={onClose}
      />,
    );

    fireEvent.press(getByTestId("apply-button"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows no-results state when search yields no matches", () => {
    const { getByTestId } = render(
      <DiscoverFilterModal
        visible
        allSkills={["Docker", "GraphQL"]}
        communityTags={[]}
        selectedSkills={new Set()}
        selectedCommunityTags={new Set()}
        onToggleSkill={jest.fn()}
        onToggleCommunityTag={jest.fn()}
        onClear={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    fireEvent.changeText(getByTestId("skill-search-input"), "rust");
    expect(getByTestId("no-results-state")).toBeTruthy();
  });

  it("hides no-results state when there are matching skills", () => {
    const { getByTestId, queryByTestId } = render(
      <DiscoverFilterModal
        visible
        allSkills={["Docker", "GraphQL"]}
        communityTags={[]}
        selectedSkills={new Set()}
        selectedCommunityTags={new Set()}
        onToggleSkill={jest.fn()}
        onToggleCommunityTag={jest.fn()}
        onClear={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    fireEvent.changeText(getByTestId("skill-search-input"), "docker");
    expect(getByTestId("skill-Docker")).toBeTruthy();
    expect(queryByTestId("no-results-state")).toBeNull();
  });
});
