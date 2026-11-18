import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { edit, emptyWorkspace, visible } from "../../shared/model";
import { createMockBackend, openMock, seedMock } from "./backend";

describe("mock backend", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "pod-viewer-mock-"));
    await seedMock(dir);
    const config = join(dir, "config.json");
    const parsed = JSON.parse(await readFile(config, "utf8"));
    await writeFile(config, JSON.stringify({ ...parsed, delayMs: 0 }));
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));

  it("seeds a usable workspace without overwriting edits", async () => {
    await writeFile(join(dir, "people.json"), "[]");
    await seedMock(dir);
    expect(await readFile(join(dir, "people.json"), "utf8")).toBe("[]");
    const { initialWorkspace } = await openMock(dir);
    const w = await initialWorkspace();
    expect(visible(w, false).length).toBeGreaterThan(2);
    expect(w.boardUrl).toContain(".invalid");
  });

  it("refresh keeps local overrides and roster edits", async () => {
    const { backend, initialWorkspace } = await openMock(dir);
    const w = await initialWorkspace();
    const local = {
      ...edit(w, w.pods[0].id, { name: "Local name" }),
      roster: w.roster.slice(1),
    };
    const next = await backend.refresh(local);
    expect(next.overrides[w.pods[0].id].name).toBe("Local name");
    expect(next.roster).toHaveLength(w.roster.length - 1);
  });

  it("reads children, simulates failures and creates tasks in memory", async () => {
    const backend = createMockBackend(dir);
    const w = emptyWorkspace();
    expect((await backend.item(w, 42002)).children?.length).toBe(2);
    await expect(backend.item(w, 42032)).rejects.toThrow(/mock failure/);
    await expect(backend.item(w, 1)).rejects.toThrow(/404/);
    const results = await backend.createTasks(w, 42002, [
      { title: "Created", estimate: 1 },
      { title: "Broken [fail]", estimate: 0 },
      { title: "Unsure [uncertain]", estimate: 0 },
    ]);
    expect(results.map((r) => r.status)).toEqual([
      "created",
      "failed",
      "uncertain",
    ]);
    const parent = await backend.item(w, 42002);
    expect(parent.children?.map((c) => c.title)).toContain("Created");
  });

  it("fails refresh on request", async () => {
    const config = join(dir, "config.json");
    await writeFile(config, JSON.stringify({ failRefresh: true }));
    await expect(
      createMockBackend(dir).refresh(emptyWorkspace()),
    ).rejects.toThrow(/unreachable/);
  });
});
