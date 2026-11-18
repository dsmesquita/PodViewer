const types = new Map([
  ["epic", ["epic", "Epic"]],
  ["feature", ["feature", "Feature"]],
  ["bug", ["bug", "Bug"]],
  ["user story", ["story", "User Story"]],
  ["task", ["task", "Task"]],
  ["pod", ["pod", "Pod"]],
  ["cm pod", ["pod", "CM POD"]],
]);
export const isTask = (type?: string) => type?.trim().toLowerCase() === "task";
export function WorkItemType({ type }: { type?: string }) {
  const [color, label] = types.get(type?.trim().toLowerCase() ?? "") ?? [
    "unknown",
    type || "Work item",
  ];
  return <span className={`type-badge type-${color}`}>{label}</span>;
}
