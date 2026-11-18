import { emptyWorkspace, today, type Workspace } from "./model";
export function sample(): Workspace {
  const w = emptyWorkspace();
  w.areaPaths = ["Product"];
  w.ownerInitialized = true;
  const names = [
    "Ana Martins",
    "Miguel Costa",
    "Sofia Silva",
    "Pedro Santos",
    "Inês Ferreira",
    "João Sousa",
  ];
  w.roster = names.map((name, i) => ({ id: String(i), name }));
  w.skills = ["MES configuration", "TypeScript", "Architecture", "Validation"];
  w.levels = {
    "0": { "MES configuration": 4, TypeScript: 3 },
    "1": { Architecture: 4 },
    "4": { Validation: 3 },
  };
  w.pods = [
    "Batch execution",
    "Electronic signatures",
    "Production traceability",
  ].map((title, i) => ({
    id: String(i),
    laneId: String(i),
    lane: ["Pod Atlas", "Pod Orbit", "Pod Trace"][i],
    feature: {
      type: "Feature",
      id: 160000 + i,
      title,
      state: i === 1 ? "New" : "Active",
      column: i === 1 ? "Ready" : "Active",
      url: "https://example.com/_workitems/edit/" + (160000 + i),
    },
    owner: { id: "leader", name: "Renato Ribeiro" },
    members: w.roster.slice(i * 2, i * 2 + 2),
    created: "2026-11-16",
    expected: i === 0 ? today() : undefined,
    workItems: ["Design", "Implementation", "Validation"].map((s, j) => ({
      id: 170000 + i * 3 + j,
      type: j === 2 ? "Bug" : "User Story",
      assigneeName: j < 2 ? names[i * 2 + j] : undefined,
      children:
        j === 1
          ? [
              {
                id: 180000 + i,
                title: "Review implementation",
                state: "Active",
                type: "Task",
                assigneeName: names[i * 2],
                url: "https://example.com/_workitems/edit/" + (180000 + i),
              },
            ]
          : [],
      title: `${title}: ${s}`,
      state: ["Closed", "Active", "New"][j],
      url: "https://example.com/_workitems/edit/" + (170000 + i * 3 + j),
    })),
  }));
  w.pods[2].members = [];
  w.refreshed = new Date().toISOString();
  return w;
}
