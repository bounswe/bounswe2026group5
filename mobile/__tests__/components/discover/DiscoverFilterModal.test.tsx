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
        selectedDistanceKm={null}
        onToggleSkill={onToggleSkill}
        onToggleCommunityTag={jest.fn()}
        onSelectDistanceKm={jest.fn()}
        onClear={onClear}
        onApply={jest.fn()}
        onClose={onClose}
      />,
    );

    // Docker is visible before filtering
    expect(getByTestId("skill-Docker")).toBeTruthy();

    // Filter to only Docker
    fireEvent.changeText(getByTestId("filter-search-input"), "dock");

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
        selectedDistanceKm={null}
        onToggleSkill={jest.fn()}
        onToggleCommunityTag={onToggleCommunityTag}
        onSelectDistanceKm={jest.fn()}
        onClear={jest.fn()}
        onApply={jest.fn()}
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
        selectedDistanceKm={null}
        onToggleSkill={jest.fn()}
        onToggleCommunityTag={jest.fn()}
        onSelectDistanceKm={jest.fn()}
        onClear={onClear}
        onApply={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId("clear-button"));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("calls onApply when apply button is pressed", () => {
    const onApply = jest.fn();

    const { getByTestId } = render(
      <DiscoverFilterModal
        visible
        allSkills={["Docker"]}
        communityTags={[]}
        selectedSkills={new Set()}
        selectedCommunityTags={new Set()}
        selectedDistanceKm={null}
        onToggleSkill={jest.fn()}
        onToggleCommunityTag={jest.fn()}
        onSelectDistanceKm={jest.fn()}
        onClear={jest.fn()}
        onApply={onApply}
        onClose={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId("apply-button"));
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it("calls onSelectDistanceKm when a distance chip is pressed", () => {
    const onSelectDistanceKm = jest.fn();

    const { getByTestId } = render(
      <DiscoverFilterModal
        visible
        allSkills={["Docker"]}
        communityTags={[]}
        selectedSkills={new Set()}
        selectedCommunityTags={new Set()}
        selectedDistanceKm={null}
        onToggleSkill={jest.fn()}
        onToggleCommunityTag={jest.fn()}
        onSelectDistanceKm={onSelectDistanceKm}
        onClear={jest.fn()}
        onApply={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId("distance-filter-15"));
    expect(onSelectDistanceKm).toHaveBeenCalledWith(15);
  });

  it("shows selected distance in the selected filters area", () => {
    const onSelectDistanceKm = jest.fn();

    const { getByTestId, getAllByText } = render(
      <DiscoverFilterModal
        visible
        allSkills={["Docker"]}
        communityTags={[]}
        selectedSkills={new Set()}
        selectedCommunityTags={new Set()}
        selectedDistanceKm={25}
        onToggleSkill={jest.fn()}
        onToggleCommunityTag={jest.fn()}
        onSelectDistanceKm={onSelectDistanceKm}
        onClear={jest.fn()}
        onApply={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(getAllByText("25 km").length).toBeGreaterThan(0);
    fireEvent.press(getByTestId("selected-distance-filter"));
    expect(onSelectDistanceKm).toHaveBeenCalledWith(null);
  });

  it("shows selected skills and communities in one selected filters area", () => {
    const onToggleSkill = jest.fn();
    const onToggleCommunityTag = jest.fn();

    const { getByTestId, getByText } = render(
      <DiscoverFilterModal
        visible
        allSkills={["Docker", "GraphQL"]}
        communityTags={communityTags}
        selectedSkills={new Set(["Docker"])}
        selectedCommunityTags={new Set(["backend-guild"])}
        selectedDistanceKm={null}
        onToggleSkill={onToggleSkill}
        onToggleCommunityTag={onToggleCommunityTag}
        onSelectDistanceKm={jest.fn()}
        onClear={jest.fn()}
        onApply={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(getByText("Selected Filters")).toBeTruthy();
    fireEvent.press(getByTestId("selected-community-filter-backend-guild"));
    fireEvent.press(getByTestId("selected-skill-Docker"));

    expect(onToggleCommunityTag).toHaveBeenCalledWith("backend-guild");
    expect(onToggleSkill).toHaveBeenCalledWith("Docker");
  });

  it("shows no-results state when search yields no matches", () => {
    const { getByTestId } = render(
      <DiscoverFilterModal
        visible
        allSkills={["Docker", "GraphQL"]}
        communityTags={[]}
        selectedSkills={new Set()}
        selectedCommunityTags={new Set()}
        selectedDistanceKm={null}
        onToggleSkill={jest.fn()}
        onToggleCommunityTag={jest.fn()}
        onSelectDistanceKm={jest.fn()}
        onClear={jest.fn()}
        onApply={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    fireEvent.changeText(getByTestId("filter-search-input"), "rust");
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
        selectedDistanceKm={null}
        onToggleSkill={jest.fn()}
        onToggleCommunityTag={jest.fn()}
        onSelectDistanceKm={jest.fn()}
        onClear={jest.fn()}
        onApply={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    fireEvent.changeText(getByTestId("filter-search-input"), "docker");
    expect(getByTestId("skill-Docker")).toBeTruthy();
    expect(queryByTestId("no-results-state")).toBeNull();
  });
});
