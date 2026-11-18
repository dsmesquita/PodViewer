import { useState } from "react";
import {
  Field,
  Input,
  MessageBar,
  MessageBarBody,
} from "@fluentui/react-components";
import { available, inAreas, type Item, type Workspace } from "@shared/model";
import { call } from "@/hooks/api";
import { useShell } from "@/hooks/useShell";
import { useWorkspace } from "@/hooks/useWorkspace";
import { ActionButton, IconButton } from "@/ui/controls";
import { PageToolbar } from "@/ui/PageToolbar";
import { PersonAvatar } from "@/ui/PersonAvatar";
import WorkItemPanel from "@/ui/WorkItemPanel";

/** Unfinished, in-scope work that no open pod already covers. */
function eligible(workspace: Workspace, i: Item) {
  return (
    !/^(resolved|closed)$/i.test(i.state) &&
    inAreas(workspace.areaPaths, i.areaPath) &&
    !workspace.pods.some(
      (p) =>
        !workspace.overrides[p.id]?.closed &&
        (p.feature.id === i.id ||
          p.feature.id === i.parentId ||
          p.workItems.some((s) => s.id === i.parentId) ||
          p.cm?.id === i.id ||
          p.workItems.some((s) => s.id === i.id)),
    )
  );
}

export default function BasePage({ drawer = false }: { drawer?: boolean }) {
  const { workspace, persist } = useWorkspace();
  const { navigate, createTasks } = useShell();
  const [ids, setIds] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<{
    added: number;
    problems: string[];
  }>();
  const people = available(workspace);
  const items = workspace.baseItems.filter((i) => eligible(workspace, i));

  async function addByIds() {
    setBusy(true);
    let next = workspace;
    let added = 0;
    const problems: string[] = [];
    for (const id of [...new Set(ids.split(/[\s,;]+/).filter(Boolean))]) {
      if (!/^\d+$/.test(id)) {
        problems.push(`${id}: not a work-item ID`);
        continue;
      }
      const result = await call((api) => api.item(Number(id)));
      if (!result.ok) {
        problems.push(`#${id}: ${result.message}`);
        continue;
      }
      if (!eligible(next, result.value)) {
        problems.push(
          `#${id}: completed, outside the selected Area Paths, or already in a pod`,
        );
        continue;
      }
      added++;
      next = {
        ...next,
        manualIds: [...new Set([...next.manualIds, Number(id)])],
        baseItems: [
          ...next.baseItems.filter((i) => i.id !== Number(id)),
          result.value,
        ],
      };
    }
    persist(next);
    setBusy(false);
    setOutcome({ added, problems });
    if (added) setIds("");
  }

  return (
    <section className="base-page">
      {!drawer && <PageToolbar />}
      <section className="page-section">
        <h2>Available members</h2>
        {people.length ? (
          <ul className="chip-list">
            {people.map((m) => (
              <li key={m.id} className="person-chip">
                <PersonAvatar person={m} size={24} />
                {m.name}
              </li>
            ))}
          </ul>
        ) : (
          <p>Everyone on the roster is in a pod.</p>
        )}
      </section>
      <section className="page-section">
        <h2>Unassigned Features &amp; work items</h2>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (ids.trim() && !busy) void addByIds();
          }}
        >
          <Field
            label="Add work items by ID"
            hint="Separate several IDs with commas or spaces."
          >
            <Input value={ids} onChange={(_, d) => setIds(d.value)} />
          </Field>
          <ActionButton type="submit" icon="add" disabled={!ids.trim() || busy}>
            {busy ? "Adding…" : "Add by ID"}
          </ActionButton>
        </form>
        <div role="status">
          {outcome && (
            <MessageBar
              intent={outcome.problems.length ? "warning" : "success"}
              layout="multiline"
            >
              <MessageBarBody>
                {outcome.added > 0 &&
                  `Added ${outcome.added} work item${outcome.added > 1 ? "s" : ""}. `}
                {outcome.problems.join(" · ")}
              </MessageBarBody>
            </MessageBar>
          )}
        </div>
        {items.map((i) => (
          <div className="base-item" key={i.id}>
            <WorkItemPanel
              item={i}
              onCreate={createTasks}
              onFeature={(item) => navigate({ page: "feature", id: item.id })}
            />
            {workspace.manualIds.includes(i.id) && (
              <IconButton
                label={"Remove #" + i.id + " from Base"}
                icon="remove"
                onClick={() =>
                  persist({
                    ...workspace,
                    manualIds: workspace.manualIds.filter((id) => id !== i.id),
                    baseItems: workspace.baseItems.filter((x) => x.id !== i.id),
                  })
                }
              />
            )}
          </div>
        ))}
        {!items.length && <p>No unassigned work in the selected Area Paths.</p>}
      </section>
    </section>
  );
}
