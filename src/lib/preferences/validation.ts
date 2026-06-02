export type PreferencesFieldErrors = {
  desired_titles?: string;
  employment_types?: string;
  experience_level?: string;
  excluded_industries?: string;
  excluded_titles?: string;
  min_salary_usd?: string;
  preferred_locations?: string;
  work_modes?: string;
};

export type PreferencesFormState = {
  fieldErrors?: PreferencesFieldErrors;
  message?: string;
  status: "idle" | "error" | "success";
};

export const initialPreferencesFormState: PreferencesFormState = {
  status: "idle",
};

export type PreferencesRecord = {
  desired_titles: string[];
  employment_types: string[];
  experience_level: string | null;
  excluded_industries: string[];
  excluded_titles: string[];
  min_salary_usd: number | null;
  preferred_locations: string[];
  willing_to_relocate: boolean;
  work_modes: string[];
};

const VALID_WORK_MODES = new Set(["remote", "hybrid", "onsite"]);

function normalizeFormValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function parseCommaSeparatedList(value: FormDataEntryValue | null) {
  return normalizeFormValue(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function dedupeList(values: string[]) {
  return [...new Set(values)];
}

export function parsePreferencesForm(formData: FormData) {
  const fieldErrors: PreferencesFieldErrors = {};
  const minSalaryText = normalizeFormValue(formData.get("min_salary_usd"));
  const preferredLocations = dedupeList(
    parseCommaSeparatedList(formData.get("preferred_locations")),
  );
  const desiredTitles = dedupeList(
    parseCommaSeparatedList(formData.get("desired_titles")),
  );
  const excludedTitles = dedupeList(
    parseCommaSeparatedList(formData.get("excluded_titles")),
  );
  const excludedIndustries = dedupeList(
    parseCommaSeparatedList(formData.get("excluded_industries")),
  );
  const employmentTypes = dedupeList(
    parseCommaSeparatedList(formData.get("employment_types")),
  );
  const workModes = dedupeList(
    formData
      .getAll("work_modes")
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
  const experienceLevel = normalizeFormValue(formData.get("experience_level"));
  const willingToRelocate = formData.get("willing_to_relocate") === "on";

  let minSalaryUsd: number | null = null;

  if (minSalaryText) {
    const parsedSalary = Number(minSalaryText);

    if (!Number.isInteger(parsedSalary) || parsedSalary < 0) {
      fieldErrors.min_salary_usd = "Enter a valid non-negative salary.";
    } else {
      minSalaryUsd = parsedSalary;
    }
  }

  if (workModes.some((mode) => !VALID_WORK_MODES.has(mode))) {
    fieldErrors.work_modes = "Choose remote, hybrid, or onsite only.";
  }

  if (preferredLocations.some((location) => !location)) {
    fieldErrors.preferred_locations = "Remove empty locations.";
  }

  if (desiredTitles.some((title) => !title)) {
    fieldErrors.desired_titles = "Remove empty desired titles.";
  }

  if (excludedTitles.some((title) => !title)) {
    fieldErrors.excluded_titles = "Remove empty excluded titles.";
  }

  if (excludedIndustries.some((industry) => !industry)) {
    fieldErrors.excluded_industries = "Remove empty excluded industries.";
  }

  if (employmentTypes.some((employmentType) => !employmentType)) {
    fieldErrors.employment_types = "Remove empty employment types.";
  }

  if (
    experienceLevel &&
    ![
      "entry",
      "junior",
      "mid",
      "senior",
      "staff",
      "lead",
      "principal",
    ].includes(experienceLevel)
  ) {
    fieldErrors.experience_level = "Choose a valid experience level.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false as const,
      fieldErrors,
    };
  }

  return {
    ok: true as const,
    preferences: {
      desired_titles: desiredTitles,
      employment_types: employmentTypes,
      experience_level: experienceLevel || null,
      excluded_industries: excludedIndustries,
      excluded_titles: excludedTitles,
      min_salary_usd: minSalaryUsd,
      preferred_locations: preferredLocations,
      willing_to_relocate: willingToRelocate,
      work_modes: workModes,
    } satisfies PreferencesRecord,
  };
}
