import { useId, useState } from "react";
import { Input, Select } from "@fluentui/react-components";
import type { TaskResult } from "@shared/api";
import type { Item, Workspace } from "@shared/model";
import { call } from "@/hooks/api";
import {
  ActionButton,
  IconButton,
  Loading,
  StatusIcon,
  type StatusKind,
} from "./controls";
import Modal from "./Modal";

/** Estimates stay text while typing so partial input such as "1." is not reset. */
type Draft = { title: string; assignedTo: string; estimate: string };

const resultKind: Record<TaskResult["status"], StatusKind> = {
  created: "success",
  failed: "error",
  uncertain: "warning",
};

/**
 * Reviewed task creation under one parent: the only TFS write. Created and uncertain rows
 * leave the draft list; only failed rows stay for retry.
 */
export default function TaskCreationDialog({
  item,
  workspace,
  onClose,
}: {
  item: Item;
  workspace: Workspace;
  onClose: () => void;
}) {
  const id = useId();
  const draft = (title: string): Draft => ({
    title,
    assignedTo: "",
    estimate: "0",
  });
  const [rows, setRows] = useState<Draft[]>([draft(item.title)]);
  const [results, setResults] = useState<{ row: number; result: TaskResult }[]>(
    [],
  );
  const [error, setError] = useState("");
  const [finished, setFinished] = useState(false);
  const [busy, setBusy] = useState(false);
  const assignable = workspace.roster.filter((m) => m.account);
  const update = (index: number, patch: Partial<Draft>) =>
    setRows(rows.map((row, j) => (j === index ? { ...row, ...patch } : row)));

  async function save() {
    setBusy(true);
    setError("");
    const response = await call((api) =>
      api.tasks(
        item.id,
        rows.map((row) => ({
          title: row.title,
          assignedTo: row.assignedTo || undefined,
          estimate: Math.max(0, Number(row.estimate) || 0),
        })),
      ),
    );
    setBusy(false);
    if (!response.ok) {
      setError(response.message);
      return;
    }
    const outcome = response.value;
    setResults(outcome.map((result) => ({ row: result.index + 1, result })));
    setFinished(!outcome.some((r) => r.status === "failed"));
    setRows(
      rows.filter((_, i) =>
        outcome.some((r) => r.index === i && r.status === "failed"),
      ),
    );
    if (outcome.some((r) => r.status === "created"))
      window.dispatchEvent(
        new CustomEvent("work-items:changed", { detail: item.id }),
      );
  }

  return (
    <Modal
      title={`Create Tasks · #${item.id}`}
      onClose={onClose}
      onSave={finished ? undefined : save}
      confirmLabel={results.length ? "Retry failed" : "Create tasks"}
      disabled={!rows.length || rows.some((row) => !row.title.trim())}
      busy={busy}
      wide
    >
      {!finished && (
        <fieldset disabled={busy} className="task-drafts">
          <legend className="sr-only">Task drafts under #{item.id}</legend>
          <div
            className="action-group"
            role="group"
            aria-labelledby={id + "-templates"}
          >
            <span id={id + "-templates"} className="field-caption">
              Apply template
            </span>
            {workspace.taskTemplates.map((t) => (
              <ActionButton
                type="button"
                key={t.name}
                onClick={() =>
                  setRows(
                    t.prefixes.map((p) =>
                      draft(p.toUpperCase() + ":: " + item.title),
                    ),
                  )
                }
              >
                {t.name}
              </ActionButton>
            ))}
          </div>
          <div className="draft-grid" role="table" aria-label="Task drafts">
            <div className="draft-row draft-head" role="row">
              <span role="columnheader">Title</span>
              <span role="columnheader">Assignee</span>
              <span role="columnheader">Estimate (h)</span>
              <span role="columnheader">
                <span className="sr-only">Actions</span>
              </span>
            </div>
            {rows.map((row, i) => (
              <div className="draft-row" role="row" key={i}>
                <span role="cell">
                  <Input
                    aria-label={"Task title " + (i + 1)}
                    required
                    value={row.title}
                    onChange={(_, d) => update(i, { title: d.value })}
                  />
                </span>
                <span role="cell">
                  <Select
                    aria-label={"Task assignee " + (i + 1)}
                    value={row.assignedTo}
                    onChange={(_, d) => update(i, { assignedTo: d.value })}
                  >
                    <option value="">Unassigned</option>
                    {assignable.map((m) => (
                      <option key={m.id} value={m.account}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                </span>
                <span role="cell">
                  <Input
                    aria-label={"Task estimate " + (i + 1)}
                    type="number"
                    min={0}
                    step={0.25}
                    value={row.estimate}
                    onChange={(_, d) => update(i, { estimate: d.value })}
                  />
                </span>
                <span role="cell">
                  <IconButton
                    icon="remove"
                    label={"Remove task row " + (i + 1)}
                    onClick={() => setRows(rows.filter((_, j) => i !== j))}
                  />
                </span>
              </div>
            ))}
          </div>
          <ActionButton
            type="button"
            icon="add"
            appearance="subtle"
            onClick={() => setRows([...rows, draft(item.title)])}
          >
            Add task row
          </ActionButton>
          <p className="hint">
            Area, iteration and tags inherit from #{item.id}. Assignees need a
            mapped TFS account.
          </p>
        </fieldset>
      )}
      {busy && <Loading label="Creating tasks…" />}
      {error && (
        <p role="status" className="task-results">
          <StatusIcon kind="error" message={error} /> {error}
        </p>
      )}
      {results.length > 0 && (
        <ul role="status" className="task-results">
          {results.map(({ row, result }) => (
            <li
              key={row}
              className={"task-result task-result-" + result.status}
            >
              <StatusIcon
                kind={resultKind[result.status]}
                message={result.message ?? `Created #${result.item?.id} in TFS`}
              />
              {`Row ${row}: ${result.status}`}
              {result.item
                ? ` #${result.item.id}`
                : result.message
                  ? ` · ${result.message}`
                  : ""}
            </li>
          ))}
        </ul>
      )}
      {results.some((r) => r.result.status === "uncertain") && (
        <p className="hint">
          Check uncertain results in TFS before attempting those drafts again.
        </p>
      )}
    </Modal>
  );
}
