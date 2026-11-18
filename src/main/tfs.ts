import { net, session } from "electron";
import { parseTfsUrl } from "./url";
import {
  dateOf,
  type Person,
  type Pod,
  type Item,
  type Workspace,
} from "../shared/model";
type Raw = {
  id: number;
  fields: Record<string, unknown>;
  relations?: { rel: string; url: string }[];
};
export function person(raw: unknown): Person | undefined {
  if (!raw) return;
  if (typeof raw === "string") {
    if (raw === "Unassigned") return;
    const account = raw.match(/<(.+)>/)?.[1] || raw;
    return {
      id: account.toLowerCase(),
      name: raw.replace(/\s*<.+>/, ""),
      account,
    };
  }
  if (typeof raw !== "object") return;
  const r = raw as Record<string, string>;
  if (
    !r.displayName ||
    !(r.id || r.uniqueName) ||
    r.displayName === "Unassigned"
  )
    return;
  return {
    id: r.id || r.uniqueName,
    name: r.displayName,
    account: r.uniqueName,
  };
}
export function workItemAssignee(
  raw: unknown,
): Pick<Item, "assigneeName" | "assigneeId" | "assignedTo"> {
  const assignee = person(raw);
  const id = raw && typeof raw === "object" && "id" in raw ? raw.id : undefined;
  return {
    assigneeName: assignee?.name,
    assigneeId: assignee && typeof id === "string" ? id : undefined,
    assignedTo: assignee?.account,
  };
}

