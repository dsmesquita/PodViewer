import { describe, expect, it } from "vitest";
import { displayDate, relativeTime } from "./format";

describe("format", () => {
  const now = Date.parse("2026-11-18T12:00:00Z");
  it("describes elapsed time in words", () => {
    expect(relativeTime("2026-11-18T11:59:30Z", now)).toBe("just now");
    expect(relativeTime("2026-11-18T11:55:00Z", now)).toBe("5 minutes ago");
    expect(relativeTime("2026-11-17T12:00:00Z", now)).toBe("yesterday");
    expect(relativeTime("not a date", now)).toBe("");
  });
  it("formats calendar dates without shifting the day", () => {
    expect(displayDate("2026-11-18")).toBe("18 Nov 2026");
  });
});
