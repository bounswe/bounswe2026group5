import {
  fetchCommunityWorkshopDetail,
  fetchCommunityWorkshops,
  fetchMyWorkshopAttendance,
  isWorkshopActive,
  mapWorkshopAttendanceToDashboard,
} from "@/lib/queries/workshops";
import { apiGet } from "@/lib/api/client";

jest.mock("@/lib/api/client", () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
  apiPatch: jest.fn(),
  apiDelete: jest.fn(),
}));

describe("workshop query helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requests community workshops with query params", async () => {
    (apiGet as jest.Mock).mockResolvedValue({
      count: 0,
      offset: 0,
      limit: 10,
      results: [],
    });

    await fetchCommunityWorkshops({
      tagId: "tag 1",
      limit: 10,
      offset: 5,
      status: "SCHEDULED",
    });

    expect(apiGet).toHaveBeenCalledWith(
      "/api/profiles/tags/tag%201/workshops/?limit=10&offset=5&status=SCHEDULED",
    );
  });

  it("requests workshop detail for a community workshop", async () => {
    (apiGet as jest.Mock).mockResolvedValue({ id: "workshop-1" });

    await fetchCommunityWorkshopDetail("tag-1", "workshop-1");

    expect(apiGet).toHaveBeenCalledWith(
      "/api/profiles/tags/tag-1/workshops/workshop-1/",
    );
  });

  it("requests profile workshop attendance with the selected status filter", async () => {
    (apiGet as jest.Mock).mockResolvedValue({
      count: 0,
      attending_count: 0,
      attended_count: 0,
      offset: 0,
      limit: 20,
      results: [],
    });

    await fetchMyWorkshopAttendance("attending", 20, 10);

    expect(apiGet).toHaveBeenCalledWith(
      "/api/profiles/me/workshops/attendance/?status=attending&limit=20&offset=10",
    );
  });

  it("maps workshop attendance into dashboard session-like items", () => {
    const mapped = mapWorkshopAttendanceToDashboard(
      [
        {
          id: "attendance-2",
          workshop_id: "workshop-2",
          workshop_title: "Past Docker Lab",
          workshop_description: "",
          workshop_status: "COMPLETED",
          workshop_scheduled_at: "2026-05-04T09:00:00",
          workshop_end_at: "2026-05-04T10:30:00",
          community_id: "community-1",
          community_name: "DevOps Guild",
          author: {
            id: "author-1",
            username: "mentor_user",
            display_name: "Mentor User",
            picture_url: "",
            title: "Mentor",
          },
          joined_at: "2026-05-01T10:00:00Z",
          show_on_profile: false,
          attendance_status: "attended",
        },
        {
          id: "attendance-1",
          workshop_id: "workshop-1",
          workshop_title: "React Native Clinic",
          workshop_description: "",
          workshop_status: "SCHEDULED",
          workshop_scheduled_at: "2026-05-03T13:00:00",
          workshop_end_at: "2026-05-03T14:15:00",
          community_id: "community-2",
          community_name: "Mobile Guild",
          author: {
            id: "author-2",
            username: "me_user",
            display_name: "Me User",
            picture_url: "",
            title: "Mentor",
          },
          joined_at: "2026-05-02T10:00:00Z",
          show_on_profile: true,
          attendance_status: "attending",
        },
      ],
      "me_user",
    );

    expect(mapped).toEqual([
      {
        id: "workshop-1",
        workshopId: "workshop-1",
        communityId: "community-2",
        communityName: "Mobile Guild",
        user: "Mobile Guild",
        date: "May 03",
        rawDate: "2026-05-03",
        time: "13:00 - 14:15",
        status: "Upcoming",
        topic: "React Native Clinic",
        myRole: "Mentor",
        isWorkshop: true,
        workshopStatus: "SCHEDULED",
      },
      {
        id: "workshop-2",
        workshopId: "workshop-2",
        communityId: "community-1",
        communityName: "DevOps Guild",
        user: "Mentor User",
        date: "May 04",
        rawDate: "2026-05-04",
        time: "09:00 - 10:30",
        status: "Completed",
        topic: "Past Docker Lab",
        myRole: "Mentee",
        isWorkshop: true,
        workshopStatus: "COMPLETED",
      },
    ]);
  });

  it("treats only scheduled, not-yet-ended workshops as active", () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    expect(
      isWorkshopActive({
        status: "SCHEDULED",
        end_at: future,
      }),
    ).toBe(true);

    expect(
      isWorkshopActive({
        status: "CANCELLED",
        end_at: future,
      }),
    ).toBe(false);

    expect(
      isWorkshopActive({
        workshop_status: "SCHEDULED",
        workshop_end_at: past,
      }),
    ).toBe(false);
  });
});
