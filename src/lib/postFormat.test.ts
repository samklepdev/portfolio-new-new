import { describe, expect, it } from "vitest";
import { formatPostDate, readingMinutes } from "./postFormat";

describe("readingMinutes", () => {
  it("rounds up and never returns 0", () => {
    expect(readingMinutes("one two three")).toBe(1);
    expect(readingMinutes("")).toBe(1);
  });

  it("counts roughly 200 words per minute", () => {
    expect(readingMinutes("word ".repeat(200))).toBe(1);
    expect(readingMinutes("word ".repeat(201))).toBe(2);
    expect(readingMinutes("word ".repeat(600))).toBe(3);
  });
});

describe("formatPostDate", () => {
  it("formats a date-only string in UTC", () => {
    expect(formatPostDate("2026-09-11")).toBe("September 11, 2026");
  });

  it("does not shift the day for dates that would roll back in US zones", () => {
    // Parsed as UTC midnight; a naive local-zone format renders this as the 31st.
    expect(formatPostDate("2026-01-01")).toBe("January 1, 2026");
  });

  it("returns null for no date", () => {
    expect(formatPostDate(null)).toBeNull();
    expect(formatPostDate(undefined)).toBeNull();
  });
});
