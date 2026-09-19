import { useState } from "react";

import ClassTabs from "./ClassTabs";
import { useClassLoader } from "./ClassLoaderContext";
import { getNextClassId } from "./classLoaderModel";
import StudentTable from "./StudentTable";

export default function ClassSelector({ yearId }) {
  const { classesByYear, dispatch, emitError } = useClassLoader();
  const yearClasses = classesByYear[yearId] || {};
  const classes = Object.values(yearClasses);
  const [selectedClass, setSelectedClass] = useState(
    classes[0]?.className ?? null
  );
  const selectedClassGroup = selectedClass
    ? yearClasses[selectedClass]
    : null;

  function handleAddClass() {
    const classId = getNextClassId(Object.keys(yearClasses));
    dispatch({ type: "ADD_CLASS", yearId, classId });
    setSelectedClass(classId);
  }

  function selectAfterDeletion(classId) {
    const classIndex = classes.findIndex(
      (candidate) => candidate.className === classId
    );
    const remainingClasses = classes.filter(
      (candidate) => candidate.className !== classId
    );

    setSelectedClass(
      remainingClasses[classIndex]?.className ??
        remainingClasses[classIndex - 1]?.className ??
        null
    );
  }

  function handleDeleteClass(classId) {
    const classGroup = yearClasses[classId];
    if (classGroup.students.length > 0) {
      emitError(
        "No se puede eliminar la sección porque tiene estudiantes asociados. Intente moviendo los estudiantes a otras secciones."
      );
      return;
    }

    if (selectedClass === classId) {
      selectAfterDeletion(classId);
    }
    dispatch({ type: "DELETE_CLASS", yearId, classId });
  }

  const tabActions = {
    add: handleAddClass,
    delete: handleDeleteClass,
    select: setSelectedClass,
  };

  return (
    <div className="p-4">
      <ClassTabs
        yearId={yearId}
        classes={classes}
        selectedClass={selectedClass}
        actions={tabActions}
      />
      {selectedClassGroup ? (
        <div
          id={`class-panel-${yearId}-${selectedClass}`}
          role="tabpanel"
          aria-labelledby={`class-tab-${yearId}-${selectedClass}`}
        >
          <StudentTable
            key={`${yearId}-${selectedClass}`}
            yearId={yearId}
            classId={selectedClass}
            students={selectedClassGroup.students}
          />
        </div>
      ) : (
        <div className="flex min-h-[157px] items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
          No hay ninguna sección asignada.
          <button
            type="button"
            onClick={handleAddClass}
            className="ml-1 text-gray-700 underline decoration-wavy"
          >
            Crear sección
          </button>
        </div>
      )}
    </div>
  );
}
