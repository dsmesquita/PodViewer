import { useState } from "react";
import { Field, Input } from "@fluentui/react-components";
import { today } from "@shared/model";
import Modal from "@/ui/Modal";

export default function ClosureDialog({
  name,
  start,
  prompted,
  onClose,
  onSave,
}: {
  name: string;
  start?: string;
  /** True when TFS resolved the Feature and the app is asking, rather than the user. */
  prompted: boolean;
  onClose: () => void;
  onSave: (date: string) => void;
}) {
  const [date, setDate] = useState(today);
  const valid = !!date && date <= today() && (!start || date >= start);
  return (
    <Modal
      title={prompted ? `${name} looks finished` : "Close pod"}
      onClose={onClose}
      onSave={() => onSave(date)}
      confirmLabel="Close pod"
      destructive
      disabled={!valid}
    >
      <p>
        {prompted
          ? `Its Feature is resolved or closed in TFS. Close ${name} and return its members to Base?`
          : `Close ${name} and return its members to Base.`}
      </p>
      <Field
        label="Actual closure date"
        required
        validationState={valid ? "none" : "error"}
        validationMessage={
          valid ? undefined : "Choose a date between the pod start and today."
        }
      >
        <Input
          type="date"
          value={date}
          min={start}
          max={today()}
          onChange={(_, d) => setDate(d.value)}
        />
      </Field>
      {prompted && (
        <p className="hint">
          Cancel leaves the pod open; you can close it later from its page.
        </p>
      )}
    </Modal>
  );
}
