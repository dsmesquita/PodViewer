import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@fluentui/react-components";
import type { ReactNode } from "react";

export default function Modal({
  title,
  children,
  onClose,
  onSave,
  busy = false,
  disabled = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onSave?: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <Dialog
      open
      onOpenChange={(_, data) => {
        if (!data.open && !busy) onClose();
      }}
    >
      <DialogSurface onClick={(event) => event.stopPropagation()}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy && !disabled) onSave?.();
          }}
        >
          <DialogBody>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>{children}</DialogContent>
            <DialogActions>
              {onSave && (
                <Button
                  type="submit"
                  appearance="primary"
                  disabled={busy || disabled}
                >
                  Save
                </Button>
              )}
              <Button type="button" onClick={onClose} disabled={busy}>
                {onSave ? "Cancel" : "Close"}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
}
