"use client";

import { useActionState } from "react";
import { Button, Input } from "@/components/ui";
import {
  initialPreferencesFormState,
  type PreferencesRecord,
} from "@/lib/preferences/validation";
import { saveUserPreferences } from "../actions";

type PreferencesFormProps = {
  initialPreferences: PreferencesRecord | null;
};

const workModeOptions = [
  { label: "Remote", value: "remote" },
  { label: "Hybrid", value: "hybrid" },
  { label: "On-site", value: "onsite" },
];

const experienceLevelOptions = [
  { label: "Not specified", value: "" },
  { label: "Entry", value: "entry" },
  { label: "Junior", value: "junior" },
  { label: "Mid", value: "mid" },
  { label: "Senior", value: "senior" },
  { label: "Staff", value: "staff" },
  { label: "Lead", value: "lead" },
  { label: "Principal", value: "principal" },
];

function joinList(values: string[] | undefined) {
  return values?.join(", ") ?? "";
}

function hasWorkMode(
  initialPreferences: PreferencesRecord | null,
  value: string,
) {
  return initialPreferences?.work_modes.includes(value) ?? false;
}

// The preferences form keeps the onboarding fields editable with inline validation and save feedback.
export function PreferencesForm({ initialPreferences }: PreferencesFormProps) {
  const [state, formAction, pending] = useActionState(
    saveUserPreferences,
    initialPreferencesFormState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-foreground">
          Minimum salary
          <Input
            defaultValue={initialPreferences?.min_salary_usd ?? ""}
            inputMode="numeric"
            name="min_salary_usd"
            placeholder="120000"
            type="number"
          />
          {state.fieldErrors?.min_salary_usd ? (
            <p className="text-sm text-warning">
              {state.fieldErrors.min_salary_usd}
            </p>
          ) : null}
        </label>

        <label className="space-y-2 text-sm font-medium text-foreground">
          Experience level
          <select
            className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-3 focus:ring-primary/15"
            defaultValue={initialPreferences?.experience_level ?? ""}
            name="experience_level"
          >
            {experienceLevelOptions.map((option) => (
              <option key={option.value || "none"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {state.fieldErrors?.experience_level ? (
            <p className="text-sm text-warning">
              {state.fieldErrors.experience_level}
            </p>
          ) : null}
        </label>
      </div>

      <label className="space-y-2 text-sm font-medium text-foreground">
        Preferred locations
        <Input
          defaultValue={joinList(initialPreferences?.preferred_locations)}
          name="preferred_locations"
          placeholder="San Francisco, Seattle, Remote"
        />
        {state.fieldErrors?.preferred_locations ? (
          <p className="text-sm text-warning">
            {state.fieldErrors.preferred_locations}
          </p>
        ) : null}
      </label>

      <div className="space-y-2 text-sm font-medium text-foreground">
        Work modes
        <div className="flex flex-wrap gap-3">
          {workModeOptions.map((option) => (
            <label
              className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground"
              key={option.value}
            >
              <input
                defaultChecked={hasWorkMode(initialPreferences, option.value)}
                name="work_modes"
                type="checkbox"
                value={option.value}
              />
              {option.label}
            </label>
          ))}
        </div>
        {state.fieldErrors?.work_modes ? (
          <p className="text-sm text-warning">{state.fieldErrors.work_modes}</p>
        ) : null}
      </div>

      <label className="flex items-center gap-3 text-sm font-medium text-foreground">
        <input
          defaultChecked={initialPreferences?.willing_to_relocate ?? false}
          name="willing_to_relocate"
          type="checkbox"
        />
        Willing to relocate
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-foreground">
          Desired titles
          <Input
            defaultValue={joinList(initialPreferences?.desired_titles)}
            name="desired_titles"
            placeholder="Software Engineer, Product Manager"
          />
          {state.fieldErrors?.desired_titles ? (
            <p className="text-sm text-warning">
              {state.fieldErrors.desired_titles}
            </p>
          ) : null}
        </label>

        <label className="space-y-2 text-sm font-medium text-foreground">
          Excluded titles
          <Input
            defaultValue={joinList(initialPreferences?.excluded_titles)}
            name="excluded_titles"
            placeholder="Intern, Support Engineer"
          />
          {state.fieldErrors?.excluded_titles ? (
            <p className="text-sm text-warning">
              {state.fieldErrors.excluded_titles}
            </p>
          ) : null}
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-foreground">
          Excluded industries
          <Input
            defaultValue={joinList(initialPreferences?.excluded_industries)}
            name="excluded_industries"
            placeholder="Gaming, AdTech"
          />
          {state.fieldErrors?.excluded_industries ? (
            <p className="text-sm text-warning">
              {state.fieldErrors.excluded_industries}
            </p>
          ) : null}
        </label>

        <label className="space-y-2 text-sm font-medium text-foreground">
          Employment types
          <Input
            defaultValue={joinList(initialPreferences?.employment_types)}
            name="employment_types"
            placeholder="Full-time, Contract"
          />
          {state.fieldErrors?.employment_types ? (
            <p className="text-sm text-warning">
              {state.fieldErrors.employment_types}
            </p>
          ) : null}
        </label>
      </div>

      {state.message ? (
        <p
          aria-live="polite"
          className={
            state.status === "success"
              ? "rounded-md bg-success-soft px-3 py-2 text-sm text-success"
              : "rounded-md bg-warning-soft px-3 py-2 text-sm text-warning"
          }
        >
          {state.message}
        </p>
      ) : null}

      <Button disabled={pending} type="submit">
        {pending ? "Saving..." : "Save preferences"}
      </Button>
    </form>
  );
}
