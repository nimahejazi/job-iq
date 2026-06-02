import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
} from "@/components/ui";
import {
  deleteResumeEntity,
  saveResumeEntity,
  updateProfileName,
} from "./actions";

const profileSectionOrder = [
  "summary",
  "skill",
  "title",
  "industry",
  "seniority",
  "education",
  "experience",
  "certification",
] as const;

type ProfileEntityType = (typeof profileSectionOrder)[number];

type ResumeEntity = {
  created_at: string;
  description: string | null;
  entity_type: ProfileEntityType;
  id: string;
  label: string;
  metadata: Json;
  resume_id: string | null;
  source: "resume" | "user" | "ai";
  updated_at: string;
};

type ProfileRow = {
  full_name: string | null;
};

function getEntitySectionTitle(entityType: ProfileEntityType) {
  switch (entityType) {
    case "summary":
      return "Summary";
    case "skill":
      return "Skills";
    case "title":
      return "Titles";
    case "industry":
      return "Industries";
    case "seniority":
      return "Seniority";
    case "education":
      return "Education";
    case "experience":
      return "Experience";
    case "certification":
      return "Certifications";
  }
}

function getEntitySectionDescription(entityType: ProfileEntityType) {
  switch (entityType) {
    case "summary":
      return "A concise summary of the candidate profile.";
    case "skill":
      return "Core skills the matcher should recognize.";
    case "title":
      return "Target or historical job titles.";
    case "industry":
      return "Industries that appear in the resume.";
    case "seniority":
      return "The likely seniority level inferred from the resume.";
    case "education":
      return "Degrees, schools, and study details.";
    case "experience":
      return "Roles, employers, and career history.";
    case "certification":
      return "Certifications, issuers, and dates.";
  }
}

function getSourceLabel(source: ResumeEntity["source"]) {
  switch (source) {
    case "ai":
      return "AI extracted";
    case "resume":
      return "Resume extracted";
    case "user":
      return "Manual";
  }
}

function getSourceTone(source: ResumeEntity["source"]) {
  switch (source) {
    case "ai":
      return "success" as const;
    case "resume":
      return "primary" as const;
    case "user":
      return "neutral" as const;
  }
}

function groupEntities(entities: ResumeEntity[]) {
  return entities.reduce<Record<ProfileEntityType, ResumeEntity[]>>(
    (groups, entity) => {
      groups[entity.entity_type] ??= [];
      groups[entity.entity_type].push(entity);
      return groups;
    },
    {
      certification: [],
      education: [],
      experience: [],
      industry: [],
      seniority: [],
      skill: [],
      summary: [],
      title: [],
    },
  );
}

async function getProfileData() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [{ data: profile }, { data: entities }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle<ProfileRow>(),
    supabase
      .from("resume_entities")
      .select(
        "id, entity_type, label, description, source, metadata, resume_id, created_at, updated_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  return {
    entities: (entities ?? []) as ResumeEntity[],
    profile: profile ?? null,
  };
}

