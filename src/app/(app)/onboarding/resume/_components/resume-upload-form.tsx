"use client";

import {
  useId,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import { Button } from "@/components/ui";
import {
  RESUME_ACCEPTED_FILE_INPUT_TYPES,
  formatResumeFileSize,
  validateResumeFile,
} from "@/lib/resumes/validation";
import { cx } from "@/lib/styles";

type SelectedFileState = {
  error?: string;
  file?: File;
  fileName?: string;
  fileSize?: string;
};

// ResumeUploadForm owns browser-only file input state until the real upload action is added.
export function ResumeUploadForm() {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<SelectedFileState>({});

  function previewSelectedFile(file: File | undefined) {
    if (!file) {
      setSelectedFile({});
      return;
    }

    const validation = validateResumeFile(file);

    if (!validation.valid) {
      setSelectedFile({ error: validation.message });
      return;
    }

    setSelectedFile({
      file,
      fileName: file.name,
      fileSize: formatResumeFileSize(file.size),
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateResumeFile(selectedFile.file);

    // This guard is the final browser-side checkpoint before the future upload action.
    if (!validation.valid) {
      setSelectedFile({ error: validation.message });
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    previewSelectedFile(event.target.files?.[0]);
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    previewSelectedFile(event.dataTransfer.files?.[0]);
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label
          className="text-sm font-semibold text-foreground"
          htmlFor={inputId}
        >
          Resume PDF
        </label>
        <label
          className={cx(
            "flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface px-6 py-8 text-center transition-colors hover:border-primary hover:bg-muted/60",
            isDragging && "border-primary bg-primary-soft/40",
            selectedFile.error && "border-warning/60 bg-warning-soft/30",
          )}
          htmlFor={inputId}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <span className="text-base font-semibold text-foreground">
            Drop your resume here or browse files
          </span>
          <span className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Upload a PDF resume so Job IQ can extract skills, education, and
            experience for matching.
          </span>
          <span className="mt-4 rounded-md bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            PDF only, 10 MB max
          </span>
        </label>
        <input
          accept={RESUME_ACCEPTED_FILE_INPUT_TYPES}
          className="sr-only"
          id={inputId}
          name="resume"
          onChange={handleFileChange}
          type="file"
        />
      </div>

      <div
        aria-live="polite"
        className="rounded-md border border-border bg-muted/50 p-4 text-sm"
      >
        {selectedFile.error ? (
          <p className="font-medium text-warning">{selectedFile.error}</p>
        ) : selectedFile.fileName ? (
          <div className="space-y-1">
            <p className="font-semibold text-foreground">
              {selectedFile.fileName}
            </p>
            <p className="text-muted-foreground">
              Ready for upload preview, {selectedFile.fileSize}.
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground">
            No file selected yet. The next checklist step will connect this form
            to Supabase Storage.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button disabled={!selectedFile.file} type="submit">
          Continue
        </Button>
        <Button type="button" variant="secondary">
          Save and finish later
        </Button>
      </div>
    </form>
  );
}
