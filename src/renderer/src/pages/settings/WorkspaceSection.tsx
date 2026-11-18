import { useState } from "react";
import { sample } from "@shared/sample";
import { useShell } from "@/hooks/useShell";
import { useWorkspace } from "@/hooks/useWorkspace";
import { ActionButton } from "@/ui/controls";
import Modal from "@/ui/Modal";

export default function WorkspaceSection() {
  const { persist, mode } = useWorkspace();
  const { navigate } = useShell();
  const [replacing, setReplacing] = useState(false);
  return (
    <section className="settings-section" aria-labelledby="workspace-title">
      <h2 id="workspace-title">Workspace</h2>
      <p>
        All edits stay on this PC; only task creation writes to TFS. Future
        scheduling and automatic pod recommendations are not included.
      </p>
      <p>
        {mode === "mock"
          ? "Data: mock/.profile in the project folder (mock mode)."
          : "Data: %APPDATA%\\PodViewer. Back up this folder while the app is closed to keep pod history and skills."}
      </p>
      <div className="action-group">
        <ActionButton onClick={() => setReplacing(true)}>
          Load sample data
        </ActionButton>
      </div>
      {replacing && (
        <Modal
          title="Load sample data"
          confirmLabel="Replace workspace"
          destructive
          onClose={() => setReplacing(false)}
          onSave={() => {
            persist(sample());
            setReplacing(false);
            navigate({ page: "overview" });
          }}
        >
          <p>
            Replace this local workspace with sample data? Its roster, skills,
            pod overrides and board settings are replaced. TFS is not changed.
          </p>
        </Modal>
      )}
    </section>
  );
}