export async function fetchBoard(
  w: Workspace,
  auth: { mode: string; pat?: string; version?: string },
) {
  const t = parseTfsUrl(w.boardUrl);
  if (!t.project || !t.team)
    throw Error("Paste a Features board URL containing its project and team.");
  if (auth.mode === "windows")
    session.defaultSession.allowNTLMCredentialsForDomains(t.host);
  let version = auth.version || "7.0";
  async function request(path: string, body?: unknown): Promise<any> {
    const res = await net.fetch(
      `${path}${path.includes("?") ? "&" : "?"}api-version=${version}`,
      {
        method: body ? "POST" : "GET",
        headers: {
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(auth.mode === "pat"
            ? {
                Authorization:
                  "Basic " +
                  Buffer.from(":" + (auth.pat || "")).toString("base64"),
              }
            : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        credentials: "include",
        signal: AbortSignal.timeout(30000),
      },
    );
    if (!res.ok)
      throw Error(`TFS ${res.status}: ${(await res.text()).slice(0, 350)}`);
    if (!(res.headers.get("content-type") || "").includes("json"))
      throw Error("TFS returned a sign-in page. Check authentication.");
    return res.json();
  }
  const teamBase = `${t.projectBase}/${encodeURIComponent(t.team)}/_apis/work`;
  let board: any;
  for (const v of [...new Set([version, "7.0", "6.0", "5.0", "4.1", "3.0"])]) {
    version = v;
    try {
      board = await request(`${teamBase}/boards/Features`);
      break;
    } catch (e) {
      if (!String(e).includes("400")) throw e;
    }
  }
  if (!board)
    throw Error("This server does not support the required board API.");
  const areas = await request(`${teamBase}/teamsettings/teamfieldvalues`);
  const escape = (s: string) => s.replace(/'/g, "''");
  const selectedAreas = w.areaPaths.length
    ? w.areaPaths
    : !w.areasInitialized
      ? areas.values.map((a: any) => a.value)
      : [];
  if (!selectedAreas.length)
    throw Error("Select at least one Area Path in Settings.");
  const inScope = (r: Raw) =>
    selectedAreas.some(
      (a: string) =>
        String(r.fields["System.AreaPath"]).toLowerCase() === a.toLowerCase() ||
        String(r.fields["System.AreaPath"])
          .toLowerCase()
          .startsWith(a.toLowerCase() + "\\"),
    );
  const scope = selectedAreas
    .map((value: string) => ({ value, includeChildren: true }))
    .map(
      (a: any) =>
        `[${areas.field.referenceName}] ${a.includeChildren ? "UNDER" : "="} '${escape(a.value)}'`,
    )
    .join(" OR ");
  if (!scope) throw Error("The TFS team has no area scope.");
  const query = await request(`${t.projectBase}/_apis/wit/wiql`, {
    query: `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '${escape(t.project)}' AND [System.WorkItemType] = 'Feature' AND (${scope})`,
  });
  async function batch(ids: number[]): Promise<Raw[]> {
    const out: Raw[] = [];
    const unique = [...new Set(ids)];
    for (let i = 0; i < unique.length; i += 100) {
      const r = await request(
        `${t.projectBase}/_apis/wit/workitems?ids=${unique.slice(i, i + 100).join(",")}&$expand=relations&errorPolicy=Omit`,
      );
      out.push(...r.value);
    }
    return out;
  }
  const features = (
    await batch([
      ...query.workItems.map((i: any) => i.id),
      ...w.pods.map((p) => p.feature.id),
    ])
  ).filter(inScope);
  const linkedIds = features.flatMap((f) =>
    (f.relations || [])
      .filter((r) => /Hierarchy-Forward|Related|Hierarchy-Reverse/.test(r.rel))
      .map((r) => Number(r.url.split("/").pop()))
      .filter(Number.isFinite),
  );
  const linked = (await batch(linkedIds)).filter(inScope);
  const types = await request(`${t.projectBase}/_apis/wit/workitemtypes`);
  const cmType = types.value.find(
    (x: any) => x.name.toUpperCase() === "CM POD",
  );
  const metadata = cmType
    ? await request(
        `${t.projectBase}/_apis/wit/workitemtypes/${encodeURIComponent(cmType.name)}/fields`,
      )
    : { value: [] };
  const fields = metadata.value as { name: string; referenceName: string }[];
  const memberFields = w.fields.members.length
    ? w.fields.members
    : fields
        .filter((f) => /^Pod Member\s*\d+\s*:?$/i.test(f.name))
        .map((f) => f.referenceName);
  const plannedCandidates = fields.filter((f) =>
    /^Planned Close Date\s*:?$/i.test(f.name),
  );
  const planned =
    w.fields.planned ||
    (plannedCandidates.length === 1
      ? plannedCandidates[0].referenceName
      : undefined);
  const diagnostics: string[] = [];
  if (!w.fields.planned && plannedCandidates.length > 1)
    diagnostics.push("Map the ambiguous Planned Close Date field in Settings.");
  if (!memberFields.length)
    diagnostics.push("Map CM POD member fields in Settings.");
  const rows = board.rows.filter((r: any) => r.name) as {
    id: string;
    name: string;
  }[];
  const baseLane =
    w.baseLane || rows.find((r) => /^base( lane)?$/i.test(r.name))?.id || "";
  const item = (r: Raw): Item => {
    return {
      type: String(r.fields["System.WorkItemType"] || ""),
      areaPath: String(r.fields["System.AreaPath"] || ""),
      iterationPath: String(r.fields["System.IterationPath"] || ""),
      tags: String(r.fields["System.Tags"] || ""),
      ...workItemAssignee(r.fields["System.AssignedTo"]),
      id: r.id,
      title: String(r.fields["System.Title"] || ""),
      state: String(r.fields["System.State"] || ""),
      url: `${t.projectBase}/_workitems/edit/${r.id}`,
    };
  };
  const pods: Pod[] = [];
  for (const lane of rows.filter((r) => r.id !== baseLane)) {
    const found = features.filter(
      (f) =>
        f.fields[board.fields.rowField.referenceName] === lane.name ||
        f.fields[board.fields.rowField.referenceName] === lane.id,
    );
    if (found.length > 1) {
      diagnostics.push(
        `${lane.name}: multiple Features; resolve the lane in TFS.`,
      );
      continue;
    }
    if (!found.length) continue;
    const f = found[0];
    const related = new Set(
      (f.relations || []).map((r) => Number(r.url.split("/").pop())),
    );
    const cms = linked.filter(
      (r) =>
        related.has(r.id) &&
        String(r.fields["System.WorkItemType"]).toUpperCase() === "CM POD",
    );
    if (cms.length > 1) {
      diagnostics.push(
        `${lane.name}: multiple linked CM POD records; resolve links in TFS.`,
      );
      continue;
    }
    const cm = cms[0];
    if (!cm)
      diagnostics.push(
        `${lane.name}: no linked CM POD; cannot match an owner filter.`,
      );
    const old = w.pods.find(
      (p) => p.feature.id === f.id && (!cm || !p.cm || p.cm.id === cm.id),
    );
    pods.push({
      id: old?.id || `${board.id}:${cm ? "cm" + cm.id : "feature" + f.id}`,
      laneId: lane.id,
      lane: lane.name,
      feature: {
        ...item(f),
        column: String(f.fields[board.fields.columnField.referenceName] || ""),
      },
      cm: cm && item(cm),
      owner: cm && person(cm.fields["System.AssignedTo"]),
      members: cm
        ? memberFields
            .map((key) => person(cm.fields[key]))
            .filter((p): p is Person => !!p)
        : [],
      created: cm && dateOf(cm.fields["System.CreatedDate"]),
      expected: cm && planned ? dateOf(cm.fields[planned]) : undefined,
      workItems: linked
        .filter(
          (r) =>
            related.has(r.id) &&
            ["User Story", "Bug"].includes(
              String(r.fields["System.WorkItemType"]),
            ) &&
            (f.relations || []).some(
              (rel) =>
                rel.rel === "System.LinkTypes.Hierarchy-Forward" &&
                Number(rel.url.split("/").pop()) === r.id,
            ),
        )
        .map(item),
    });
  }
  return {
    pods,
    areaPaths: selectedAreas,
    baseItems: features
      .filter(
        (f) =>
          !pods.some((p) => p.feature.id === f.id) &&
          !w.pods.some(
            (p) => p.feature.id === f.id && !w.overrides[p.id]?.closed,
          ) &&
          !/^(resolved|closed)$/i.test(String(f.fields["System.State"])),
      )
      .map(item),
    diagnostics,
    availableFields: fields,
    lanes: rows,
    baseLane,
    version,
  };
}
