import { net, session } from "electron";
import { parseTfsUrl } from "./url";
import { workItemAssignee } from "./tfs";
import type { Item, Workspace } from "../shared/model";
export interface Draft {
  title: string;
  assignedTo?: string;
  estimate: number;
}
export function actions(
  w: Workspace,
  auth: { mode: string; pat?: string; version: string },
) {
  const t = parseTfsUrl(w.boardUrl);
  if (auth.mode === "windows")
    session.defaultSession.allowNTLMCredentialsForDomains(t.host);
  const allowed = (area: string) =>
    w.areaPaths.some(
      (a) =>
        area.toLowerCase() === a.toLowerCase() ||
        area.toLowerCase().startsWith(a.toLowerCase() + "\\"),
    );
  async function request(path: string, patch?: unknown): Promise<any> {
    const r = await net.fetch(
      path +
        (path.includes("?") ? "&" : "?") +
        "api-version=" +
        (auth.version || "7.0"),
      {
        method: patch ? "POST" : "GET",
        headers: {
          Accept: "application/json",
          ...(patch ? { "Content-Type": "application/json-patch+json" } : {}),
          ...(auth.mode === "pat"
            ? {
                Authorization:
                  "Basic " +
                  Buffer.from(":" + (auth.pat || "")).toString("base64"),
              }
            : {}),
        },
        ...(patch ? { body: JSON.stringify(patch) } : {}),
        credentials: "include",
        signal: AbortSignal.timeout(30000),
      },
    );
    if (!r.ok)
      throw Error(`TFS ${r.status}: ${(await r.text()).slice(0, 300)}`);
    return r.json();
  }
  const convert = (r: any): Item => {
    return {
      parentId:
        Number(
          r.relations
            ?.find(
              (rel: any) => rel.rel === "System.LinkTypes.Hierarchy-Reverse",
            )
            ?.url.split("/")
            .pop(),
        ) || undefined,
      ...workItemAssignee(r.fields["System.AssignedTo"]),
      id: r.id,
      title: r.fields["System.Title"],
      state: r.fields["System.State"],
      type: r.fields["System.WorkItemType"],
      areaPath: r.fields["System.AreaPath"],
      iterationPath: r.fields["System.IterationPath"],
      tags: r.fields["System.Tags"],
      url: `${t.projectBase}/_workitems/edit/${r.id}`,
    };
  };
  async function raw(id: number) {
    if (!Number.isSafeInteger(id) || id < 1)
      throw Error("Enter a positive work-item ID");
    const r = await request(
      `${t.projectBase}/_apis/wit/workitems/${id}?$expand=relations`,
    );
    if (!allowed(r.fields["System.AreaPath"] || ""))
      throw Error("Work item is outside the configured Area Paths");
    return r;
  }
  return {
    async item(id: number) {
      const r = await raw(id);
      const children: Item[] = [];
      for (const rel of r.relations || [])
        if (rel.rel === "System.LinkTypes.Hierarchy-Forward") {
          try {
            children.push(convert(await raw(Number(rel.url.split("/").pop()))));
          } catch (error) {
            if (!String(error).includes("outside the configured Area Paths"))
              throw error;
          }
        }
      return { ...convert(r), children };
    },
    async people(name: string) {
      if (typeof name !== "string" || name.trim().length < 2)
        throw Error("Enter at least two characters");
      try {
        const r = await request(
          `${t.collectionBase}/_apis/identities?searchFilter=General&filterValue=${encodeURIComponent(name.trim())}&queryMembership=None`,
        );
        return r.value
          .filter((p: any) => !p.isContainer && p.isActive !== false)
          .map((p: any) => ({
            id: p.id,
            name: p.providerDisplayName,
            account: (() => {
              const account =
                p.properties?.Account?.$value || p.properties?.Mail?.$value;
              const domain = p.properties?.Domain?.$value;
              return account &&
                domain &&
                !account.includes("\\") &&
                !account.includes("@")
                ? domain + "\\" + account
                : account;
            })(),
          }))
          .filter((p: any) => p.account);
      } catch (e) {
        throw Error(
          "Identity lookup failed. Check Identity Read permission. " +
            String(e),
        );
      }
    },
    async create(id: number, drafts: Draft[]) {
      if (
        !Array.isArray(drafts) ||
        !drafts.length ||
        drafts.length > 100 ||
        drafts.some(
          (d) =>
            !d ||
            typeof d.title !== "string" ||
            !d.title.trim() ||
            typeof d.estimate !== "number" ||
            !Number.isFinite(d.estimate) ||
            d.estimate < 0 ||
            (d.assignedTo !== undefined && typeof d.assignedTo !== "string"),
        )
      )
        throw Error("Invalid task drafts");
      const parent = await raw(id);
      const results = [];
      for (const [index, d] of drafts.entries()) {
        const patch: any[] = [];
        const set = (f: string, v: unknown) => {
          if (v !== undefined && v !== "")
            patch.push({ op: "add", path: "/fields/" + f, value: v });
        };
        set("System.Title", d.title.trim());
        set("System.AssignedTo", d.assignedTo);
        for (const f of [
          "System.AreaPath",
          "System.IterationPath",
          "System.Tags",
        ])
          set(f, parent.fields[f]);
        if (d.estimate > 0) {
          set("Microsoft.VSTS.Scheduling.OriginalEstimate", d.estimate);
          set("Microsoft.VSTS.Scheduling.RemainingWork", d.estimate);
        }
        patch.push({
          op: "add",
          path: "/relations/-",
          value: {
            rel: "System.LinkTypes.Hierarchy-Reverse",
            url: parent.url || `${t.collectionBase}/_apis/wit/workitems/${id}`,
          },
        });
        try {
          const r = await request(
            `${t.projectBase}/_apis/wit/workitems/$Task`,
            patch,
          );
          results.push({ index, item: convert(r), status: "created" });
        } catch (e) {
          results.push({
            index,
            status: /TFS 4\d\d/.test(String(e)) ? "failed" : "uncertain",
            message: String(e),
          });
        }
      }
      return results;
    },
  };
}
