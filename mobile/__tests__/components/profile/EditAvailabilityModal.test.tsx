import { act, fireEvent, render } from "@testing-library/react-native";
import React from "react";

import { EditAvailabilityModal } from "@/components/profile/EditAvailabilityModal";

const mockCreateAvailabilitySlotMutation = jest.fn();
const mockDeleteAvailabilitySlotMutation = jest.fn();
const mockRespondToMentorshipRequestMutation = jest.fn();

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

jest.mock("@/lib/queries/mentorship", () => ({
  useCreateAvailabilitySlotMutation: () => mockCreateAvailabilitySlotMutation(),
  useDeleteAvailabilitySlotMutation: () => mockDeleteAvailabilitySlotMutation(),
  useRespondToMentorshipRequestMutation: () =>
    mockRespondToMentorshipRequestMutation(),
}));

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonday(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1);
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

describe("EditAvailabilityModal", () => {
  const createMutateAsync = jest.fn();
  const deleteMutateAsync = jest.fn();
  const respondMutateAsync = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 3, 13, 8, 0, 0));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    createMutateAsync.mockResolvedValue(undefined);
    deleteMutateAsync.mockResolvedValue(undefined);
    respondMutateAsync.mockResolvedValue(undefined);
    mockCreateAvailabilitySlotMutation.mockReturnValue({
      mutateAsync: createMutateAsync,
      isPending: false,
    });
    mockDeleteAvailabilitySlotMutation.mockReturnValue({
      mutateAsync: deleteMutateAsync,
      isPending: false,
    });
    mockRespondToMentorshipRequestMutation.mockReturnValue({
      mutateAsync: respondMutateAsync,
      isPending: false,
    });
  });

  it("creates a new slot when tapping an inactive hour", async () => {
    const onChanged = jest.fn();
    const monday = toDateString(getMonday(new Date()));

    const { getByText } = render(
      <EditAvailabilityModal
        visible
        onClose={jest.fn()}
        username="mentor-1"
        slots={[]}
        onChanged={onChanged}
      />,
    );

    await act(async () => {
      fireEvent.press(getByText("09:00 - 10:00"));
    });

    expect(createMutateAsync).toHaveBeenCalledWith({
      date: monday,
      startTime: "09:00:00",
      endTime: "10:00:00",
    });
    expect(onChanged).toHaveBeenCalled();
  });

  it("shows inline error when trying to deactivate a booked slot", () => {
    const monday = toDateString(getMonday(new Date()));

    const { getByText } = render(
      <EditAvailabilityModal
        visible
        onClose={jest.fn()}
        username="mentor-1"
        slots={[
          {
            id: "slot-1",
            date: monday,
            startTime: "09:00:00",
            endTime: "10:00:00",
            is_booked: true,
          },
        ]}
      />,
    );

    fireEvent.press(getByText("09:00 - 10:00"));

    expect(
      getByText(
        "This slot has 0 planned session(s). Cancelling accepted sessions from availability editing is not supported by the current backend.",
      ),
    );
  });
});
