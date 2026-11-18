import type { ReactNode } from "react";
import { Switch } from "@fluentui/react-components";
import { assignments, available, visible } from "@shared/model";
import { sample } from "@shared/sample";
import { useShell } from "@/hooks/useShell";
import { useWorkspace } from "@/hooks/useWorkspace";
import { ActionButton } from "@/ui/controls";
import { PageToolbar } from "@/ui/PageToolbar";
import BaseSidebar from "./BaseSidebar";

/** Overview and Timeline share the summary, the Base sidebar and the empty states. */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { workspace, persist } = useWorkspace();
  const { navigate, showPast, setShowPast } = useShell();
  const pods = visible(workspace, showPast);
  const active = pods.filter((p) => !workspace.overrides[p.id]?.closed).length;
  const conflicts = workspace.roster.filter(
    (m) => assignments(workspace, m).length > 1,
  ).length;

  return (
    <>
      <PageToolbar>
        <Switch
          label="Show past pods"
          checked={showPast}
          onChange={(_, d) => setShowPast(d.checked)}
        />
      </PageToolbar>
      <dl className="summary">
        <div>
          <dt>Active pods</dt>
          <dd>{active}</dd>
        </div>
        <div>
          <dt>Domain members</dt>
          <dd>{workspace.roster.length}</dd>
        </div>
        <div>
          <dt>In Base</dt>
          <dd>{available(workspace).length}</dd>
        </div>
        {conflicts > 0 && (
          <div className="summary-warning">
            <dt>Assignment conflicts</dt>
            <dd>{conflicts}</dd>
          </div>
        )}
      </dl>
      <div className="workspace">
        <section aria-label="Pods">
          {!workspace.pods.length ? (
            <div className="empty">
              <span aria-hidden className="empty-mark">
                ◈
              </span>
              <h2>Your next feature starts here.</h2>
              <p>
                Connect your TFS Features board in Settings to discover its
                pods.
              </p>
              <div className="action-group">
                <ActionButton
                  appearance="primary"
                  onClick={() => navigate({ page: "settings" })}
                >
                  Connect board
                </ActionButton>
                {!workspace.boardUrl && (
                  <ActionButton onClick={() => persist(sample())}>
                    Load sample data
                  </ActionButton>
                )}
              </div>
            </div>
          ) : !pods.length ? (
            <div className="empty">
              <h2>No pods match the current filters.</h2>
              <p>
                {workspace.ownerInitialized
                  ? "Check the CM Pod owner filter and Area Paths in Settings, or show past pods."
                  : "Choose CM Pod owners in Settings to show pods."}
              </p>
              <ActionButton onClick={() => navigate({ page: "settings" })}>
                Open Settings
              </ActionButton>
            </div>
          ) : (
            children
          )}
        </section>
        <BaseSidebar />
      </div>
    </>
  );
}
