import { useEffect, useState, type ReactNode } from "react";
import { Badge, Spinner, Tooltip, Button } from "@fluentui/react-components";
import { ArrowClockwiseRegular } from "@fluentui/react-icons";
import { useShell } from "@/hooks/useShell";
import { useWorkspace } from "@/hooks/useWorkspace";
import { ErrorBar } from "@/ui/Notifications";
import { relativeTime } from "@/ui/format";
import { navLabels, navPages, navSection } from "./routes";

/** Re-renders every minute so relative times stay accurate. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { route, dashboard, navigate, full } = useShell();
  const { workspace, mode, busy, error, setError, refresh } = useWorkspace();
  const now = useNow();
  const active = navSection(route, dashboard);
  const updated = workspace.refreshed
    ? relativeTime(workspace.refreshed, now)
    : "";
  const status =
    mode === "mock"
      ? "Serving the local mock/ folder · no TFS connection"
      : !workspace.boardUrl
        ? "Not connected · add a Features board in Settings"
        : error
          ? updated
            ? `Offline · showing the snapshot from ${updated}`
            : "Not connected · check the board URL and network"
          : `Connected to ${hostOf(workspace.boardUrl) || "TFS"}`;

  return (
    <div className={full ? "shell focus-content" : "shell"}>
      <header hidden={full}>
        <div className="brand">
          <span className="logo" aria-hidden>
            ◈
          </span>
          <strong>Pod Viewer</strong>
          {mode === "mock" && (
            <Badge appearance="tint" color="warning">
              Mock data
            </Badge>
          )}
        </div>
        <nav aria-label="Main">
          {navPages.map((page) => (
            <Button
              key={page}
              appearance="subtle"
              className={active === page ? "nav-item active" : "nav-item"}
              aria-current={active === page ? "page" : undefined}
              onClick={() => navigate({ page })}
            >
              {navLabels[page]}
            </Button>
          ))}
        </nav>
        <div className="refresh">
          {updated && !busy && <small>Updated {updated}</small>}
          {busy && (
            <Spinner size="tiny" label="Refreshing…" labelPosition="before" />
          )}
          <Tooltip
            content={busy ? "Refreshing" : "Refresh"}
            relationship="label"
          >
            <Button
              appearance="subtle"
              aria-label={busy ? "Refreshing" : "Refresh"}
              icon={<ArrowClockwiseRegular />}
              disabled={busy}
              onClick={() => void refresh()}
            />
          </Tooltip>
        </div>
      </header>
      <ErrorBar message={error} onDismiss={() => setError("")} />
      <main>{children}</main>
      <footer hidden={full}>
        <span>{status}</span>
        <span>Local planning · only task creation writes to TFS</span>
      </footer>
    </div>
  );
}
