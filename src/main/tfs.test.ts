import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyWorkspace } from "../shared/model";
const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.mock("electron", () => ({
  net: { fetch: fetchMock },
  session: { defaultSession: { allowNTLMCredentialsForDomains: vi.fn() } },
}));
import { fetchBoard } from "./tfs";
const feature = {
  id: 10,
  fields: {
    "System.AreaPath": "Product\\Domain",
    "System.Title": "Production",
    "System.State": "New",
    "System.WorkItemType": "Feature",
    "WEF.Row": "Pod1",
    "WEF.Column": "Ready",
  },
  relations: [
    { rel: "System.LinkTypes.Related", url: "https://tfs/20" },
    { rel: "System.LinkTypes.Hierarchy-Forward", url: "https://tfs/30" },
  ],
};
beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string, opts: any) => {
    let value: unknown;
    if (url.includes("/boards/"))
      value = {
        id: "board",
        rows: [
          { id: "pod", name: "Pod1" },
          { id: "base", name: "Base Lane" },
        ],
        fields: {
          "System.AreaPath": "Product\\Domain",
          rowField: { referenceName: "WEF.Row" },
          columnField: { referenceName: "WEF.Column" },
        },
      };
    else if (url.includes("teamfieldvalues"))
      value = {
        field: { referenceName: "System.AreaPath" },
        values: [{ value: "Product\\Domain", includeChildren: true }],
      };
    else if (url.includes("/wiql")) {
      expect(opts.body).toContain("UNDER");
      value = { workItems: [{ id: 10 }] };
    } else if (url.includes("/workitems?"))
      value = {
        value: url.includes("ids=10")
          ? [feature]
          : [
              {
                id: 20,
                fields: {
                  "System.AreaPath": "Product\\Domain",
                  "System.WorkItemType": "CM POD",
                  "System.Title": "Pod",
                  "System.State": "New",
                  "System.AssignedTo": {
                    id: "owner",
                    displayName: "Renato Ribeiro",
                  },
                  "Custom.Member1": { id: "person", displayName: "Ana" },
                  "System.CreatedDate": "2026-11-15T10:00:00Z",
                  "Custom.Planned": "2026-12-01",
                },
              },
              {
                id: 30,
                fields: {
                  "System.AreaPath": "Product\\Domain",
                  "System.WorkItemType": "User Story",
                  "System.Title": "Story from another iteration",
                  "System.State": "Active",
                },
              },
            ],
      };
    else if (url.includes("/fields"))
      value = {
        value: [
          { name: "Pod Member 1", referenceName: "Custom.Member1" },
          { name: "Planned Close Date", referenceName: "Custom.Planned" },
        ],
      };
    else if (url.includes("workitemtypes"))
      value = { value: [{ name: "CM POD" }] };
    else throw Error("Unexpected URL " + url);
    return new Response(JSON.stringify(value), {
      headers: { "content-type": "application/json" },
    });
  });
});
describe("read-only TFS discovery", () => {
  it("discovers lanes, custom fields, CM POD membership and stories across iterations", async () => {
    const w = emptyWorkspace();
    w.boardUrl = "https://tfs/Products/Product/_boards/board/t/Domain/Features";
    const r = await fetchBoard(w, { mode: "windows" });
    expect(r.baseLane).toBe("base");
    expect(r.pods[0].feature.column).toBe("Ready");
    expect(r.pods[0].feature.state).toBe("New");
    expect(r.pods[0].owner?.name).toBe("Renato Ribeiro");
    expect(r.pods[0].members[0].name).toBe("Ana");
    expect(r.pods[0].workItems).toHaveLength(1);
    expect(r.pods[0].expected).toBe("2026-12-01");
    for (const [url, opts] of fetchMock.mock.calls) {
      expect(["GET", "POST"]).toContain(opts.method);
      if (opts.method === "POST") expect(url).toContain("/wiql");
    }
  });
  it("reports authentication errors without replacing a saved snapshot", async () => {
    fetchMock.mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    const w = emptyWorkspace();
    w.boardUrl = "https://tfs/Products/Product/_boards/board/t/Domain/Features";
    await expect(fetchBoard(w, { mode: "pat", pat: "secret" })).rejects.toThrow(
      "401",
    );
    expect(w.refreshed).toBeUndefined();
  });
});
