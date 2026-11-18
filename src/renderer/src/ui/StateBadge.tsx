import { Badge, type BadgeProps } from "@fluentui/react-components";
import { stateCategory, type StateCategory } from "@shared/model";

const colors: Record<StateCategory, BadgeProps["color"]> = {
  proposed: "informative",
  active: "brand",
  resolved: "warning",
  done: "success",
};

/** A TFS state, coloured by its category so New/Active/Resolved/Closed read at a glance. */
export function StateBadge({ state }: { state: string }) {
  return (
    <Badge
      appearance="tint"
      shape="rounded"
      color={colors[stateCategory(state)]}
      className="state-badge"
    >
      {state || "No state"}
    </Badge>
  );
}
