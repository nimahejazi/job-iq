export const RESUME_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const RESUME_ACCEPTED_FILE_INPUT_TYPES = ".pdf,application/pdf";

export type ResumeFileCandidate = {
  name: string;
  size: number;
  type: string;
};

type ResumeFileValidationResult =
  | { valid: true }
  | { message: string; valid: false };

export function formatResumeFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Browser MIME detection can be empty, so keep the PDF extension as a fallback.
export function isResumePdfFile(file: ResumeFileCandidate) {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}

// Shared validation keeps client feedback and the future upload action aligned.
export function validateResumeFile(
  file: ResumeFileCandidate | undefined,
): ResumeFileValidationResult {
  if (!file) {
    return { message: "Choose a PDF resume before continuing.", valid: false };
  }

  if (!isResumePdfFile(file)) {
    return { message: "Choose a PDF file.", valid: false };
  }

  if (file.size > RESUME_MAX_FILE_SIZE_BYTES) {
    return { message: "Choose a PDF under 10 MB.", valid: false };
  }

  return { valid: true };
}