function ProfileEntityEditor({ entity }: { entity: ResumeEntity }) {
  const labelId = `label-${entity.id}`;
  const descriptionId = `description-${entity.id}`;
  const sectionTitle = getEntitySectionTitle(entity.entity_type);
  const sourceLabel = getSourceLabel(entity.source);

  return (
    <div className="rounded-md border border-border bg-muted/30 p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={getSourceTone(entity.source)}>{sourceLabel}</Badge>
            {entity.resume_id ? (
              <span className="text-xs text-muted-foreground">
                From uploaded resume
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                Manual profile item
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-foreground">
            {sectionTitle}
          </p>
        </div>

        <form action={deleteResumeEntity}>
          <input name="entity_id" type="hidden" value={entity.id} />
          <Button type="submit" variant="ghost">
            Delete
          </Button>
        </form>
      </div>

      <form action={saveResumeEntity} className="space-y-3">
        <input name="entity_id" type="hidden" value={entity.id} />
        <input name="entity_type" type="hidden" value={entity.entity_type} />

        <label className="space-y-2 text-sm font-medium text-foreground">
          Label
          <Input
            defaultValue={entity.label}
            id={labelId}
            name="label"
            required
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-foreground">
          Description
          <textarea
            className="min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-3 focus:ring-primary/15"
            defaultValue={entity.description ?? ""}
            id={descriptionId}
            name="description"
            placeholder={getEntitySectionDescription(entity.entity_type)}
            rows={entity.entity_type === "summary" ? 5 : 3}
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit">Save changes</Button>
        </div>
      </form>
    </div>
  );
}

function sectionPreviewCount(entities: ResumeEntity[]) {
  return entities.length;
}

// Profile editing now lets signed-in users review extracted resume facts and correct them in place.
export default async function ProfilePage() {
  const data = await getProfileData();

  if (!data) {
    return (
      <EmptyState
        action={
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            href="/auth/sign-in"
          >
            Sign in
          </Link>
        }
        description="Sign in to review extracted resume data and add manual profile details."
        eyebrow="Profile"
        title="No profile loaded"
      />
    );
  }

  const groupedEntities = groupEntities(data.entities);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Badge tone="primary">Profile</Badge>
        <div className="max-w-2xl space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Edit your profile
          </h1>
          <p className="text-muted-foreground">
            Review the skills, education, experience, and other facts extracted
            from your resume. You can correct entries, add missing details, or
            delete anything Job IQ got wrong.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Profile basics</CardTitle>
            <CardDescription>
              Keep your name aligned with the resume data Job IQ uses for
              matching.
            </CardDescription>
          </CardHeader>
          <form action={updateProfileName} className="space-y-3">
            <label className="space-y-2 text-sm font-medium text-foreground">
              Full name
              <Input
                defaultValue={data.profile?.full_name ?? ""}
                name="full_name"
                placeholder="Jane Doe"
              />
            </label>
            <div className="flex items-center gap-2">
              <Button type="submit">Save profile</Button>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add profile item</CardTitle>
            <CardDescription>
              Add something the resume parser missed or correct a detail by
              creating a manual profile entry.
            </CardDescription>
          </CardHeader>
          <form action={saveResumeEntity} className="space-y-3">
            <label className="space-y-2 text-sm font-medium text-foreground">
              Section
              <select
                className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-3 focus:ring-primary/15"
                name="entity_type"
                defaultValue="skill"
              >
                {profileSectionOrder.map((entityType) => (
                  <option key={entityType} value={entityType}>
                    {getEntitySectionTitle(entityType)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-foreground">
              Label
              <Input name="label" placeholder="TypeScript" required />
            </label>

            <label className="space-y-2 text-sm font-medium text-foreground">
              Description
              <textarea
                className="min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-3 focus:ring-primary/15"
                name="description"
                placeholder="Optional details for this profile item"
                rows={3}
              />
            </label>

            <div className="flex items-center gap-2">
              <Button type="submit">Add item</Button>
            </div>
          </form>
        </Card>
      </div>

      {data.entities.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {profileSectionOrder.map((entityType) => {
            const sectionEntities = groupedEntities[entityType];

            return (
              <Card key={entityType}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{getEntitySectionTitle(entityType)}</CardTitle>
                      <CardDescription>
                        {getEntitySectionDescription(entityType)}
                      </CardDescription>
                    </div>
                    <Badge tone="neutral">
                      {sectionPreviewCount(sectionEntities)}
                    </Badge>
                  </div>
                </CardHeader>

                {sectionEntities.length ? (
                  <div className="space-y-4">
                    {sectionEntities.map((entity) => (
                      <ProfileEntityEditor entity={entity} key={entity.id} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No {getEntitySectionTitle(entityType).toLowerCase()} saved
                    yet.
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          action={
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              href="/onboarding/resume"
            >
              Upload resume
            </Link>
          }
          description="Upload a resume first so Job IQ can extract profile data, then come back here to edit it."
          eyebrow="No extracted profile data yet"
          title="Start with resume upload"
        />
      )}
    </div>
  );
}
