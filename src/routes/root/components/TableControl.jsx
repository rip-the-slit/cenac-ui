import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";

const BUTTON_CLASS_NAME =
  "rounded-md border p-2 transition-colors enabled:border-gray-300 enabled:bg-white enabled:text-gray-700 enabled:hover:bg-gray-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-300";

export default function TableControl({
  children,
  page,
  pageCount,
  recordsAmount,
  selectedIds,
  bulkActionId,
  bulkActionOptions,
  bulkActionLabel = "Acciones masivas",
  onBulkAction,
  onPageChange,
}) {
  const bulkActionRef = useRef(null);
  const selectedCount = selectedIds.all
    ? Math.max(
        0,
        recordsAmount -
          Object.values(selectedIds).filter((selected) => selected === false)
            .length
      )
    : Object.values(selectedIds).filter((selected) => selected === true)
        .length;
  const selectedLabel =
    selectedCount === 0
      ? "Ninguno"
      : selectedCount === recordsAmount
        ? "Todos"
        : String(selectedCount);

  const submitBulkAction = () => {
    const explicitlySelectedIds = [];
    if (!selectedIds.all) {
      for (const [id, selected] of Object.entries(selectedIds)) {
        if (id !== "all" && selected === true) explicitlySelectedIds.push(id);
      }
    }
    onBulkAction?.(
      bulkActionRef.current?.value ?? "",
      explicitlySelectedIds,
      selectedIds.all === true
    );
  };

  return (
    <>
      {children}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor={bulkActionId}>
            {bulkActionLabel}
          </label>
          <select
            ref={bulkActionRef}
            id={bulkActionId}
            name={bulkActionId}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
            defaultValue={bulkActionOptions[0]?.value ?? ""}
          >
            {bulkActionOptions.map(({ value, label, disabled = false }) => (
              <option key={value} value={value} disabled={disabled}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={submitBulkAction}
            className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            Aplicar
            <span
              aria-hidden="true"
              className="rounded-full bg-gray-200 px-2 py-0.5 text-xs"
            >
              {selectedLabel}
            </span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={BUTTON_CLASS_NAME}
            aria-label="Anterior"
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span>Página</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              aria-label="Página"
              className="w-12 rounded-md border border-gray-300 px-2 py-1 text-center text-gray-900"
              value={String(page)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.preventDefault();
              }}
              onChange={(event) => {
                const requestedPage = Number.parseInt(event.target.value, 10);
                if (!Number.isInteger(requestedPage)) return;
                onPageChange(Math.min(Math.max(requestedPage, 1), pageCount));
              }}
            />
            <span>de {pageCount}</span>
          </label>
          <button
            type="button"
            className={BUTTON_CLASS_NAME}
            aria-label="Siguiente"
            disabled={page === pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}
