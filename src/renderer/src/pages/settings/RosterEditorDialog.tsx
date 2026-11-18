import { useEffect, useState } from "react";
import { Field, Input } from "@fluentui/react-components";
import { same, type Person } from "@shared/model";
import { call } from "@/hooks/api";
import { ActionButton, Loading } from "@/ui/controls";
import Modal from "@/ui/Modal";

/** Adds a roster member, or maps an existing one to a TFS identity. */
export default function RosterEditorDialog({
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
    const result = await call((api) => api.people(value));
    setBusy(false);
    if (!result.ok) setMessage(result.message);
    else {
      setCandidates(result.value);
      if (!result.value.length) setMessage("No matching TFS identities.");
    }
  }

  const searchOnOpen =
    lookup && member && member.name.trim().length >= 2 ? member.name : "";
  useEffect(() => {
    if (searchOnOpen) void search(searchOnOpen);
  }, [searchOnOpen]);

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
        <div className="inline-form">
          <Field label="Search TFS by name or account">
            <Input
              value={query}
              onChange={(_, d) => {
                setQuery(d.value);
                setCandidates([]);
              }}
              onKeyDown={(e) => {
                // Enter searches instead of submitting the dialog.
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (query.trim().length >= 2) void search(query.trim());
                }
              }}
            />
          </Field>
          <ActionButton
            type="button"
            icon="search"
            onClick={() => void search(query.trim())}
            disabled={busy || query.trim().length < 2}
          >
            Search TFS
          </ActionButton>
        </div>
        {busy && <Loading label="Searching TFS…" />}
        {message && <p role="status">{message}</p>}
        {candidates.length > 0 && (
          <div
            className="candidate-list"
            role="group"
            aria-label="Matching identities"
          >
            {candidates.map((candidate) => (
              <ActionButton
                key={candidate.id}
                type="button"
                appearance="subtle"
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
          </div>
        )}
        {!member && (
          <Field label="Full name" required>
            <Input value={name} onChange={(_, d) => setName(d.value)} />
          </Field>
        )}
        <Field
          label="TFS account (optional)"
          hint="DOMAIN\user or email. Choosing a search result fills this in."
          validationState={duplicate ? "error" : "none"}
          validationMessage={
            duplicate
              ? "That TFS identity is already on the roster."
              : undefined
          }
        >
          <Input
            value={account}
            onChange={(_, d) => {
              setAccount(d.value);
              setIdentity(undefined);
            }}
          />
        </Field>
      </div>
    </Modal>
  );
}
