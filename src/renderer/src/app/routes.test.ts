import { describe, expect, it } from "vitest";
import { formatRoute, navSection, parseRoute } from "./routes";

describe("routes", () => {
  it("round-trips every route shape", () => {
    for (const route of [
      { page: "timeline" as const },
      { page: "pod" as const, id: "board:cm20" },
      { page: "feature" as const, id: 41001 },
    ])
      expect(parseRoute("#" + formatRoute(route))).toEqual(route);
  });
  it("falls back to Overview for unknown or malformed hashes", () => {
    expect(parseRoute("")).toEqual({ page: "overview" });
    expect(parseRoute("#nope")).toEqual({ page: "overview" });
    expect(parseRoute("#feature/abc")).toEqual({ page: "overview" });
    expect(parseRoute("#pod/")).toEqual({ page: "overview" });
  });
  it("keeps detail pages under their navigation section", () => {
    expect(navSection({ page: "pod", id: "x" }, "timeline")).toBe("timeline");
    expect(navSection({ page: "feature", id: 1 }, "overview")).toBe("base");
    expect(navSection({ page: "skills" }, "overview")).toBe("skills");
  });
});
