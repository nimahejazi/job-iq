import {
  Badge,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";

const privacyControls = [
  "Delete resume PDF",
  "Delete extracted profile data",
  "Delete resume refinements",
  "Delete account data",
];

// Privacy settings placeholder reserves the future controls for user-owned resume data.
export default function PrivacySettingsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Badge tone="warning">Privacy</Badge>
        <div className="max-w-2xl space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Privacy settings
          </h1>
          <p className="text-muted-foreground">
            Users will manage resume files, extracted data, generated
            suggestions, and account deletion from this page.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data controls</CardTitle>
          <CardDescription>
            These controls will connect to Supabase Storage and database
            deletion flows.
          </CardDescription>
        </CardHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {privacyControls.map((control) => (
            <div
              className="rounded-md border border-border bg-muted/60 p-3 text-sm font-medium"
              key={control}
            >
              {control}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
