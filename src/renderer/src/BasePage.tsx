import { ActionButton } from "./ui/controls";
import WorkItemPanel from "./WorkItemPanel";
import { IconButton, StatusIcon } from "./ui/controls";
import { useState } from "react";
import { assignments, type Workspace, type Item } from "../../shared/model";
export default function BasePage({
  workspace,
  save,
  open,
  onFeature,
}: {
  workspace: Workspace;
  save: (workspace: Workspace) => void;
  open: (i: Item) => void;
  onFeature: (i: Item) => void;
}) {
  const [ids, setIds] = useState("");
  const [message, setMessage] = useState("");
  const eligible = (i: Item) =>
    !/^(resolved|closed)$/i.test(i.state) &&
    workspace.areaPaths.some(
      (a) => i.areaPath === a || i.areaPath?.startsWith(a + "\\"),
    ) &&
    !workspace.pods.some(
      (p) =>
        !workspace.overrides[p.id]?.closed &&
        (p.feature.id === i.id ||
          p.feature.id === i.parentId ||
          p.workItems.some((s) => s.id === i.parentId) ||
          p.cm?.id === i.id ||
          p.workItems.some((s) => s.id === i.id)),
    );
  return (
    <section>
      <p>Available members</p>
      {workspace.roster
        .filter((m) => !assignments(workspace, m).length)
        .map((m) => (
          <span className="badge" key={m.id}>
            {m.name}
          </span>
        ))}
      <h3>Unassigned Features & work items</h3>
      <div className="row">
        <input
          aria-label="Work item IDs"
          placeholder="IDs separated by commas or spaces"
          value={ids}
          onChange={(e) => setIds(e.target.value)}
        />
        <ActionButton
          icon="add"
          label="Add by ID"
          onClick={async () => {
            let next = workspace;
            const messages = [];
            for (const id of [
              ...new Set(ids.split(/[\s,;]+/).filter(Boolean)),
            ]) {
              if (!/^\d+$/.test(id)) {
                messages.push(id + ": invalid ID");
                continue;
              }
              const r = await window.api?.item(Number(id));
              if (!r?.ok) {
                messages.push(
                  id + ": " + (r && !r.ok ? r.message : "Run desktop app"),
                );
                continue;
              }
              if (!eligible(r.value)) {
                messages.push(
                  id +
                    ": completed, outside selected areas, or assigned to a pod",
                );
                continue;
              }
              next = {
                ...next,
                manualIds: [...new Set([...next.manualIds, Number(id)])],
                baseItems: [
                  ...next.baseItems.filter((i) => i.id !== Number(id)),
                  r.value,
                ],
              };
            }
            save(next);
            setMessage(messages.join("\n") || "Items added");
          }}
        >
          Add by ID
        </ActionButton>
      </div>
      <StatusIcon message={message} />
      {workspace.baseItems.filter(eligible).map((i) => (
        <div key={i.id}>
          <WorkItemPanel item={i} onCreate={open} onFeature={onFeature} />
          {workspace.manualIds.includes(i.id) && (
            <IconButton
              label={"Remove #" + i.id + " from Base"}
              icon="remove"
              onClick={() =>
                save({
                  ...workspace,
                  manualIds: workspace.manualIds.filter((id) => id !== i.id),
                  baseItems: workspace.baseItems.filter((x) => x.id !== i.id),
                })
              }
            />
          )}
        </div>
      ))}
    </section>
  );
}
