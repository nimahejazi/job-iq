import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { ResumeUploadForm } from "./_components/resume-upload-form";
import { retryResumeParsing } from "./actions";

const resumeSetupNotes = [
  "PDF upload first",
  "Text extraction next",
  "Skills and experience review after parsing",
];

function getParseTone(
  status?: "pending" | "processing" | "complete" | "failed",
) {
  switch (status) {
    case "complete":
      return "success" as const;
    case "failed":
      return "warning" as const;
    case "processing":
      return "primary" as const;
    case "pending":
    default:
      return "neutral" as const;
  }
}

function getParseTitle(
  status?: "pending" | "processing" | "complete" | "failed",
) {
  switch (status) {
    case "complete":
      return "Parsing complete";
    case "failed":
      return "Parsing failed";
    case "processing":
      return "Parsing in progress";
    case "pending":
      return "Waiting to parse";
    default:
      return "No resume yet";
  }
}

async function getLatestResume() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data } = await supabase
    .from("resumes")
    .select(
      "id, original_file_name, parse_status, parse_error, extracted_text, storage_path, created_at, updated_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

// Resume onboarding starts with file selection before storage and parsing are wired in.
export default async function ResumeOnboardingPage() {
  const latestResume = await getLatestResume();

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="space-y-6">
        <div className="space-y-3">
          <Badge tone="primary">Resume onboarding</Badge>
          <div className="max-w-2xl space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Upload your resume
            </h1>
            <p className="text-muted-foreground">
              Start with a PDF resume. Job IQ will use it to extract your
              skills, education, and experience before matching jobs.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Choose a PDF file</CardTitle>
            <CardDescription>
              This screen handles file selection only. Validation, storage, and
              metadata saving are separate checklist steps.
            </CardDescription>
          </CardHeader>
          <ResumeUploadForm />
        </Card>
      </section>

      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Parsing status</CardTitle>
              <Badge tone={getParseTone(latestResume?.parse_status)}>
                {latestResume?.parse_status ?? "none"}
              </Badge>
            </div>
            <CardDescription>
              This card reflects the four backend parse states for the latest
              resume.
            </CardDescription>
          </CardHeader>
          {latestResume ? (
            <div className="space-y-3 text-sm">
              <p className="font-semibold text-foreground">
                {getParseTitle(latestResume.parse_status)}
              </p>
              <p className="text-muted-foreground">
                {latestResume.original_file_name}
              </p>
              {latestResume.parse_status === "pending" ? (
                <p className="text-muted-foreground">
                  The upload is saved and waiting for the backend parser to pick
                  it up.
                </p>
              ) : null}
              {latestResume.parse_status === "processing" ? (
                <p className="text-muted-foreground">
                  The backend parser is reading the PDF and extracting text.
                </p>
              ) : null}
              {latestResume.parse_status === "complete" ? (
                <p className="text-muted-foreground">
                  Text has been extracted and saved for profile extraction.
                </p>
              ) : null}
              {latestResume.parse_status === "failed" ? (
                <div className="space-y-3">
                  <p className="text-muted-foreground">
                    {latestResume.parse_error ??
                      "The backend parser could not read this PDF."}
                  </p>
                  <form action={retryResumeParsing.bind(null, latestResume.id)}>
                    <Button type="submit" variant="secondary">
                      Retry parsing
                    </Button>
                  </form>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No resume has been uploaded yet.
            </p>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Setup flow</CardTitle>
            <CardDescription>
              These checkpoints preview the resume onboarding path.
            </CardDescription>
          </CardHeader>
          <ol className="space-y-3">
            {resumeSetupNotes.map((note, index) => (
              <li
                className="flex items-center gap-3 rounded-md border border-border bg-muted/50 p-3 text-sm font-medium text-foreground"
                key={note}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                  {index + 1}
                </span>
                {note}
              </li>
            ))}
          </ol>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Why PDF first?</CardTitle>
            <CardDescription>
              PDF is the most common resume format and gives us a narrow upload
              surface before we support more file types.
            </CardDescription>
          </CardHeader>
        </Card>
      </aside>
    </div>
  );
}
