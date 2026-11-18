import { Field, Select } from "@fluentui/react-components";
import { useWorkspace } from "@/hooks/useWorkspace";

export default function FieldMappingSection() {
  const { workspace, persist } = useWorkspace();
  const fields = workspace.availableFields;
  return (
    <section className="settings-section" aria-labelledby="mapping-title">
      <h2 id="mapping-title">CM POD field mapping</h2>
      <p className="hint">
        Automatic discovery is used when no custom mapping is selected.
      </p>
      <Field
        label="Member fields"
        hint={
          fields.length
            ? "Ctrl+click to select several."
            : "Fields appear after the first refresh."
        }
      >
        {(props) => (
          <select
            {...props}
            multiple
            className="multi-select"
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
            {fields.map((f) => (
              <option key={f.referenceName} value={f.referenceName}>
                {f.name}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Planned Close Date">
        <Select
          value={workspace.fields.planned}
          onChange={(_, d) =>
            persist({
              ...workspace,
              fields: { ...workspace.fields, planned: d.value },
            })
          }
        >
          <option value="">Auto-detect</option>
          {fields.map((f) => (
            <option key={f.referenceName} value={f.referenceName}>
              {f.name}
            </option>
          ))}
        </Select>
      </Field>
    </section>
  );
}
