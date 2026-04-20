import {
  formatNotificationTimestamp,
  getNotificationTargetPath,
  getNotificationTitle,
  mapBackendNotification,
} from "@/lib/queries/notifications";

describe("notifications query helpers", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-20T12:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("maps backend notifications into mobile-friendly items", () => {
    const result = mapBackendNotification({
      id: "notif-1",
      type: "new_message",
      message: "Ada sent you a new message.",
      is_read: false,
      created_at: "2026-04-20T11:45:00Z",
      actor: {
        username: "ada",
        display_name: "Ada Lovelace",
      },
      resource_type: "conversation",
      action_url: "https://neighborship.app/connections",
      extra_metadata: {
        target_path: "/(tabs)/connections",
      },
    });

    expect(result).toEqual({
      id: "notif-1",
      type: "new_message",
      title: "New message",
      message: "Ada sent you a new message.",
      isRead: false,
      createdAt: "2026-04-20T11:45:00Z",
      actorName: "Ada Lovelace",
      actionUrl: "https://neighborship.app/connections",
      targetPath: "/(tabs)/connections",
    });
  });

  it("falls back to prettified titles for unknown notification types", () => {
    expect(
      getNotificationTitle({
        id: "notif-2",
        type: "mentor_promoted",
        message: "You have a platform update.",
        is_read: false,
        created_at: "2026-04-20T11:45:00Z",
      }),
    ).toBe("Mentor Promoted");
  });

  it("routes session-related notifications to the schedule tab", () => {
    expect(
      getNotificationTargetPath({
        type: "session_rescheduled",
        resource_type: "meeting_session",
      }),
    ).toBe("/(tabs)/schedule");
  });

  it("uses extra metadata target path when provided", () => {
    expect(
      getNotificationTargetPath({
        type: "new_message",
        resource_type: "conversation",
        action_url: "https://neighborship.app/connections",
        extra_metadata: {
          target_path: "/(tabs)/connections",
        },
      }),
    ).toBe("/(tabs)/connections");
  });

  it("formats recent timestamps compactly", () => {
    expect(formatNotificationTimestamp("2026-04-20T11:10:00Z")).toBe("50m ago");
    expect(formatNotificationTimestamp("2026-04-20T08:00:00Z")).toBe("4h ago");
  });
});
