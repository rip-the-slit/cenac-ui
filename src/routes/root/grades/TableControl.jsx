import { ChevronLeft, ChevronRight } from "lucide-react";

const BUTTON_CLASS_NAME =
  "rounded-md border p-2 transition-colors enabled:border-gray-300 enabled:bg-white enabled:text-gray-700 enabled:hover:bg-gray-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-300";

export default function TableControl({
  children,
  page,
  pageCount,
  onPageChange,
}) {
  return (
    <>
      {children}
      <div className="flex items-center justify-end gap-2 px-4 py-3">
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
    </>
  );
}
