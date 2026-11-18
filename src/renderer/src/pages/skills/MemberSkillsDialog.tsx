import { useState } from "react";
import { Field, Select } from "@fluentui/react-components";
import type { Person, Workspace } from "@shared/model";
import Modal from "@/ui/Modal";
import { levelFor, levels } from "./levels";

export default function MemberSkillsDialog({
  member,
  workspace,
  onSave,
  onClose,
}: {
  member: Person;
  workspace: Workspace;
  onSave: (workspace: Workspace) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(new Map<string, number>());
  const known = workspace.levels[member.id] ?? {};
  return (
    <Modal
      title={"Manage skills for " + member.name}
      onClose={onClose}
      disabled={!draft.size}
      onSave={() => {
        const ratings = new Map(Object.entries(known));
        for (const [skill, value] of draft) {
          if (!workspace.skills.includes(skill)) continue;
          if (value === 0) ratings.delete(skill);
          else ratings.set(skill, value);
        }
        onSave({
          ...workspace,
          levels: {
            ...workspace.levels,
            [member.id]: Object.fromEntries(ratings),
          },
        });
      }}
    >
      <div className="form-grid">
        {workspace.skills.map((skill) => (
          <Field key={skill} label={skill}>
            <Select
              value={String(
                draft.get(skill) ?? levelFor(known[skill])?.value ?? 0,
              )}
              onChange={(_, d) =>
                setDraft(new Map(draft).set(skill, Number(d.value)))
              }
            >
              <option value={0}>No level</option>
              {levels.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.name}
                </option>
              ))}
            </Select>
          </Field>
        ))}
      </div>
      {!workspace.skills.length && <p>Add skills in the Skills tab first.</p>}
    </Modal>
  );
}
