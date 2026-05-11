import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import { WorkshopCard } from "@/components/community/WorkshopCard";
import { type CommunityWorkshopListItem } from "@/lib/queries/workshops";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

const mockIsWorkshopActive = jest.fn();
jest.mock("@/lib/queries/workshops", () => ({
  ...jest.requireActual("@/lib/queries/workshops"),
  isWorkshopActive: (...args: unknown[]) => mockIsWorkshopActive(...args),
}));

function makeWorkshop(
  overrides: Partial<CommunityWorkshopListItem> = {},
): CommunityWorkshopListItem {
  return {
    id: "ws-1",
    community_id: "c-1",
    community_name: "JS Guild",
    author: {
      id: "u-1",
      username: "alice",
      display_name: "Alice",
      picture_url: "",
      title: "",
    },
    title: "Intro to GraphQL",
    description: "A talk about GraphQL.",
    scheduled_at: "2026-05-20T12:00:00Z",
    end_at: "2026-05-20T13:00:00Z",
    max_participants: 20,
    participant_count: 8,
    is_full: false,
    status: "SCHEDULED",
    current_user_enrolled: false,
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
    ...overrides,
  };
}

describe("WorkshopCard", () => {
  beforeEach(() => {
    mockIsWorkshopActive.mockReturnValue(true);
  });

  it("renders workshop title, community name, and description", () => {
    const { getByText } = render(<WorkshopCard workshop={makeWorkshop()} />);

    expect(getByText("Intro to GraphQL")).toBeTruthy();
    expect(getByText("JS Guild")).toBeTruthy();
    expect(getByText("A talk about GraphQL.")).toBeTruthy();
  });

  it("shows Open badge for an active non-full workshop", () => {
    const { getByText } = render(
      <WorkshopCard workshop={makeWorkshop({ is_full: false })} />,
    );

    expect(getByText("Open")).toBeTruthy();
  });

  it("shows Full badge for an active but fully booked workshop", () => {
    const { getByText } = render(
      <WorkshopCard workshop={makeWorkshop({ is_full: true })} />,
    );

    expect(getByText("Full")).toBeTruthy();
  });

  it("shows Cancelled badge for a cancelled workshop", () => {
    const { getByText } = render(
      <WorkshopCard workshop={makeWorkshop({ status: "CANCELLED" })} />,
    );

    expect(getByText("Cancelled")).toBeTruthy();
  });

  it("shows Ended badge when the workshop is no longer active", () => {
    mockIsWorkshopActive.mockReturnValue(false);
    const { getByText } = render(<WorkshopCard workshop={makeWorkshop()} />);

    expect(getByText("Ended")).toBeTruthy();
  });

  it("shows fallback text when description is empty", () => {
    const { getByText } = render(
      <WorkshopCard workshop={makeWorkshop({ description: "" })} />,
    );

    expect(getByText("No workshop description yet.")).toBeTruthy();
  });

  it("displays participant count in current/max format", () => {
    const { getByText } = render(
      <WorkshopCard
        workshop={makeWorkshop({ participant_count: 8, max_participants: 20 })}
      />,
    );

    expect(getByText("8/20 participants")).toBeTruthy();
  });

  it("shows the host display name", () => {
    const { getByText } = render(<WorkshopCard workshop={makeWorkshop()} />);

    expect(getByText("Host: Alice")).toBeTruthy();
  });

  it("falls back to Unknown when author is null", () => {
    const { getByText } = render(
      <WorkshopCard workshop={makeWorkshop({ author: null })} />,
    );

    expect(getByText("Host: Unknown")).toBeTruthy();
  });

  it("calls onPress with the workshop when the card is tapped", () => {
    const onPress = jest.fn();
    const workshop = makeWorkshop();
    const { getByTestId } = render(
      <WorkshopCard workshop={workshop} onPress={onPress} />,
    );

    fireEvent.press(getByTestId("community-workshop-card-ws-1"));

    expect(onPress).toHaveBeenCalledWith(workshop);
  });

  it("calls onCommunityPress when the community link is tapped without propagating to onPress", () => {
    const onPress = jest.fn();
    const onCommunityPress = jest.fn();
    const workshop = makeWorkshop();
    const { getByTestId } = render(
      <WorkshopCard
        workshop={workshop}
        onPress={onPress}
        onCommunityPress={onCommunityPress}
      />,
    );

    fireEvent.press(getByTestId("community-workshop-community-link-ws-1"));

    expect(onCommunityPress).toHaveBeenCalledWith(workshop);
    expect(onPress).not.toHaveBeenCalled();
  });
});
