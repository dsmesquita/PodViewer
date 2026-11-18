import { it, expect, vi } from "vitest";
import { emptyWorkspace } from "../shared/model";
const { fetch } = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("electron", () => ({
  net: { fetch },
  session: { defaultSession: { allowNTLMCredentialsForDomains: vi.fn() } },
}));
import { actions } from "./actions";
it("creates reviewed Tasks with inherited fields and reports partial failure", async () => {
  const w = emptyWorkspace();
  w.boardUrl = "https://tfs/C/P/_boards/board/t/Team/Features";
  w.areaPaths = ["P"];
  let writes = 0;
  fetch.mockImplementation(async (_url: string, opts: any) => {
    if (opts.method === "GET")
      return new Response(
        JSON.stringify({
          id: 1,
          fields: {
            "System.Title": "Parent",
            "System.AreaPath": "P\\Child",
            "System.IterationPath": "P\\Sprint",
            "System.Tags": "Tag",
          },
        }),
      );
    writes++;
    const patch = JSON.parse(opts.body);
    expect(
      patch.find((p: any) => p.path === "/fields/System.AreaPath").value,
    ).toBe("P\\Child");
    expect(patch.find((p: any) => p.path === "/relations/-").value.rel).toBe(
      "System.LinkTypes.Hierarchy-Reverse",
    );
    return writes === 1
      ? new Response(
          JSON.stringify({
            id: 2,
            fields: {
              "System.Title": "BUILD:: Parent",
              "System.State": "New",
              "System.AreaPath": "P\\Child",
            },
          }),
        )
      : new Response("Denied", { status: 403 });
  });
  const r = await actions(w, { mode: "windows", version: "7.0" }).create(1, [
    { title: "BUILD:: Parent", estimate: 2 },
    { title: "VAL:: Parent", estimate: 1 },
  ]);
  expect(r.map((x) => x.status)).toEqual(["created", "failed"]);
});
it("rejects task creation outside the area scope before writing", async () => {
  const w = emptyWorkspace();
  w.boardUrl = "https://tfs/C/P/_boards/board/t/Team/Features";
  w.areaPaths = ["Other"];
  fetch.mockResolvedValue(
    new Response(JSON.stringify({ id: 1, fields: { "System.AreaPath": "P" } })),
  );
  await expect(
    actions(w, { mode: "windows", version: "7.0" }).create(1, [
      { title: "Task", estimate: 0 },
    ]),
  ).rejects.toThrow("outside");
});
