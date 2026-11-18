import { describe, it, expect } from "vitest";
import {
  assignedMember,
  assignments,
  dateOf,
  edit,
  emptyWorkspace,
  move,
  range,
  reconcile,
  visible,
} from "./model";
import { sample } from "./sample";
describe("pod planning", () => {
  it("does not broaden an unresolved owner filter", () => {
    const w = sample();
    w.ownerInitialized = false;
    expect(visible(w, false)).toHaveLength(0);
  });
  it("preserves unmatched members during a move", () => {
    const w = sample();
    w.pods[1].members.push({ id: "external", name: "External" });
    const next = move(w, "0", "1");
    expect(next.overrides["1"].members).toContain("external");
  });

  it("seeds initial dates and uses CM creation dates for future pods", () => {
    let w = reconcile(emptyWorkspace(), sample().pods);
    expect(w.overrides["0"].start).toBe("2026-11-16");
    w = reconcile(w, [
      ...w.pods,
      { ...w.pods[0], id: "new", created: "2026-12-01" },
    ]);
    expect(w.overrides.new.start).toBeUndefined();
    expect(w.pods.find((p) => p.id === "new")?.created).toBe("2026-12-01");
  });
  it("preserves local edits and flags missing pods", () => {
    let w = sample();
    w = edit(w, "0", { name: "Local", members: [] });
    w = reconcile(w, w.pods.slice(1));
    expect(w.overrides["0"].name).toBe("Local");
    expect(w.pods.find((p) => p.id === "0")?.missing).toBe(true);
  });
  it("filters owners without changing Base or assignments", () => {
    const w = sample();
    w.owners = ["someone"];
    expect(visible(w, false)).toHaveLength(0);
    expect(assignments(w, w.roster[0])).toHaveLength(1);
  });
  it("moves people out of all previous pods and records membership changes", () => {
    const w = move(sample(), "0", "1");
    expect(assignments(w, w.roster[0]).map((p) => p.id)).toEqual(["1"]);
    expect(w.history.length).toBeGreaterThan(0);
  });
  it("keeps conflicted imported people occupied", () => {
    const w = sample();
    w.pods[1].members.push(w.roster[0]);
    expect(assignments(w, w.roster[0])).toHaveLength(2);
  });
  it("closure releases members and is hidden unless past is requested", () => {
    const w = edit(sample(), "0", { closed: "2026-11-17" });
    expect(assignments(w, w.roster[0])).toHaveLength(0);
    expect(visible(w, false)).toHaveLength(2);
    expect(visible(w, true)).toHaveLength(3);
  });
  it("matches roster accounts case insensitively", () => {
    const w = sample();
    w.roster[0].account = "DOMAIN\\user";
    w.pods[0].members = [
      { id: "remote", name: "Test", account: "domain\\USER" },
    ];
    expect(assignments(w, w.roster[0])).toHaveLength(1);
  });
  it("ends the timeline fourteen calendar days in the future", () => {
    expect(range(sample(), sample().pods, "2026-11-17").end).toBe("2026-12-01");
  });
  it("uses Lisbon calendar dates at UTC and daylight-saving boundaries", () => {
    expect(dateOf("2026-07-01T23:30:00Z")).toBe("2026-07-02");
    expect(dateOf("2026-11-16T23:30:00Z")).toBe("2026-11-16");
    expect(dateOf("invalid")).toBeUndefined();
  });
});
it("retains known assignments when a linked CM Pod is filtered out", () => {
  const w = sample();
  w.pods[0].cm = { ...w.pods[0].feature, id: 22 };
  const fresh = w.pods.map((p) => ({ ...p }));
  fresh[0] = { ...fresh[0], cm: undefined, members: [], owner: undefined };
  const next = reconcile(w, fresh);
  expect(assignments(next, next.roster[0])).toHaveLength(1);
});

describe("pod work assignments", () => {
  const task = { ...sample().pods[0].workItems[0], type: "Task" };
  const ana = {
    id: "local-ana",
    name: "Ana Martins",
    tfsId: "ana",
    account: "DOMAIN\\ana",
  };
  const otherAna = {
    id: "other",
    name: "Ana Martins",
    tfsId: "other-ana",
    account: "DOMAIN\\other",
  };

  it("matches a TFS identity or account even when display names are ambiguous", () => {
    expect(
      assignedMember({ ...task, assigneeId: "ANA" }, [ana, otherAna]),
    ).toBe(ana);
    expect(
      assignedMember({ ...task, assignedTo: "domain\\other" }, [ana, otherAna]),
    ).toBe(otherAna);
  });

  it("uses a unique legacy name only in the absence of conflicting identity", () => {
    expect(assignedMember(task, [ana])).toBe(ana);
    expect(assignedMember(task, [ana, otherAna])).toBeUndefined();
    expect(
      assignedMember({ ...task, assigneeId: "someone-else" }, [ana]),
    ).toBeUndefined();
  });
});
