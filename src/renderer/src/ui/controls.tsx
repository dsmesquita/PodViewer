import { useState, type ReactNode } from "react";
import {
  Button,
  Tooltip,
  Popover,
  PopoverTrigger,
  PopoverSurface,
} from "@fluentui/react-components";
import {
  AddRegular,
  PanelRightRegular,
  EditRegular,
  ArrowClockwiseRegular,
  ArrowLeftRegular,
  ArrowExpandRegular,
  ArrowMinimizeRegular,
  ArrowUndoRegular,
  OpenRegular,
  DismissRegular,
  DeleteRegular,
  WarningRegular,
  InfoRegular,
  ErrorCircleRegular,
  CheckmarkCircleRegular,
  ChevronRightRegular,
  ChevronDownRegular,
} from "@fluentui/react-icons";
const icons = {
  add: AddRegular,
  panel: PanelRightRegular,
  edit: EditRegular,
  refresh: ArrowClockwiseRegular,
  back: ArrowLeftRegular,
  expand: ArrowExpandRegular,
  restore: ArrowMinimizeRegular,
  reset: ArrowUndoRegular,
  open: OpenRegular,
  close: DismissRegular,
  remove: DeleteRegular,
  right: ChevronRightRegular,
  down: ChevronDownRegular,
};
export function IconButton({
  label,
  icon,
  onClick,
  disabled = false,
  expanded,
}: {
  label: string;
  icon: keyof typeof icons;
  onClick: () => void;
  disabled?: boolean;
  expanded?: boolean;
}) {
  const Icon = icons[icon];
  return (
    <Tooltip content={label} relationship="label">
      <Button
        aria-label={label}
        icon={<Icon />}
        appearance="subtle"
        disabled={disabled}
        aria-expanded={expanded}
        onClick={onClick}
      />
    </Tooltip>
  );
}
export function StatusIcon({
  message,
  kind = "warning",
}: {
  message: string;
  kind?: "warning" | "error" | "info" | "success";
}) {
  const StatusGlyph =
    kind === "info"
      ? InfoRegular
      : kind === "error"
        ? ErrorCircleRegular
        : kind === "success"
          ? CheckmarkCircleRegular
          : WarningRegular;
  const [open, setOpen] = useState(false);
  if (!message) return null;
  return (
    <Popover open={open} onOpenChange={(_, d) => setOpen(d.open)}>
      <PopoverTrigger disableButtonEnhancement>
        <Tooltip
          content={message.length > 130 ? message.slice(0, 127) + "…" : message}
          relationship="description"
        >
          <Button
            aria-label="View status details"
            icon={<StatusGlyph />}
            appearance="subtle"
            onClick={() => setOpen(!open)}
          />
        </Tooltip>
      </PopoverTrigger>
      <PopoverSurface>
        <div className="status-details">{message}</div>
      </PopoverSurface>
    </Popover>
  );
}
export function ActionGroup({ children }: { children: ReactNode }) {
  return <div className="action-group">{children}</div>;
}
export function ExternalLink({ item }: { item: { id: number; url: string } }) {
  return (
    <a
      href={item.url}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void window.api?.open(item.url);
      }}
    >
      #{item.id}
    </a>
  );
}
export function ActionButton({
  children,
  icon,
  label,
  ...props
}: import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: keyof typeof icons;
  label?: string;
  appearance?: "primary" | "secondary" | "subtle";
}) {
  if (icon) {
    const Icon = icons[icon];
    const accessibleLabel = label || props["aria-label"] || "Action";
    return (
      <Tooltip content={accessibleLabel} relationship="label">
        <Button
          {...props}
          aria-label={accessibleLabel}
          appearance="subtle"
          icon={<Icon />}
        >
          {children}
        </Button>
      </Tooltip>
    );
  }
  return <Button {...props}>{children}</Button>;
}
