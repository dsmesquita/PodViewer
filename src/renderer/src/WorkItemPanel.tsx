import { useState } from "react";
import type { Item } from "../../shared/model";
import { useWorkItemChildren } from "./hooks/useWorkItemChildren";
import { ExternalLink, IconButton, StatusIcon } from "./ui/controls";
import { isTask, WorkItemType } from "./ui/WorkItemType";

export function WorkItemRow({ item }: { item: Item }) {
  return (
    <div className="task-row">
      <WorkItemType type={item.type} />
      <ExternalLink item={item} />
      <span className="item-summary" title={item.title}>
        {item.title}
      </span>
      <span className="assignee">
        {item.assigneeName || item.assignedTo || "Unassigned"}
      </span>
      <span className="badge">{item.state}</span>
    </div>
  );
}

type PanelProps = {
  item: Item;
  onCreate: (item: Item) => void;
  onFeature?: (item: Item) => void;
  podChildren?: Record<number, Item[]>;
  ancestors?: number[];
};

export default function WorkItemPanel(props: PanelProps) {
  if (isTask(props.item.type)) return <WorkItemRow item={props.item} />;
  return props.podChildren ? (
    <ParentPanel
      {...props}
      children={props.podChildren[props.item.id] ?? props.item.children}
    />
  ) : (
    <LazyParentPanel {...props} />
  );
}

function LazyParentPanel(props: PanelProps) {
  const details = useWorkItemChildren(props.item);
  return <ParentPanel {...props} {...details} />;
}

function ParentPanel({
  item,
  onCreate,
  onFeature,
  podChildren,
  ancestors = [],
  children,
  busy,
  error,
  load,
}: PanelProps & {
  children?: Item[];
  busy?: boolean;
  error?: string;
  load?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const feature = item.type?.toLowerCase() === "feature";
  const toggle = () => {
    setExpanded(!expanded);
    if (!expanded && !children) load?.();
  };
  const path = [...ancestors, item.id];
  const visibleChildren = children?.filter((child) => !path.includes(child.id));
  return (
    <article className="work-item-panel">
      <div className="work-item-header">
        {!feature && (
          <IconButton
            label={expanded ? "Collapse Tasks" : "Expand Tasks"}
            icon={expanded ? "down" : "right"}
            onClick={toggle}
            expanded={expanded}
          />
        )}
        <WorkItemType type={item.type} />
        <ExternalLink item={item} />
        {feature && !onFeature ? (
          <span className="work-item-title">{item.title}</span>
        ) : (
          <button
            className="work-item-title"
            aria-expanded={feature ? undefined : expanded}
            onClick={feature ? () => onFeature?.(item) : toggle}
          >
            {item.title}
          </button>
        )}
        <span className="assignee">
          {item.assigneeName || item.assignedTo || "Unassigned"}
        </span>
        <span className="badge">{item.state}</span>
        <IconButton
          label={"Create tasks for #" + item.id}
          icon="add"
          onClick={() => onCreate(item)}
        />
      </div>
      {expanded && (
        <div className="work-item-children">
          {busy && <span role="status">Loading…</span>}
          {error && <StatusIcon message={error} />}
          {error && load && (
            <IconButton
              label="Retry loading Tasks"
              icon="refresh"
              onClick={load}
            />
          )}
          {visibleChildren?.map((child) => (
            <WorkItemPanel
              key={child.id}
              item={child}
              onCreate={onCreate}
              podChildren={podChildren}
              ancestors={path}
            />
          ))}
          {visibleChildren?.length === 0 && !busy && !error && (
            <span className="empty-tasks">No Tasks</span>
          )}
        </div>
      )}
    </article>
  );
}
