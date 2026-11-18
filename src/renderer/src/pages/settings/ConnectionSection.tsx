import { useState } from "react";
import {
  Button,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Select,
  Spinner,
} from "@fluentui/react-components";
import type { AuthMode } from "@shared/api";
import { call } from "@/hooks/api";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useNotify } from "@/ui/Notifications";

export default function ConnectionSection() {
  const {
    workspace,
    persist,
    mode,
    setMode,
    hasPat,
    setHasPat,
    busy,
    refresh,
    setError,
  } = useWorkspace();
  const notify = useNotify();
  const [auth, setAuth] = useState<AuthMode>(
    mode === "pat" ? "pat" : "windows",
  );
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const result = await call((api) => api.auth(auth, token));
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (mode !== "mock") setMode(auth);
    if (token) setHasPat(true);
    setToken("");
    notify("Connection settings saved");
    await refresh();
  }

  return (
    <section className="settings-section" aria-labelledby="connection-title">
      <h2 id="connection-title">TFS connection</h2>
      {mode === "mock" && (
        <MessageBar intent="info">
          <MessageBarBody>
            Mock mode: data comes from the local mock/ folder. Refresh re-reads
            it.
          </MessageBarBody>
        </MessageBar>
      )}
      <Field
        label="Features board URL"
        hint="Paste the URL of the team's Features board, including project and team."
      >
        <Input
          type="url"
          value={workspace.boardUrl}
          onChange={(_, d) => persist({ ...workspace, boardUrl: d.value })}
        />
      </Field>
      <Field label="Authentication">
        <Select value={auth} onChange={(_, d) => setAuth(d.value as AuthMode)}>
          <option value="windows">Windows integrated</option>
          <option value="pat">Personal access token</option>
        </Select>
      </Field>
      {auth === "pat" && (
        <Field
          label="Personal access token"
          hint={
            hasPat
              ? "A token is saved. Leave this empty to keep it."
              : "Needs Work Items (Read); task creation needs Read & Write. Encrypted on this PC."
          }
        >
          <Input
            type="password"
            value={token}
            autoComplete="off"
            onChange={(_, d) => setToken(d.value)}
          />
        </Field>
      )}
      <div className="action-group">
        <Button
          appearance="primary"
          disabled={busy || saving || !workspace.boardUrl}
          icon={busy || saving ? <Spinner size="tiny" /> : undefined}
          onClick={() => void save()}
        >
          Save connection &amp; refresh
        </Button>
      </div>
    </section>
  );
}
