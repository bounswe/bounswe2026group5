import { TimelineEventCard } from "@/components/timeline/TimelineEventCard";
import type { TimelineEvent } from "@/lib/queries/mentorship";
import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

function makeEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    id: "event-1",
    category: "AGTE",
    event_type: "session_scheduled",
    timestamp: "2026-05-02T10:00:00Z",
    actor_role: "mentor",
    author: null,
    content: undefined,
    payload: {
      session_id: "session-1",
      scheduled_start_at_utc: "2026-05-03T16:00:00+00:00",
    },
    show_on_profile: false,
    is_editable: false,
    ...overrides,
  };
}

describe("TimelineEventCard", () => {
  it("formats AGTE labels and hides raw payload ids", () => {
    const onToggle = jest.fn();
    const { getByText, queryByText } = render(
      <TimelineEventCard
        event={makeEvent()}
        expanded={false}
        isFirst={true}
        isLast={true}
        onToggle={onToggle}
      />,
    );

    expect(getByText("Session scheduled")).toBeTruthy();
    expect(getByText("System")).toBeTruthy();
    expect(getByText("View details")).toBeTruthy();
    expect(queryByText("session_id")).toBeNull();
    expect(queryByText("session-1")).toBeNull();
  });

  it("shows formatted payload details when expanded", () => {
    const { getByText, queryByText } = render(
      <TimelineEventCard
        event={makeEvent()}
        expanded={true}
        isFirst={true}
        isLast={true}
        onToggle={jest.fn()}
      />,
    );

    expect(getByText("Starts")).toBeTruthy();
    expect(queryByText("scheduled_start_at_utc")).toBeNull();
    expect(queryByText("session-1")).toBeNull();
  });

  it("renders MCTE content and calls toggle", () => {
    const onToggle = jest.fn();
    const { getByText, getByTestId } = render(
      <TimelineEventCard
        event={makeEvent({
          id: "mcte-1",
          category: "MCTE",
          event_type: "achievement",
          actor_role: "mentee",
          content: "Finished React Basics",
          payload: {},
          show_on_profile: true,
          is_editable: true,
        })}
        expanded={true}
        isFirst={true}
        isLast={true}
        onToggle={onToggle}
      />,
    );

    expect(getByText("Achievement")).toBeTruthy();
    expect(getByText("Milestone")).toBeTruthy();
    expect(getByText("Finished React Basics")).toBeTruthy();
    expect(getByText("Shown on profile")).toBeTruthy();

    fireEvent.press(getByTestId("journey-event-toggle-mcte-1"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
