import {
  RESUME_PROFILE_JSON_SCHEMA,
  normalizeResumeProfile,
} from "./resume-entity-extraction.mjs";

const DEFAULT_OPENAI_RESUME_MODEL = "gpt-4o-mini";

function getOpenAIResumeModel() {
  return process.env.OPENAI_RESUME_MODEL?.trim() || DEFAULT_OPENAI_RESUME_MODEL;
}

function extractResponseText(responseBody) {
  if (typeof responseBody?.output_text === "string") {
    return responseBody.output_text;
  }

  const message = Array.isArray(responseBody?.output)
    ? responseBody.output.find(
        (item) => item?.type === "message" && item?.role === "assistant",
      )
    : null;

  if (!message || !Array.isArray(message.content)) {
    return "";
  }

  return message.content
    .filter((item) => item?.type === "output_text")
    .map((item) => item.text ?? "")
    .join("")
    .trim();
}

export async function extractResumeProfileWithOpenAI(text) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    body: JSON.stringify({
      input: [
        {
          content: [
            {
              text: "Extract structured resume data from the user-provided resume text. Return only the schema-compliant JSON object.",
              type: "input_text",
            },
          ],
          role: "system",
        },
        {
          content: [
            {
              text,
              type: "input_text",
            },
          ],
          role: "user",
        },
      ],
      model: getOpenAIResumeModel(),
      text: {
        format: {
          name: "resume_profile",
          schema: RESUME_PROFILE_JSON_SCHEMA,
          strict: true,
          type: "json_schema",
        },
      },
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const responseBody = await response.json();

  if (!response.ok) {
    const errorMessage =
      responseBody?.error?.message ??
      `OpenAI resume extraction failed with status ${response.status}.`;

    throw new Error(errorMessage);
  }

  const outputText = extractResponseText(responseBody);

  if (!outputText) {
    throw new Error("OpenAI did not return structured resume JSON.");
  }

  const parsedProfile = JSON.parse(outputText);

  return normalizeResumeProfile(parsedProfile);
}
