import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";

const profileSections = ["Skills", "Education", "Experience"];

// Profile page placeholder is where parsed resume entities become editable user data.
export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Badge tone="primary">Profile</Badge>
        <div className="max-w-2xl space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Resume profile
          </h1>
          <p className="text-muted-foreground">
            Review and correct the skills, education, and experience Job IQ
            extracts from uploaded resumes.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {profileSections.map((section) => (
          <Card key={section}>
            <CardHeader>
              <CardTitle>{section}</CardTitle>
              <CardDescription>
                Editable {section.toLowerCase()} data will appear here after
                resume parsing.
              </CardDescription>
            </CardHeader>
            <Button variant="secondary">Add {section.toLowerCase()}</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
