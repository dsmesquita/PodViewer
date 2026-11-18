import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import {
  Button,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Spinner,
  Tooltip,
} from "@fluentui/react-components";
import {
  AddRegular,
  ArrowClockwiseRegular,
  ArrowExpandRegular,
  ArrowMinimizeRegular,
  ArrowUndoRegular,
  CheckmarkCircleRegular,
  ChevronDownRegular,
  ChevronRightRegular,
  DeleteRegular,
  DismissRegular,
  EditRegular,
  ErrorCircleRegular,
  InfoRegular,
  OpenRegular,
  PanelRightRegular,
  SearchRegular,
  WarningRegular,
} from "@fluentui/react-icons";
import { api } from "@/hooks/api";

const icons = {
  add: AddRegular,
  panel: PanelRightRegular,
  edit: EditRegular,
  refresh: ArrowClockwiseRegular,
  expand: ArrowExpandRegular,
  restore: ArrowMinimizeRegular,
  reset: ArrowUndoRegular,
  open: OpenRegular,
  close: DismissRegular,
  remove: DeleteRegular,
  right: ChevronRightRegular,
  down: ChevronDownRegular,
  search: SearchRegular,
};
export type IconName = keyof typeof icons;

/** Icon-only button. The label is its accessible name and its hover/focus tooltip. */
export function IconButton({
  label,
  icon,
  onClick,
  disabled = false,
  expanded,
}: {
  label: string;
  icon: IconName;
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

const statusGlyphs = {
  warning: WarningRegular,
  error: ErrorCircleRegular,
  info: InfoRegular,
  success: CheckmarkCircleRegular,
};
export type StatusKind = keyof typeof statusGlyphs;

/** Concise tooltip on hover/focus; the full message stays open in a popover on click. */
export function StatusIcon({
  message,
  kind = "warning",
}: {
  message: string;
  kind?: StatusKind;
}) {
  const Glyph = statusGlyphs[kind];
  const [open, setOpen] = useState(false);
  if (!message) return null;
  return (
    <Popover open={open} onOpenChange={(_, d) => setOpen(d.open)} withArrow>
      <PopoverTrigger disableButtonEnhancement>
        <Tooltip
          content={message.length > 130 ? message.slice(0, 127) + "…" : message}
          relationship="description"
        >
          <Button
            aria-label="View status details"
            className={`status-icon status-${kind}`}
            icon={<Glyph />}
            appearance="subtle"
            size="small"
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

/** Opens the work item in TFS through main, which allows only http(s) URLs. */
export function ExternalLink({ item }: { item: { id: number; url: string } }) {
  return (
    <Tooltip content={`Open #${item.id} in TFS`} relationship="description">
      <a
        className="work-item-link"
        href={item.url}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void api()?.open(item.url);
        }}
      >
        #{item.id}
      </a>
    </Tooltip>
  );
}

/** Text button, optionally with an icon. Keeps text for navigation and consequential actions. */
export function ActionButton({
  children,
  icon,
  label,
  appearance,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color"> & {
  icon?: IconName;
  label?: string;
  appearance?: "primary" | "secondary" | "subtle" | "transparent";
}) {
  const Icon = icon && icons[icon];
  const button = (
    <Button
      {...props}
      appearance={appearance}
      aria-label={children ? undefined : label}
      icon={Icon ? <Icon /> : undefined}
    >
      {children}
    </Button>
  );
  return label && label !== children ? (
    <Tooltip content={label} relationship="description">
      {button}
    </Tooltip>
  ) : (
    button
  );
}

/** Spinner announced politely to assistive technology. */
export function Loading({ label }: { label: string }) {
  return (
    <div role="status" className="loading">
      <Spinner size="tiny" label={label} />
    </div>
  );
}
