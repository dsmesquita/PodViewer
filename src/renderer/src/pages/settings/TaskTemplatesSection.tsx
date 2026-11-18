import { Input } from "@fluentui/react-components";
import { useWorkspace } from "@/hooks/useWorkspace";
import { ActionButton, IconButton } from "@/ui/controls";

/** Templates expand to one Task draft per prefix, e.g. "BUILD:: <parent title>". */
export default function TaskTemplatesSection() {
  const { workspace, persist } = useWorkspace();
  const templates = workspace.taskTemplates;
  const update = (index: number, patch: Partial<(typeof templates)[number]>) =>
    persist({
      ...workspace,
      taskTemplates: templates.map((t, j) =>
        index === j ? { ...t, ...patch } : t,
      ),
    });
  return (
    <section className="settings-section" aria-labelledby="templates-title">
      <h2 id="templates-title">Task templates</h2>
      <p className="hint">
        Each prefix becomes one Task draft. Separate prefixes with commas.
      </p>
      {templates.map((t, i) => (
        <div className="template-row" key={i}>
          <Input
            aria-label={`Template ${i + 1} name`}
            value={t.name}
            onChange={(_, d) => update(i, { name: d.value })}
          />
          <Input
            aria-label={`Template ${i + 1} prefixes`}
            key={t.name + String(i)}
            defaultValue={t.prefixes.join(", ")}
            onBlur={(e) =>
              update(i, {
                prefixes: e.target.value
                  .split(",")
                  .map((p) => p.trim())
                  .filter(Boolean),
              })
            }
          />
          <IconButton
            icon="remove"
            label={`Remove template ${t.name}`}
            onClick={() =>
              persist({
                ...workspace,
                taskTemplates: templates.filter((_, j) => i !== j),
              })
            }
          />
        </div>
      ))}
      <div className="action-group">
        <ActionButton
          icon="add"
          onClick={() =>
            persist({
              ...workspace,
              taskTemplates: [
                ...templates,
                { name: "New template", prefixes: ["BUILD", "VAL"] },
              ],
            })
          }
        >
          Add template
        </ActionButton>
      </div>
    </section>
  );
}
