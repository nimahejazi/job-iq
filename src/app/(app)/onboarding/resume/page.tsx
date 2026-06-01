import {
  Badge,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { ResumeUploadForm } from "./_components/resume-upload-form";

const resumeSetupNotes = [
  "PDF upload first",
  "Text extraction next",
  "Skills and experience review after parsing",
];

// Resume onboarding starts with file selection before storage and parsing are wired in.
export default function ResumeOnboardingPage() {
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
