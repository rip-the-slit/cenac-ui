import { createPortal } from "react-dom";
import { RefreshCw } from "lucide-react";

import FloatingOverlay from "../../components/FloatingOverlay";
import useStudentSuggestions from "./useStudentSuggestions";

export default function StudentSuggestions({
  anchorRef,
  query,
  onSelect,
}) {
  const suggestions = useStudentSuggestions({
    anchorRef,
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
      aria-label="Sugerencias de estudiantes"
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
        {suggestions.results.map((student) => {
          const fullName =
            `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim() ||
            String(student.id);

          return (
            <button
              key={student.id}
              type="button"
              role="option"
              aria-selected="false"
              className="block w-full px-4 py-2 text-left hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onSelect(student);
                suggestions.close();
              }}
            >
              <span className="block font-medium text-gray-800">
                {fullName}
              </span>
              <span className="block text-xs text-gray-500">
                {student.id}
              </span>
            </button>
          );
        })}
      </div>
    </FloatingOverlay>,
    document.body
  );
}
