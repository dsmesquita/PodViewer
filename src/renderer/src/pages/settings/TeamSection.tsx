import { useState } from "react";
import { same, type Person } from "@shared/model";
import { call } from "@/hooks/api";
import { useWorkspace } from "@/hooks/useWorkspace";
import { ActionButton, IconButton, StatusIcon } from "@/ui/controls";
import Modal from "@/ui/Modal";
import { useNotify } from "@/ui/Notifications";
import { PersonAvatar } from "@/ui/PersonAvatar";
import RosterEditorDialog from "./RosterEditorDialog";

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/\s+/)
    .sort()
    .join(" ");

/** The domain roster. TFS accounts let imported pod membership match roster people. */
export default function TeamSection() {
  const { workspace, persist, setError } = useWorkspace();
  const notify = useNotify();
  const [editor, setEditor] = useState<{ member?: Person; lookup?: boolean }>();
  const [removing, setRemoving] = useState<Person>();
  const [resolving, setResolving] = useState(false);
  const unmapped = workspace.roster.filter((m) => !m.account);

  /** Maps unmapped people whose name matches exactly one TFS identity; others need review. */
  async function resolveNames() {
    setResolving(true);
    let roster = [...workspace.roster];
    const review: string[] = [];
    for (const m of unmapped) {
      const result = await call((api) => api.people(m.name));
      if (!result.ok) {
        setError(result.message);
        break;
      }
      const exact = result.value.filter(
        (p) => normalize(p.name) === normalize(m.name),
      );
      if (
        exact.length === 1 &&
        !roster.some((entry) => entry.id !== m.id && same(entry, exact[0]))
      )
        roster = roster.map((x) =>
          x.id === m.id
            ? { ...x, account: exact[0].account, tfsId: exact[0].id }
            : x,
        );
      else review.push(m.name);
    }
    persist({ ...workspace, roster });
    setResolving(false);
    notify(
      review.length
        ? `Review the TFS identity for ${review.join(", ")}`
        : "Names resolved",
      review.length ? "warning" : "success",
    );
  }

  return (
    <section className="settings-section" aria-labelledby="team-title">
      <div className="section-heading">
        <h2 id="team-title">Team members</h2>
        <div className="action-group">
          <ActionButton icon="add" onClick={() => setEditor({})}>
            Add member
          </ActionButton>
          <ActionButton
            icon="search"
            disabled={!unmapped.length || resolving}
            label="Look up TFS accounts for members without one"
            onClick={() => void resolveNames()}
          >
            {resolving ? "Resolving…" : "Resolve names"}
          </ActionButton>
        </div>
      </div>
      {!workspace.roster.length && <p>No team members added.</p>}
      <ul className="people-list">
        {workspace.roster.map((member) => (
          <li className="person" key={member.id}>
            <PersonAvatar person={member} />
            <div>
              <strong>{member.name}</strong>
              <small>{member.account || "No TFS identity mapped"}</small>
            </div>
            {!member.account && (
              <StatusIcon message="Imported pod membership cannot match this person until a TFS account is mapped." />
            )}
            <div className="action-group">
              <IconButton
                icon="edit"
                label={"Map identity for " + member.name}
                onClick={() => setEditor({ member })}
              />
              <IconButton
                icon="search"
                label={"Find username for " + member.name}
                onClick={() => setEditor({ member, lookup: true })}
              />
              <IconButton
                icon="remove"
                label={"Remove " + member.name}
                onClick={() => setRemoving(member)}
              />
            </div>
          </li>
        ))}
      </ul>
      {editor && (
        <RosterEditorDialog
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
          confirmLabel="Remove"
          destructive
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
    </section>
  );
}
