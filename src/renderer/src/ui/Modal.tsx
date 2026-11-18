import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
} from "@fluentui/react-components";
import type { ReactNode } from "react";

/**
 * Edits confirm with Save; consequential actions pass a specific `confirmLabel`
 * ("Remove", "Close pod"…) and `destructive` when they discard or release something.
 */
export default function Modal({
  title,
  children,
  onClose,
  onSave,
  confirmLabel = "Save",
  destructive = false,
  busy = false,
  disabled = false,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onSave?: () => void;
  confirmLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  disabled?: boolean;
  wide?: boolean;
}) {
  return (
    <Dialog
      open
      onOpenChange={(_, data) => {
        if (!data.open && !busy) onClose();
      }}
    >
      <DialogSurface className={wide ? "dialog-wide" : undefined}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy && !disabled) onSave?.();
          }}
        >
          <DialogBody>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent className="dialog-content">{children}</DialogContent>
            <DialogActions>
              {onSave && (
                <Button
                  type="submit"
                  appearance="primary"
                  className={destructive ? "danger-primary" : undefined}
                  disabled={busy || disabled}
                >
                  {confirmLabel}
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
