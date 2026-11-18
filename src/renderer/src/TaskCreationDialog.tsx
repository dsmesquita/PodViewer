import { ActionButton } from "./ui/controls";
import Modal from "./ui/Modal";
import { useState } from "react";
import type { Item, Workspace } from "../../shared/model";
export default function WorkDetails({
  item,
  workspace,
  onClose,
}: {
  item: Item;
  workspace: Workspace;
  onClose: () => void;
}) {
  const [rows, setRows] = useState([
    { title: item.title, assignedTo: "", estimate: 0 },
  ]);
  const [message, setMessage] = useState("");
  const [statusKind, setStatusKind] = useState<"warning" | "error" | "success">(
    "warning",
  );
  const [hasUncertainResult, setHasUncertainResult] = useState(false);
  const [finished, setFinished] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const r = await window.api?.tasks(
        item.id,
        rows.map((x) => ({
          ...x,
          assignedTo: x.assignedTo || undefined,
        })),
      );
      if (!r?.ok) {
        setStatusKind("error");
        setMessage(r && !r.ok ? r.message : "Run the desktop app");
        return;
      }
      setMessage(
        r.value
          .map(
            (x) =>
              `Row ${x.index + 1}: ${x.status} ${x.item ? "#" + x.item.id : x.message || ""}`,
          )
          .join("\n"),
      );
      if (r.value.some((result) => result.status === "uncertain"))
        setHasUncertainResult(true);
      setFinished(!r.value.some((result) => result.status === "failed"));
      setRows(
        rows.filter((_, i) =>
          r.value.some((x) => x.index === i && x.status === "failed"),
        ),
      );
      if (r.value.some((result) => result.status === "created"))
        window.dispatchEvent(
          new CustomEvent("work-items:changed", {
            detail: item.id,
          }),
        );
      setStatusKind(
        r.value.every((result) => result.status === "created")
          ? "success"
          : "warning",
      );
    } catch (error) {
      setStatusKind("error");
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`Create Tasks · #${item.id}`}
      onClose={onClose}
      onSave={finished ? undefined : save}
      disabled={!rows.length}
      busy={busy}
    >
      {!finished && (
        <fieldset disabled={busy} className="task-drafts">
          <h3>Task drafts — under #{item.id}</h3>
          {workspace.taskTemplates.map((t) => (
            <ActionButton
              type="button"
              key={t.name}
              onClick={() =>
                setRows(
                  t.prefixes.map((p) => ({
                    title: p.toUpperCase() + ":: " + item.title,
                    assignedTo: "",
                    estimate: 0,
                  })),
                )
              }
            >
              {t.name}
            </ActionButton>
          ))}
          {rows.map((r, i) => (
            <div className="row" key={i}>
              <input
                aria-label={"Task title " + (i + 1)}
                required
                value={r.title}
                onChange={(e) =>
                  setRows(
                    rows.map((x, j) =>
                      j === i ? { ...x, title: e.target.value } : x,
                    ),
                  )
                }
              />
              <select
                aria-label={"Task assignee " + (i + 1)}
                value={r.assignedTo}
                onChange={(e) =>
                  setRows(
                    rows.map((x, j) =>
                      j === i ? { ...x, assignedTo: e.target.value } : x,
                    ),
                  )
                }
              >
                <option value="">Unassigned</option>
                {workspace.roster
                  .filter((m) => m.account)
                  .map((m) => (
                    <option key={m.id} value={m.account}>
                      {m.name}
                    </option>
                  ))}
              </select>
              <input
                aria-label={"Task estimate " + (i + 1)}
                type="number"
                min="0"
                step="0.25"
                value={r.estimate}
                onChange={(e) =>
                  setRows(
                    rows.map((x, j) =>
                      j === i ? { ...x, estimate: Number(e.target.value) } : x,
                    ),
                  )
                }
              />
              <ActionButton
                type="button"
                icon="remove"
                label="Remove"
                onClick={() => setRows(rows.filter((_, j) => i !== j))}
              >
                Remove
              </ActionButton>
            </div>
          ))}
          <ActionButton
            type="button"
            icon="add"
            label="Add task row"
            onClick={() =>
              setRows([
                ...rows,
                { title: item.title, assignedTo: "", estimate: 0 },
              ])
            }
          >
            Add task row
          </ActionButton>
          <p>
            Area, iteration and tags inherit from the parent. Uncertain outcomes
            are excluded from retry: check TFS before creating them again.
          </p>
        </fieldset>
      )}
      {busy && <p role="status">Creating tasks…</p>}
      {message && (
        <p role="status" className={`task-results task-results-${statusKind}`}>
          {message}
        </p>
      )}
      {hasUncertainResult && (
        <p>
          Check uncertain results in TFS before attempting those drafts again.
        </p>
      )}
    </Modal>
  );
}
