import { getAbsoluteUrl, API_BASE_URL } from "@/lib/api/config";

describe("getAbsoluteUrl utility", () => {
  it("returns empty string for empty inputs", () => {
    expect(getAbsoluteUrl(null)).toBe("");
    expect(getAbsoluteUrl(undefined)).toBe("");
    expect(getAbsoluteUrl("")).toBe("");
  });

  it("leaves absolute HTTP URLs unchanged", () => {
    const url = "https://example.com/image.png";
    expect(getAbsoluteUrl(url)).toBe(url);
  });

  it("leaves local file URIs unchanged", () => {
    const fileUri = "file:///var/mobile/Containers/Data/Application/test.jpg";
    expect(getAbsoluteUrl(fileUri)).toBe(fileUri);
  });

  it("leaves content URIs unchanged (Android)", () => {
    const contentUri = "content://media/external/images/media/123";
    expect(getAbsoluteUrl(contentUri)).toBe(contentUri);
  });

  it("leaves Photo Library URIs unchanged (iOS)", () => {
    const phUri = "ph://CC95F8D9-025B-4C67-BA73-F6A5593B0181/L0/001";
    expect(getAbsoluteUrl(phUri)).toBe(phUri);
    
    const assetsUri = "assets-library://asset/asset.JPG?id=123";
    expect(getAbsoluteUrl(assetsUri)).toBe(assetsUri);
  });

  it("leaves data URIs unchanged", () => {
    const dataUri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    expect(getAbsoluteUrl(dataUri)).toBe(dataUri);
  });

  it("prepends API_BASE_URL to relative paths starting with /", () => {
    const path = "/media/uploads/test.png";
    expect(getAbsoluteUrl(path)).toBe(`${API_BASE_URL}${path}`);
  });

  it("prepends API_BASE_URL to relative paths without leading /", () => {
    const path = "media/uploads/test.png";
    expect(getAbsoluteUrl(path)).toBe(`${API_BASE_URL}/${path}`);
  });
});
