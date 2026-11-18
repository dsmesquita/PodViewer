import { MessageBar, MessageBarBody } from "@fluentui/react-components";
import { useWorkspace } from "@/hooks/useWorkspace";

export default function DiagnosticsSection() {
  const { workspace } = useWorkspace();
  return (
    <section className="settings-section" aria-labelledby="diagnostics-title">
      <h2 id="diagnostics-title">Import diagnostics</h2>
      {workspace.diagnostics.length ? (
        workspace.diagnostics.map((d, i) => (
          <MessageBar key={i} intent="warning" layout="multiline">
            <MessageBarBody>{d}</MessageBarBody>
          </MessageBar>
        ))
      ) : (
        <p>No import issues reported.</p>
      )}
    </section>
  );
}
