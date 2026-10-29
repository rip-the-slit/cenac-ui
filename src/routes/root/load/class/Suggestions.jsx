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
  onClose,
  idAttribute = "id",
  displayAttribute = idAttribute,
  listId,
  ...searchOptions
}) {
  const suggestions = useSuggestions({
    anchorRef,
    endpoint,
    query,
    onSelect,
    onClose,
    idAttribute,
    ...searchOptions,
  });

  if (!suggestions.visible) {
    return null;
  }

  return createPortal(
    <FloatingOverlay
      ref={suggestions.overlayRef}
      id={listId}
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
              key={record[idAttribute]}
              type="button"
              role="option"
              aria-selected="false"
              className="block w-full px-4 py-2 text-left bg-white hover:brightness-[0.95] focus:brightness-[0.95] focus:outline-none"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => suggestions.select(record)}
            >
              <span className="block font-medium text-gray-800">
                {record[displayAttribute]}
              </span>
            </button>
          );
        })}
      </div>
    </FloatingOverlay>,
    document.body
  );
}
