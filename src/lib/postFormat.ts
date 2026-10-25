const WORDS_PER_MINUTE = 200;

export function readingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

// `publishedAt` is a date-only column. Formatting it in the server's zone and
// again in the visitor's can land on different calendar days and trip a
// hydration mismatch, so the zone is pinned to UTC for everyone.
const dateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function formatPostDate(
  value: string | Date | null | undefined
): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return dateFormat.format(date);
}
