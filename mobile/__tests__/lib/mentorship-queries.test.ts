import {
  mapAvailabilityToSchedule,
  mapRequestsToDashboard,
} from "@/lib/queries/mentorship";

type BackendRequestItem = Parameters<typeof mapRequestsToDashboard>[0][number];
type BackendAvailabilitySlot = Parameters<
  typeof mapAvailabilityToSchedule
>[0][number];

describe("mentorship query mappers", () => {
  it("maps pending requests into incoming and outgoing dashboard cards", () => {
    const requests: BackendRequestItem[] = [
      {
        id: "req-1",
        mentor: { username: "mentor_user", display_name: "Mentor User" },
        mentee: { username: "me_user", display_name: "Me User" },
        status: "PENDING",
        cover_letter: "Can we discuss architecture?",
        created_at: "2026-04-01T10:00:00Z",
      },
      {
        id: "req-2",
        mentor: { username: "me_user", display_name: "Me User" },
        mentee: { username: "mentee_user", display_name: "Mentee User" },
        status: "PENDING",
        cover_letter: "Need help with RN navigation.",
        created_at: "2026-04-02T12:30:00Z",
      },
      {
        id: "req-3",
        mentor: { username: "mentor_user", display_name: "Mentor User" },
        mentee: { username: "me_user", display_name: "Me User" },
        status: "ACCEPTED",
        cover_letter: "Already accepted.",
        created_at: "2026-04-01T10:00:00Z",
      },
    ];

    const mapped = mapRequestsToDashboard(requests, "me_user");

    expect(mapped).toHaveLength(2);
    expect(mapped[0]).toMatchObject({
      id: "req-1",
      user: "Mentor User",
      type: "outgoing",
      topic: "Mentorship Request",
      message: "Can we discuss architecture?",
    });
    expect(mapped[1]).toMatchObject({
      id: "req-2",
      user: "Mentee User",
      type: "incoming",
      topic: "Mentorship Request",
      message: "Need help with RN navigation.",
    });
  });

  it("groups unbooked availability by weekday", () => {
    const slots: BackendAvailabilitySlot[] = [
      {
        id: "slot-1",
        date: "2026-04-06",
        startTime: "10:00:00",
        endTime: "11:00:00",
        is_booked: false,
      },
      {
        id: "slot-2",
        date: "2026-04-06",
        startTime: "15:00:00",
        endTime: "16:30:00",
        is_booked: false,
      },
      {
        id: "slot-3",
        date: "2026-04-07",
        startTime: "09:00:00",
        endTime: "10:00:00",
        is_booked: true,
      },
    ];

    const mapped = mapAvailabilityToSchedule(slots);

    expect(mapped).toEqual([
      {
        day: "Monday",
        times: ["10:00 - 11:00", "15:00 - 16:30"],
      },
    ]);
  });
});
