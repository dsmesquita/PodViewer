import type { Item } from "../../../shared/model";
import { useWorkItemChildren } from "../hooks/useWorkItemChildren";
import WorkItemPanel from "../WorkItemPanel";
import { ExternalLink, IconButton, StatusIcon } from "../ui/controls";
import { WorkItemType } from "../ui/WorkItemType";
import { useEffect } from "react";
export default function FeaturePage({
  item,
  onCreate,
}: {
  item: Item;
  onCreate: (i: Item) => void;
}) {
  const { children, busy, error, load } = useWorkItemChildren(item);
  useEffect(() => {
    void load();
  }, [item.id]);
  return (
    <section>
      <div className="feature-heading">
        <WorkItemType type="Feature" />
        <ExternalLink item={item} />
        <h1>{item.title}</h1>
        <span className="assignee">
          {item.assigneeName || item.assignedTo || "Unassigned"}
        </span>
        <span className="badge">{item.state}</span>
        <IconButton
          icon="add"
          label={"Create tasks for #" + item.id}
          onClick={() => onCreate(item)}
        />
      </div>
      <StatusIcon message={error} />
      {busy && <span role="status">Loading…</span>}
      {children?.map((child) => (
        <WorkItemPanel key={child.id} item={child} onCreate={onCreate} />
      ))}
    </section>
  );
}
