import { Trash2 } from "lucide-react";

export default function ClassCard({
  className,
  onClick,
  onDelete,
  showDelete = false,
}) {
  const isClickable = typeof onClick === "function";

  return (
    <div className="relative group bg-white border border-gray-200 rounded-lg shadow-sm">
      {isClickable ? (
        <button
          type="button"
          onClick={onClick}
          className="w-full rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer"
        >
          <span className="text-2xl font-bold text-gray-700">{className}</span>
          <span className="text-sm text-gray-500">Sección</span>
        </button>
      ) : (
        <div className="w-full rounded-lg p-4 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-700">{className}</span>
          <span className="text-sm text-gray-500">Sección</span>
        </div>
      )}
      {showDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity rounded border border-gray-200 bg-white p-1 text-red-500"
          aria-label={`Eliminar sección ${className}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
