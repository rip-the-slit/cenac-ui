import { useState } from "react";
import { Link } from "react-router";
import { CalendarDays } from "lucide-react";

export function PeriodSelector({ currentId, list }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm text-gray-600"
      >
        <CalendarDays className="w-4 h-4" />
        <span>{currentId}</span>
      </button>
      {isOpen && (
        <div className="absolute z-10 right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-10">
          <div className="py-1">
            {list.map((p) => (
              <Link
                key={p}
                to={`/periodo/${p}`}
                onClick={() => setIsOpen(false)}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                {p}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}