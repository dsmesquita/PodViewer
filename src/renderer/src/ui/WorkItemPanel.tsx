import { useState } from "react";
import type { Item } from "@shared/model";
import { useWorkItemChildren } from "@/hooks/useWorkItemChildren";
import { ExternalLink, IconButton, Loading, StatusIcon } from "./controls";
import { StateBadge } from "./StateBadge";
import { isTask, WorkItemType } from "./WorkItemType";

const assigneeOf = (item: Item) =>
  item.assigneeName || item.assignedTo || "Unassigned";

/** A Task (or any leaf) row: its ID opens TFS; the row itself has no other controls. */
export function WorkItemRow({ item }: { item: Item }) {
  return (
    <div className="task-row">
      <WorkItemType type={item.type} />
      <ExternalLink item={item} />
      <span className="item-summary" title={item.title}>
        {item.title}
      </span>
      <span className="assignee">{assigneeOf(item)}</span>
      <StateBadge state={item.state} />
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

/** Features open their workspace; other parents expand inline to their Tasks. */
export default function WorkItemPanel(props: PanelProps) {
  if (isTask(props.item.type)) return <WorkItemRow item={props.item} />;
  return props.podChildren ? (
    <ParentPanel
      {...props}
      items={props.podChildren[props.item.id] ?? props.item.children}
    />
  ) : (
    <LazyParentPanel {...props} />
  );
}

function LazyParentPanel(props: PanelProps) {
  const { children, ...details } = useWorkItemChildren(props.item);
  return <ParentPanel {...props} {...details} items={children} />;
}

function ParentPanel({
  item,
  onCreate,
  onFeature,
  podChildren,
  ancestors = [],
  items,
  busy,
  error,
  load,
}: PanelProps & {
  items?: Item[];
  busy?: boolean;
  error?: string;
  load?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const feature = item.type?.toLowerCase() === "feature";
  const toggle = () => {
    setExpanded(!expanded);
    if (!expanded && !items) load?.();
  };
  const path = [...ancestors, item.id];
  const visibleChildren = items?.filter((child) => !path.includes(child.id));
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
            type="button"
            className="work-item-title"
            aria-expanded={feature ? undefined : expanded}
            onClick={feature ? () => onFeature?.(item) : toggle}
          >
            {item.title}
          </button>
        )}
        <span className="assignee">{assigneeOf(item)}</span>
        <StateBadge state={item.state} />
        <IconButton
          label={"Create tasks for #" + item.id}
          icon="add"
          onClick={() => onCreate(item)}
        />
      </div>
      {expanded && (
        <div className="work-item-children">
          {busy && <Loading label="Loading Tasks…" />}
          {error && (
            <div className="action-group">
              <StatusIcon kind="error" message={error} />
              {load && (
                <IconButton
                  label="Retry loading Tasks"
                  icon="refresh"
                  onClick={load}
                />
              )}
            </div>
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
