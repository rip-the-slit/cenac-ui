import { createPortal } from "react-dom";
import { Card } from "./Layout";

export default function EditorDialog({ label, busy = false, onClose, children }) {
  function handleKeyDown(event) {
    if (event.key === "Escape" && !busy) onClose();
  }

  function handleBackdropMouseDown(event) {
    if (event.target === event.currentTarget && !busy) onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4"
      role="presentation"
      onKeyDown={handleKeyDown}
      onMouseDown={handleBackdropMouseDown}
    >
      <Card as="div" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        <div role="dialog" aria-modal="true" aria-label={label} aria-busy={busy}>
          {children}
        </div>
      </Card>
    </div>,
    document.body
  );
}
