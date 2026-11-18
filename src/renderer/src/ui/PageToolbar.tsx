import {
  Breadcrumb,
  BreadcrumbButton,
  BreadcrumbDivider,
  BreadcrumbItem,
} from "@fluentui/react-components";
import { Fragment, type ReactNode } from "react";
import { useShell } from "@/hooks/useShell";
import { IconButton } from "./controls";

export type Crumb = { label: string; onClick?: () => void };

/** Breadcrumb trail on the left, page actions and the full-screen toggle on the right. */
export function PageToolbar({
  crumbs,
  children,
}: {
  crumbs?: Crumb[];
  children?: ReactNode;
}) {
  const { full, setFull } = useShell();
  return (
    <div className="page-toolbar">
      {crumbs && (
        <Breadcrumb aria-label="Location" size="medium">
          {crumbs.map((crumb, i) => (
            <Fragment key={crumb.label + i}>
              {i > 0 && <BreadcrumbDivider />}
              <BreadcrumbItem>
                <BreadcrumbButton
                  onClick={crumb.onClick}
                  current={i === crumbs.length - 1}
                >
                  {crumb.label}
                </BreadcrumbButton>
              </BreadcrumbItem>
            </Fragment>
          ))}
        </Breadcrumb>
      )}
      <div className="page-toolbar-actions">
        {children}
        <IconButton
          label={full ? "Restore" : "Full screen"}
          icon={full ? "restore" : "expand"}
          onClick={() => setFull(!full)}
        />
      </div>
    </div>
  );
}
