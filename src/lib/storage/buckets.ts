export const RESUME_BUCKET = "resumes";

export const RESUME_BUCKET_CONFIG = {
  // Keep resume PDFs private; the app will serve them with signed URLs later.
  public: false,
  // Limit resume uploads to 10 MB so accidental oversized files are rejected early.
  fileSizeLimit: 10 * 1024 * 1024,
  // Start with PDFs only because the first resume parser flow is PDF-based.
  allowedMimeTypes: ["application/pdf"],
} as const;
