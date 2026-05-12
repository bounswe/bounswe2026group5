import {
  deleteProfilePicture,
  uploadPostMedia,
  uploadProfilePicture,
} from "@/lib/queries/uploads";

const mockApiPostMultipart = jest.fn();
const mockApiDelete = jest.fn();

jest.mock("@/lib/api/client", () => ({
  apiDelete: (...args: unknown[]) => mockApiDelete(...args),
  apiPostMultipart: (...args: unknown[]) => mockApiPostMultipart(...args),
}));

describe("upload query helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uploads post media through the self media endpoint", async () => {
    mockApiPostMultipart.mockResolvedValueOnce({
      url: "https://cdn.example.com/post.jpg",
    });

    const response = await uploadPostMedia({
      uri: "file:///tmp/post.jpg",
      name: "post.jpg",
      type: "image/jpeg",
    });

    expect(response.url).toBe("https://cdn.example.com/post.jpg");
    expect(mockApiPostMultipart).toHaveBeenCalledWith(
      "/api/profiles/me/uploads/",
      expect.any(FormData),
    );
  });

  it("uploads profile pictures through the profile picture endpoint", async () => {
    mockApiPostMultipart.mockResolvedValueOnce({
      detail: "Profile picture uploaded.",
      picture_url: "https://cdn.example.com/avatar.jpg",
    });

    const response = await uploadProfilePicture({
      uri: "file:///tmp/avatar.jpg",
      name: "avatar.jpg",
      type: "image/jpeg",
    });

    expect(response.picture_url).toBe("https://cdn.example.com/avatar.jpg");
    expect(mockApiPostMultipart).toHaveBeenCalledWith(
      "/api/profiles/me/picture/",
      expect.any(FormData),
    );
  });

  it("deletes the uploaded profile picture", async () => {
    mockApiDelete.mockResolvedValueOnce({
      detail: "Profile picture removed.",
      picture_url: "",
    });

    const response = await deleteProfilePicture();

    expect(response.picture_url).toBe("");
    expect(mockApiDelete).toHaveBeenCalledWith("/api/profiles/me/picture/");
  });
});
