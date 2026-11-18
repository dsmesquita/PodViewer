import { useEffect } from "react";
import type { Item } from "@shared/model";
import { useShell } from "@/hooks/useShell";
import { useWorkItemChildren } from "@/hooks/useWorkItemChildren";
import { ExternalLink, IconButton, Loading, StatusIcon } from "@/ui/controls";
import { PageToolbar } from "@/ui/PageToolbar";
import { StateBadge } from "@/ui/StateBadge";
import WorkItemPanel from "@/ui/WorkItemPanel";
import { WorkItemType } from "@/ui/WorkItemType";

/** Workspace for an unassigned Feature from Base: its children load on open. */
export default function FeaturePage({ item }: { item: Item }) {
  const { navigate, createTasks } = useShell();
  const { children, busy, error, load } = useWorkItemChildren(item);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <section>
      <PageToolbar
        crumbs={[
          { label: "Base", onClick: () => navigate({ page: "base" }) },
          { label: `Feature #${item.id}` },
        ]}
      />
      <div className="feature-heading">
        <WorkItemType type="Feature" />
        <ExternalLink item={item} />
        <h1>{item.title}</h1>
        <span className="assignee">
          {item.assigneeName || item.assignedTo || "Unassigned"}
        </span>
        <StateBadge state={item.state} />
        <IconButton
          icon="add"
          label={"Create tasks for #" + item.id}
          onClick={() => createTasks(item)}
        />
      </div>
      {busy && <Loading label="Loading work items…" />}
      {error && (
        <div className="action-group">
          <StatusIcon kind="error" message={error} />
          <span>Work items could not be loaded.</span>
          <IconButton
            label="Retry"
            icon="refresh"
            onClick={() => void load()}
          />
        </div>
      )}
      {children?.map((child) => (
        <WorkItemPanel key={child.id} item={child} onCreate={createTasks} />
      ))}
      {children?.length === 0 && !busy && <p>No child work items yet.</p>}
    </section>
  );
}
