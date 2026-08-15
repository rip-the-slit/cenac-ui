import { useState } from "react";
import { Link } from "react-router";
import { Archive, CalendarDays, CircleCheck } from "lucide-react";

export function PeriodSelector({ currentId, list }) {
  const [isOpen, setIsOpen] = useState(false);
  const currentPeriod = list.find(
    (period) => String(period.id) === String(currentId)
  );
  const currentLabel = currentPeriod
    ? `${currentPeriod.startYear} - ${currentPeriod.endYear}`
    : currentId;

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
        className="flex items-center space-x-2 px-3 py-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-lg text-gray-600"
      >
        <CalendarDays className="w-4 h-4" />
        <span>{currentLabel}</span>
      </button>
      {isOpen && (
        <div className="absolute z-10 right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-10 overflow-hidden">
          <div>
            {list.map((period) => {
              const label = `${period.startYear} - ${period.endYear}`;
              const StatusIcon =
                period.status === "archived" ? Archive : CircleCheck;

              return (
                <Link
                  key={period.id}
                  to={`/periodo/${period.id}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  <StatusIcon className="h-4 w-4" aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}