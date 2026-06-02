import { describe, expect, it } from "vitest";
import { normalizeMatchCount } from "./nearest-neighbors";

describe("nearest job helper", () => {
  it("keeps match counts within the supported range", () => {
    expect(normalizeMatchCount(0)).toBe(10);
    expect(normalizeMatchCount(2.7)).toBe(2);
    expect(normalizeMatchCount(999)).toBe(100);
  });
});
