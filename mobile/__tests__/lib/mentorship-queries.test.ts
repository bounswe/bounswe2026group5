import {
  mapJourneyFeedToTimelineEvents,
  mapAvailabilityToSchedule,
  mapMeetingSessionsToDashboard,
  mapRequestsToDashboard,
  mapUpcomingSessionsToDashboard,
} from "@/lib/queries/mentorship";

type BackendRequestItem = Parameters<typeof mapRequestsToDashboard>[0][number];
type BackendAvailabilitySlot = Parameters<
  typeof mapAvailabilityToSchedule
>[0][number];
type BackendUpcomingSession = Parameters<
  typeof mapUpcomingSessionsToDashboard
>[0][number];
type BackendMeetingSession = Parameters<
  typeof mapMeetingSessionsToDashboard
>[0][number];

function addDays(value: Date, days: number): string {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

describe("mentorship query mappers", () => {
  it("normalizes legacy AGTE journey rows into timeline events", () => {
    const mapped = mapJourneyFeedToTimelineEvents({
      ordering: "desc",
      count: 1,
      offset: 0,
      limit: 50,
      results: [
        {
          id: "session_scheduled:session-1",
          type: "session_scheduled",
          timestamp: "2026-05-02T10:00:00Z",
          actor_role: "mentor",
          payload: {
            session_id: "session-1",
          },
        },
      ],
    });

    expect(mapped.results).toEqual([
      {
        id: "session_scheduled:session-1",
        category: "AGTE",
        event_type: "session_scheduled",
        timestamp: "2026-05-02T10:00:00Z",
        actor_role: "mentor",
        author: null,
        content: undefined,
        payload: {
          session_id: "session-1",
        },
        show_on_profile: false,
        is_editable: false,
      },
    ]);
  });

  it("preserves unified manually created timeline event fields", () => {
    const mapped = mapJourneyFeedToTimelineEvents({
      ordering: "desc",
      count: 1,
      offset: 0,
      limit: 50,
      results: [
        {
          id: "event-1",
          category: "MCTE",
          event_type: "achievement",
          timestamp: "2026-05-02T11:00:00Z",
          author: {
            id: "profile-1",
            username: "mentor_user",
            display_name: "Mentor User",
            picture_url: "",
            title: "Mentor",
          },
          content: "Finished the first roadmap item.",
          payload: {},
          show_on_profile: true,
          is_editable: true,
        },
      ],
    });

    expect(mapped.results[0]).toMatchObject({
      id: "event-1",
      category: "MCTE",
      event_type: "achievement",
      content: "Finished the first roadmap item.",
      show_on_profile: true,
      is_editable: true,
    });
  });

  it("maps pending requests into incoming and outgoing dashboard cards", () => {
    const requests: BackendRequestItem[] = [
      {
        id: "req-1",
        mentor: {
          id: "mentor-1",
          username: "mentor_user",
          display_name: "Mentor User",
          picture_url: "",
          title: "Mentor",
        },
        mentee: {
          id: "mentee-1",
          username: "me_user",
          display_name: "Me User",
          picture_url: "",
          title: "Mentee",
        },
        status: "PENDING",
        cover_letter: "Can we discuss architecture?",
        created_at: "2026-04-01T10:00:00Z",
        slot_id: null,
        slot_date: null,
        slot_start_time: null,
        slot_end_time: null,
        responded_at: null,
      },
      {
        id: "req-2",
        mentor: {
          id: "mentor-2",
          username: "me_user",
          display_name: "Me User",
          picture_url: "",
          title: "Mentor",
        },
        mentee: {
          id: "mentee-2",
          username: "mentee_user",
          display_name: "Mentee User",
          picture_url: "",
          title: "Mentee",
        },
        status: "PENDING",
        cover_letter: "Need help with RN navigation.",
        created_at: "2026-04-02T12:30:00Z",
        slot_id: null,
        slot_date: null,
        slot_start_time: null,
        slot_end_time: null,
        responded_at: null,
      },
      {
        id: "req-3",
        mentor: {
          id: "mentor-3",
          username: "mentor_user",
          display_name: "Mentor User",
          picture_url: "",
          title: "Mentor",
        },
        mentee: {
          id: "mentee-3",
          username: "me_user",
          display_name: "Me User",
          picture_url: "",
          title: "Mentee",
        },
        status: "ACCEPTED",
        cover_letter: "Already accepted.",
        created_at: "2026-04-01T10:00:00Z",
        slot_id: null,
        slot_date: null,
        slot_start_time: null,
        slot_end_time: null,
        responded_at: null,
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
        times: [
          {
            id: "slot-1",
            label: "10:00 - 11:00",
            isBooked: false,
            date: "2026-04-06",
          },
          {
            id: "slot-2",
            label: "15:00 - 16:30",
            isBooked: false,
            date: "2026-04-06",
          },
        ],
      },
      {
        day: "Tuesday",
        times: [
          {
            id: "slot-3",
            label: "09:00 - 10:00",
            isBooked: true,
            date: "2026-04-07",
          },
        ],
      },
    ]);
  });

  it("maps upcoming sessions endpoint payload into dashboard sessions", () => {
    const today = new Date();
    const futureDate = addDays(today, 7);
    const nextDate = addDays(today, 8);

    const sessions: BackendUpcomingSession[] = [
      {
        slot_id: "slot-1",
        mentor: {
          id: "mentor-1",
          username: "mentor_ada",
          display_name: "Ada Lovelace",
          picture_url: "",
          title: "Mentor",
        },
        slot_date: futureDate,
        slot_start_time: "09:00:00",
        slot_end_time: "10:00:00",
        status: "ACCEPTED",
        booked_at: "2026-04-05T12:00:00Z",
      },
      {
        slot_id: "slot-2",
        mentor: {
          id: "mentor-2",
          username: "mentor_grace",
          display_name: "Grace Hopper",
          picture_url: "",
          title: "Mentor",
        },
        slot_date: nextDate,
        slot_start_time: "13:00:00",
        slot_end_time: "14:00:00",
        status: "PENDING",
        booked_at: "2026-04-05T13:00:00Z",
      },
    ];

    const mapped = mapUpcomingSessionsToDashboard(sessions);

    expect(mapped).toHaveLength(2);
    expect(mapped[0]).toMatchObject({
      id: "slot-1",
      user: "Ada Lovelace",
      rawDate: futureDate,
      time: "09:00 - 10:00",
      status: "Upcoming",
      myRole: "Mentee",
    });
    expect(mapped[1]).toMatchObject({
      id: "slot-2",
      user: "Grace Hopper",
      status: "Pending",
    });
  });

  it("deduplicates active meeting sessions by match after reschedule", () => {
    const sessions: BackendMeetingSession[] = [
      {
        session_id: "session-old",
        match_id: "match-1",
        mentor: {
          id: "mentor-1",
          username: "mentor_ada",
          display_name: "Ada Lovelace",
          picture_url: "",
          title: "Mentor",
        },
        mentee: {
          id: "mentee-1",
          username: "me_user",
          display_name: "Me User",
          picture_url: "",
          title: "Mentee",
        },
        source_slot_id: "slot-old",
        scheduled_start_at: "2026-04-20T09:00:00Z",
        scheduled_end_at: "2026-04-20T10:00:00Z",
        status: "RESCHEDULED",
        display_status: "RESCHEDULED",
        my_role: "MENTEE",
        allowed_actions: ["cancel"],
        canceled_by_role: null,
        cancel_reason: "",
        created_at: "2026-04-10T08:00:00Z",
        updated_at: "2026-04-10T09:00:00Z",
      },
      {
        session_id: "session-new",
        match_id: "match-1",
        mentor: {
          id: "mentor-1",
          username: "mentor_ada",
          display_name: "Ada Lovelace",
          picture_url: "",
          title: "Mentor",
        },
        mentee: {
          id: "mentee-1",
          username: "me_user",
          display_name: "Me User",
          picture_url: "",
          title: "Mentee",
        },
        source_slot_id: "slot-new",
        scheduled_start_at: "2026-04-21T11:00:00Z",
        scheduled_end_at: "2026-04-21T12:00:00Z",
        status: "SCHEDULED",
        display_status: "SCHEDULED",
        my_role: "MENTEE",
        allowed_actions: ["cancel", "reschedule"],
        canceled_by_role: null,
        cancel_reason: "",
        created_at: "2026-04-10T08:00:00Z",
        updated_at: "2026-04-10T10:00:00Z",
      },
    ];

    const mapped = mapMeetingSessionsToDashboard(sessions);

    expect(mapped).toHaveLength(1);
    expect(mapped[0]).toMatchObject({
      id: "slot-new",
      sessionId: "session-new",
      requestId: "match-1",
      user: "Ada Lovelace",
      status: "Upcoming",
    });
  });
});
