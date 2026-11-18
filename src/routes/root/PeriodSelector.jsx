import { useState } from "react";
import { Link } from "react-router";
import { Archive, CalendarDays, CircleCheck } from "lucide-react";
import FloatingOverlay from "./components/FloatingOverlay";
import SelectorBatches from "./components/SelectorBatches";

function PeriodOption({ icon, id, isSelected, label, onClick }) {
  return (
    <Link
      to={`/periodo/${id}`}
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 hover:bg-gray-100 ${
        isSelected ? "bg-gray-100 font-medium text-gray-900" : "text-gray-700"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

export function PeriodSelector({ currentId, list }) {
  const [isOpen, setIsOpen] = useState(false);
  const currentPeriod = list.find(
    (period) => String(period.id) === String(currentId)
  );
  const currentLabel = currentPeriod
    ? `${currentPeriod.startYear} - ${currentPeriod.endYear}`
    : currentId === "all" && "Todos los períodos";

  return (
    <div className="relative">
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className="relative z-10 flex items-center space-x-2 px-3 py-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-lg text-gray-600"
      >
        <CalendarDays className="w-4 h-4" />
        <span>{currentLabel}</span>
      </button>
      {isOpen && (
        <FloatingOverlay className="mt-2 right-0 w-48 overflow-hidden">
          <SelectorBatches items={[{ id: "all" }, ...list]} size={5}>
            {(periods) => periods.map((period) => {
              const isAll = period.id === "all";
              const label = isAll ? "Todos los períodos" : `${period.startYear} - ${period.endYear}`;
              const StatusIcon =
                isAll ? CalendarDays : period.status === "archived" ? Archive : CircleCheck;

              return (
                <PeriodOption
                  key={period.id}
                  icon={<StatusIcon className="h-4 w-4" aria-hidden="true" />}
                  id={period.id}
                  isSelected={String(period.id) === String(currentId)}
                  label={label}
                  onClick={() => setIsOpen(false)}
                />
              );
            })}
          </SelectorBatches>
        </FloatingOverlay>
      )}
    </div>
  );
}
