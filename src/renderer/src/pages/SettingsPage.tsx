import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import { same, type Person } from "../../../shared/model";
import { ActionButton } from "../ui/controls";
import type { WorkspaceApp } from "../hooks/useWorkspaceApp";
import { IconButton, StatusIcon } from "../ui/controls";
export default function SettingsPage({ app }: { app: WorkspaceApp }) {
  const {
    workspace,
    setError,
    setNotice,
    mode,
    setAuthMode,
    token,
    setToken,
    persist,
    refresh,
    owners,
  } = app;
  const [editor, setEditor] = useState<{ member?: Person; lookup?: boolean }>();
  const [removing, setRemoving] = useState<Person>();
  return (
    <>
      <section>
        <h2>TFS connection</h2>
        <label>
          Area Paths (one per line; includes descendants)
          <textarea
            key={workspace.refreshed}
            defaultValue={workspace.areaPaths.join("\n")}
            onBlur={(e) =>
              persist({
                ...workspace,
                areasInitialized: true,
                areaPaths: e.target.value
                  .split("\n")
                  .map((x) => x.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
        <h3>Task templates</h3>
        {workspace.taskTemplates.map((t, i) => (
          <div className="row" key={i}>
            <input
              aria-label="Template name"
              value={t.name}
              onChange={(e) =>
                persist({
                  ...workspace,
                  taskTemplates: workspace.taskTemplates.map((x, j) =>
                    i === j ? { ...x, name: e.target.value } : x,
                  ),
                })
              }
            />
            <input
              aria-label="Template prefixes"
              key={t.name + String(i)}
              defaultValue={t.prefixes.join(", ")}
              onBlur={(e) =>
                persist({
                  ...workspace,
                  taskTemplates: workspace.taskTemplates.map((x, j) =>
                    i === j
                      ? {
                          ...x,
                          prefixes: e.target.value
                            .split(",")
                            .map((pod) => pod.trim())
                            .filter(Boolean),
                        }
                      : x,
                  ),
                })
              }
            />
            <ActionButton
              icon="remove"
              label="Remove template"
              onClick={() =>
                persist({
                  ...workspace,
                  taskTemplates: workspace.taskTemplates.filter(
                    (_, j) => i !== j,
                  ),
                })
              }
            >
              Remove template
            </ActionButton>
          </div>
        ))}
        <ActionButton
          icon="add"
          label="Add template"
          onClick={() =>
            persist({
              ...workspace,
              taskTemplates: [
                ...workspace.taskTemplates,
                { name: "New template", prefixes: ["BUILD", "VAL"] },
              ],
            })
          }
        >
          Add template
        </ActionButton>
        <label>
          Features board URL
          <input
            value={workspace.boardUrl}
            onChange={(e) =>
              persist({ ...workspace, boardUrl: e.target.value })
            }
          />
        </label>
        <label>
          Authentication
          <select value={mode} onChange={(e) => setAuthMode(e.target.value)}>
            <option value="windows">Windows integrated</option>
            <option value="pat">Personal access token</option>
          </select>
        </label>
        {mode === "pat" && (
          <label>
            Token (encrypted on Windows)
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
            />
          </label>
        )}
        <ActionButton
          onClick={async () => {
            if (!window.api) return setError("Run the desktop app to connect.");
            const result = await window.api.auth(mode, token);
            if (!result.ok) return setError(result.message);
            setToken("");
            setNotice("Connection settings saved.");
            await refresh();
          }}
        >
          Save connection & refresh
        </ActionButton>
        <label>
          Base lane
          <select
            value={workspace.baseLane}
            onChange={(e) =>
              persist({ ...workspace, baseLane: e.target.value })
            }
          >
            <option value="">Auto-detect Base</option>
            {workspace.lanes.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <h3>CM Pod owners</h3>
        <p>
          Assigned To · match any selected owner. None selected includes
          everyone.
        </p>
        {owners.map((o) => (
          <label key={o.id}>
            <input
              type="checkbox"
              checked={workspace.owners.includes(o.id)}
              onChange={(e) =>
                persist({
                  ...workspace,
                  ownerInitialized: true,
                  owners: e.target.checked
                    ? [...workspace.owners, o.id]
                    : workspace.owners.filter((id) => id !== o.id),
                })
              }
            />
            {o.name} <small>{o.account}</small>
          </label>
        ))}
        {!workspace.ownerInitialized && (
          <p>
            Renato Ribeiro will be selected when a unique matching identity is
            found.
          </p>
        )}
        <ActionButton
          icon="reset"
          label="Clear owner filter"
          onClick={() =>
            persist({ ...workspace, owners: [], ownerInitialized: true })
          }
        >
          Clear owner filter
        </ActionButton>
        <h3>CM POD field mapping</h3>
        <p>Automatic discovery is used when no custom mapping is selected.</p>
        <label>
          Member fields
          <select
            multiple
            value={workspace.fields.members}
            onChange={(e) =>
              persist({
                ...workspace,
                fields: {
                  ...workspace.fields,
                  members: Array.from(e.target.selectedOptions, (o) => o.value),
                },
              })
            }
          >
            {workspace.availableFields.map((f) => (
              <option key={f.referenceName} value={f.referenceName}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Planned Close Date
          <select
            value={workspace.fields.planned}
            onChange={(e) =>
              persist({
                ...workspace,
                fields: { ...workspace.fields, planned: e.target.value },
              })
            }
          >
            <option value="">Auto-detect</option>
            {workspace.availableFields.map((f) => (
              <option key={f.referenceName} value={f.referenceName}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
      </section>
      <section className="team-settings">
        <div className="member-card-heading">
          <h2>Team Members</h2>
          <div className="action-group">
            <ActionButton
              icon="add"
              label="Add member"
              onClick={() => setEditor({})}
            >
              Add member
            </ActionButton>
            <ActionButton
              icon="refresh"
              label="Resolve names"
              onClick={async () => {
                let roster = [...workspace.roster];
                for (const m of roster.filter((m) => !m.account)) {
                  const r = await window.api?.people(m.name);
                  if (!r?.ok) {
                    setError(r && !r.ok ? r.message : "Run desktop app");
                    continue;
                  }
                  const normalize = (s: string) =>
                    s
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .toLowerCase()
                      .split(/\s+/)
                      .sort()
                      .join(" ");
                  const exact = r.value.filter(
                    (pod) => normalize(pod.name) === normalize(m.name),
                  );
                  if (
                    exact.length === 1 &&
                    !roster.some(
                      (entry) => entry.id !== m.id && same(entry, exact[0]),
                    )
                  )
                    roster = roster.map((x) =>
                      x.id === m.id
                        ? {
                            ...x,
                            account: exact[0].account,
                            tfsId: exact[0].id,
                          }
                        : x,
                    );
                  else setNotice("Review TFS identity mapping for " + m.name);
                }
                persist({ ...workspace, roster });
              }}
            >
              Resolve names
            </ActionButton>
          </div>
        </div>
        {!workspace.roster.length && <p>No team members added.</p>}
        {workspace.roster.map((member) => (
          <div className="person" key={member.id}>
            <div>
              <strong>{member.name}</strong>
              <small>{member.account || "No TFS identity mapped"}</small>
            </div>
            <div className="action-group">
              <IconButton
                icon="edit"
                label={"Map identity for " + member.name}
                onClick={() => setEditor({ member })}
              />
              <IconButton
                icon="refresh"
                label={"Find username for " + member.name}
                onClick={() => setEditor({ member, lookup: true })}
              />
              <IconButton
                icon="remove"
                label={"Remove " + member.name}
                onClick={() => setRemoving(member)}
              />
            </div>
          </div>
        ))}
        {editor && (
          <RosterEditor
            roster={workspace.roster}
            {...editor}
            onClose={() => setEditor(undefined)}
            onSave={(person) => {
              persist({
                ...workspace,
                roster: editor.member
                  ? workspace.roster.map((entry) =>
                      entry.id === person.id ? person : entry,
                    )
                  : [...workspace.roster, person],
              });
              setEditor(undefined);
            }}
          />
        )}
        {removing && (
          <Modal
            title="Remove team member"
            onClose={() => setRemoving(undefined)}
            onSave={() => {
              persist({
                ...workspace,
                roster: workspace.roster.filter(
                  (entry) => entry.id !== removing.id,
                ),
              });
              setRemoving(undefined);
            }}
          >
            <p>
              Remove {removing.name} from the team roster? Historical TFS
              memberships are retained.
            </p>
          </Modal>
        )}
        <h2>Import diagnostics</h2>
        {workspace.diagnostics.length ? (
          workspace.diagnostics.map((d, i) => (
            <StatusIcon key={i} message={d} />
          ))
        ) : (
          <p>No import issues reported.</p>
        )}
        <h3>About this workspace</h3>
        <p>
          All edits stay on this PC. Only task creation writes to TFS. Future
          scheduling and automatic pod recommendations are not included.
        </p>
        <p>
          Data: %APPDATA%\PodViewer. Back up this folder to preserve pod history
          and skills.
        </p>
      </section>
    </>
  );
}

function RosterEditor({
  roster,
  member,
  lookup,
  onClose,
  onSave,
}: {
  roster: Person[];
  member?: Person;
  lookup?: boolean;
  onClose: () => void;
  onSave: (member: Person) => void;
}) {
  const [name, setName] = useState(member?.name ?? "");
  const [account, setAccount] = useState(member?.account ?? "");
  const [identity, setIdentity] = useState(member?.tfsId);
  const [query, setQuery] = useState(member?.name ?? "");
  const [candidates, setCandidates] = useState<Person[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const duplicate = roster.some(
    (entry) =>
      entry.id !== member?.id &&
      ((account.trim() &&
        entry.account?.toLowerCase() === account.trim().toLowerCase()) ||
        (identity && same(entry, { id: identity, name }))),
  );
  async function search(value: string) {
    setBusy(true);
    setCandidates([]);
    setMessage("");
    try {
      const result = await window.api?.people(value);
      if (result?.ok) {
        setCandidates(result.value);
        if (!result.value.length) setMessage("No matching TFS identities.");
      } else
        setMessage(
          result?.message ?? "Open the desktop app to search TFS identities.",
        );
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (lookup && member && member.name.trim().length >= 2)
      void search(member.name);
  }, [lookup, member]);

  return (
    <Modal
      title={member ? "Map identity for " + member.name : "Add team member"}
      onClose={onClose}
      disabled={!name.trim() || duplicate || busy}
      onSave={() =>
        onSave({
          id: member?.id ?? crypto.randomUUID(),
          name: name.trim(),
          account: account.trim() || undefined,
          tfsId: identity,
        })
      }
    >
      <div className="form-stack">
        <label>
          Search TFS by name or account
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setCandidates([]);
            }}
          />
        </label>
        <ActionButton
          type="button"
          onClick={() => void search(query.trim())}
          disabled={busy || query.trim().length < 2}
        >
          Search TFS
        </ActionButton>
        {busy && <p role="status">Searching TFS…</p>}
        {message && <p role="status">{message}</p>}
        {candidates.map((candidate) => (
          <ActionButton
            key={candidate.id}
            type="button"
            onClick={() => {
              if (!member) setName(candidate.name);
              setAccount(candidate.account ?? "");
              setIdentity(candidate.id);
              setCandidates([]);
            }}
          >
            {candidate.name} · {candidate.account}
          </ActionButton>
        ))}
        {!member && (
          <label>
            Full name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
        )}
        <label>
          TFS account (optional)
          <input
            value={account}
            onChange={(event) => {
              setAccount(event.target.value);
              setIdentity(undefined);
            }}
          />
        </label>
        {duplicate && (
          <p role="status">That TFS identity is already on the roster.</p>
        )}
      </div>
    </Modal>
  );
}
