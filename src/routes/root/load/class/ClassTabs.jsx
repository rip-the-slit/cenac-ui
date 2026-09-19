import { Plus, Trash2 } from "lucide-react";

import StudentCountBadge from "./StudentCountBadge";

export default function ClassTabs({
  yearId,
  classes,
  selectedClass,
  actions,
}) {
  return (
    <div className="flex gap-2">
      <div
        role="tablist"
        aria-label="Secciones"
        className="flex min-w-0 gap-2 overflow-x-auto"
      >
        {classes.map((classGroup) => {
          const classId = classGroup.className;
          const isSelected = selectedClass === classId;

          return (
            <div
              key={classId}
              className={
                "group flex min-w-[225px] shrink-0 items-center justify-between rounded-t-lg border border-b-0 border-gray-200 text-gray-600 transition-colors " +
                (isSelected
                  ? "bg-gray-50"
                  : "bg-gray-100 hover:bg-gray-100")
              }
            >
              <button
                type="button"
                id={`class-tab-${yearId}-${classId}`}
                role="tab"
                aria-label={`Sección ${classId}`}
                aria-selected={isSelected}
                aria-controls={`class-panel-${yearId}-${classId}`}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => actions.select(classId)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold"
              >
                <span>Sección {classId}</span>
                <StudentCountBadge
                  classId={classId}
                  count={classGroup.students.length}
                />
              </button>
              <button
                type="button"
                onClick={() => actions.delete(classId)}
                className="mr-1 rounded p-1 text-red-500 transition-opacity hover:bg-red-50"
                aria-label={`Eliminar sección ${classId}`}
              >
                <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
      <div className="py-2">
        <button
          type="button"
          onClick={actions.add}
          className="shrink-0 rounded-lg border-2 border-dashed border-gray-300 p-1 text-gray-400 transition-colors hover:bg-gray-50"
          aria-label="Añadir sección"
          title="Añadir sección"
        >
          <Plus aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
