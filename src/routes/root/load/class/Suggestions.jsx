import { createPortal } from "react-dom";
import { RefreshCw } from "lucide-react";

import FloatingOverlay from "../../components/FloatingOverlay";
import useSuggestions from "./useSuggestions";

export default function Suggestions({
  anchorRef,
  endpoint,
  label = "Sugerencias",
  query,
  onSelect,
}) {
  const suggestions = useSuggestions({
    anchorRef,
    endpoint,
    query,
    onSelect,
  });

  if (!suggestions.visible) {
    return null;
  }

  return createPortal(
    <FloatingOverlay
      ref={suggestions.overlayRef}
      role="listbox"
      aria-label={label}
      aria-busy={suggestions.isPending ? "true" : "false"}
      className="fixed z-50 max-h-74 overflow-y-auto"
      style={{
        left: suggestions.position.left,
        top: suggestions.position.top,
        width: suggestions.position.width,
      }}
    >
      <div className="flex items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        <span>Coincidencias</span>
        {suggestions.isPending && (
          <RefreshCw
            aria-hidden="true"
            className="h-3.5 w-3.5 animate-spin"
          />
        )}
      </div>
      <div className={suggestions.isPending ? "opacity-60" : ""}>
        {suggestions.results.map((record) => {
          return (
            <button
              key={record.id}
              type="button"
              role="option"
              aria-selected="false"
              className="block w-full px-4 py-2 text-left bg-white hover:brightness-[0.95] focus:brightness-[0.95] focus:outline-none"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onSelect(record);
                suggestions.close();
              }}
            >
              <span className="block font-medium text-gray-800">
                {record.id}
              </span>
            </button>
          );
        })}
      </div>
    </FloatingOverlay>,
    document.body
  );
}
