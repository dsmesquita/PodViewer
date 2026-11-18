import { Checkbox, Field, Select, Textarea } from "@fluentui/react-components";
import type { Person } from "@shared/model";
import { useWorkspace } from "@/hooks/useWorkspace";
import { ActionButton } from "@/ui/controls";

/** Which work and which pods the workspace shows. Filters never change assignments. */
export default function ScopeSection() {
  const { workspace, persist } = useWorkspace();
  const owners = [
    ...new Map(
      workspace.pods
        .filter((pod) => pod.owner)
        .map((pod) => [pod.owner!.id, pod.owner!] as [string, Person]),
    ).values(),
  ];
  return (
    <section className="settings-section" aria-labelledby="scope-title">
      <h2 id="scope-title">Scope</h2>
      <Field
        label="Area Paths"
        hint="One per line. Each includes its descendants."
      >
        <Textarea
          key={workspace.refreshed}
          resize="vertical"
          rows={3}
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
      </Field>
      <Field
        label="Base lane"
        hint="The board swimlane that holds people between pods."
      >
        <Select
          value={workspace.baseLane}
          onChange={(_, d) => persist({ ...workspace, baseLane: d.value })}
        >
          <option value="">Auto-detect Base</option>
          {workspace.lanes.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
      </Field>
      <fieldset className="field-group">
        <legend>CM Pod owners</legend>
        <p className="hint">
          Shows pods whose CM POD is assigned to any selected owner. None
          selected shows everyone.
        </p>
        {owners.map((o) => (
          <Checkbox
            key={o.id}
            checked={workspace.owners.includes(o.id)}
            onChange={(_, d) =>
              persist({
                ...workspace,
                ownerInitialized: true,
                owners: d.checked
                  ? [...workspace.owners, o.id]
                  : workspace.owners.filter((id) => id !== o.id),
              })
            }
            label={
              <>
                <span>{o.name}</span> <small>{o.account}</small>
              </>
            }
          />
        ))}
        {!owners.length && (
          <p className="hint">Owners appear after the first refresh.</p>
        )}
        {!workspace.ownerInitialized && (
          <p className="hint">
            Renato Ribeiro is selected automatically when a unique matching
            identity is found.
          </p>
        )}
        <div className="action-group">
          <ActionButton
            icon="reset"
            disabled={workspace.ownerInitialized && !workspace.owners.length}
            onClick={() =>
              persist({ ...workspace, owners: [], ownerInitialized: true })
            }
          >
            Clear owner filter
          </ActionButton>
        </div>
      </fieldset>
    </section>
  );
}
