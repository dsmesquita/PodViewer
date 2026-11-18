const relative = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });
const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86400000],
  ["hour", 3600000],
  ["minute", 60000],
];

/** "just now", "5 minutes ago", "yesterday"… */
export function relativeTime(iso: string, now = Date.now()): string {
  const elapsed = Date.parse(iso) - now;
  if (Number.isNaN(elapsed)) return "";
  for (const [unit, size] of units)
    if (Math.abs(elapsed) >= size)
      return relative.format(Math.round(elapsed / size), unit);
  return "just now";
}

/** 2026-11-18 → 18 Nov 2026, for read-only dates. */
export function displayDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}
