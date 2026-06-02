import { describe, expect, it } from "vitest";
import { buildUsaJobsSearchUrl, normalizeUsaJobsItem } from "./usajobs.mjs";

describe("buildUsaJobsSearchUrl", () => {
  it("builds a public search url with the default sync shape", () => {
    const url = buildUsaJobsSearchUrl({
      datePosted: 7,
      keyword: "software engineer",
      location: "Washington, DC",
      page: 3,
      resultsPerPage: 25,
    });

    expect(url.toString()).toBe(
      "https://data.usajobs.gov/api/search?Fields=Full&WhoMayApply=Public&ResultsPerPage=25&Page=3&SortField=DatePosted&SortDirection=Desc&DatePosted=7&Keyword=software+engineer&LocationName=Washington%2C+DC",
    );
  });
});

describe("normalizeUsaJobsItem", () => {
  it("maps the usa jobs search descriptor into the local jobs schema", () => {
    const normalized = normalizeUsaJobsItem({
      MatchedObjectDescriptor: {
        ApplicationCloseDate: "2026-07-01T00:00:00Z",
        ApplyURI: [
          "https://www.usajobs.gov/GetJob/ViewDetails/123?PostingChannelID=RESTAPI",
        ],
        DepartmentName: "Department of the Navy",
        JobCategory: [
          { Code: "2210", Name: "Information Technology Management" },
        ],
        JobGrade: [{ Code: "13" }],
        OrganizationName: "Space and Naval Warfare Systems Command",
        PositionID: "SW-123",
        PositionLocation: [
          {
            CountryCode: "United States",
            CityName: "San Diego",
            LocationName: "San Diego, California",
          },
        ],
        PositionLocationDisplay: "San Diego, California",
        PositionRemuneration: [
          {
            MaximumRange: "152000",
            MinimumRange: "120000",
            RateIntervalCode: "Per Year",
          },
        ],
        PositionTitle: "IT Specialist",
        PositionURI: "https://www.usajobs.gov/GetJob/ViewDetails/123",
        PublicationStartDate: "2026-06-30T00:00:00Z",
        RemoteIndicator: true,
        UserArea: {
          Details: {
            JobSummary: "Build secure systems.",
          },
        },
      },
      MatchedObjectId: "123",
    });

    expect(normalized).toEqual(
      expect.objectContaining({
        apply_url:
          "https://www.usajobs.gov/GetJob/ViewDetails/123?PostingChannelID=RESTAPI",
        company_name: "Space and Naval Warfare Systems Command",
        country_code: "United States",
        description: "Build secure systems.",
        external_id: "123",
        industry: "government",
        is_active: true,
        location: "San Diego, California",
        posted_at: "2026-06-30T00:00:00.000Z",
        salary_max_usd: 152000,
        salary_min_usd: 120000,
        salary_period: "Per Year",
        seniority: "senior",
        skills: ["Information Technology Management"],
        title: "IT Specialist",
        work_mode: "remote",
      }),
    );
  });
});
