// Mocking requirements for helpers
const API_BASE_URL = "https://api.example.com";

function getAttachmentLabel(url: string, originalName?: string | null): string {
  if (originalName) return originalName;
  const path = url.split("?")[0] ?? "";
  const fileName = decodeURIComponent(path.split("/").pop() || "");
  return fileName || "Attachment";
}

function isImageAttachment(url: string): boolean {
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  return /\.(jpe?g|png|gif|webp)$/.test(path);
}

function isAudioAttachment(url: string): boolean {
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  return /\.(mp3|wav|ogg|m4a|aac)$/.test(path);
}

describe("Conversation Screen Helpers", () => {
  describe("getAttachmentLabel", () => {
    it("prefers originalName if provided", () => {
      const url = "/media/message_attachments/2026/05/123.pdf";
      const original = "quarterly_report.pdf";
      expect(getAttachmentLabel(url, original)).toBe(original);
    });

    it("extracts filename from URL if originalName is missing", () => {
      const url = "/media/message_attachments/2026/05/my_photo.jpg";
      expect(getAttachmentLabel(url, null)).toBe("my_photo.jpg");
    });

    it("handles URL encoded filenames", () => {
      const url = "/media/files/Hello%20World.pdf";
      expect(getAttachmentLabel(url)).toBe("Hello World.pdf");
    });

    it("falls back to 'Attachment' if filename cannot be extracted", () => {
      expect(getAttachmentLabel("/")).toBe("Attachment");
    });
  });

  describe("Attachment Type Detectors", () => {
    it("identifies images correctly", () => {
      expect(isImageAttachment("test.png")).toBe(true);
      expect(isImageAttachment("test.JPG")).toBe(true);
      expect(isImageAttachment("test.webp")).toBe(true);
      expect(isImageAttachment("test.pdf")).toBe(false);
    });

    it("identifies audio correctly", () => {
      expect(isAudioAttachment("test.mp3")).toBe(true);
      expect(isAudioAttachment("test.wav")).toBe(true);
      expect(isAudioAttachment("test.m4a")).toBe(true);
      expect(isAudioAttachment("test.png")).toBe(false);
    });
  });
});
