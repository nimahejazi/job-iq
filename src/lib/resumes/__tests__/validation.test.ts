import { describe, expect, it } from "vitest";
import {
  RESUME_MAX_FILE_SIZE_BYTES,
  formatResumeFileSize,
  validateResumeFile,
} from "@/lib/resumes/validation";

describe("validateResumeFile", () => {
  it("accepts PDF files under the size limit", () => {
    const result = validateResumeFile({
      name: "resume.pdf",
      size: 512_000,
      type: "application/pdf",
    });

    expect(result.valid).toBe(true);
  });

  it("accepts PDF extensions when the browser omits the MIME type", () => {
    const result = validateResumeFile({
      name: "resume.pdf",
      size: 512_000,
      type: "",
    });

    expect(result.valid).toBe(true);
  });

  it("rejects non-PDF files", () => {
    const result = validateResumeFile({
      name: "resume.docx",
      size: 512_000,
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    expect(result).toEqual({
      message: "Choose a PDF file.",
      valid: false,
    });
  });

  it("rejects PDF files over the size limit", () => {
    const result = validateResumeFile({
      name: "resume.pdf",
      size: RESUME_MAX_FILE_SIZE_BYTES + 1,
      type: "application/pdf",
    });

    expect(result).toEqual({
      message: "Choose a PDF under 10 MB.",
      valid: false,
    });
  });
});

describe("formatResumeFileSize", () => {
  it("formats kilobytes and megabytes for upload preview text", () => {
    expect(formatResumeFileSize(1_024)).toBe("1 KB");
    expect(formatResumeFileSize(1_572_864)).toBe("1.5 MB");
  });
});
