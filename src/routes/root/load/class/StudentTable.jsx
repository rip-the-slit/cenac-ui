import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "../../../../components/Button";
import TableControl from "../../components/TableControl";
import {
  DataTable,
  HeadCell,
  TableBody,
  TableContainer,
  TableHead,
} from "../TablePrimitives";
import { useClassLoader } from "./ClassLoaderContext";
import StudentRow from "./StudentRow";
import { useStudentEditor } from "./StudentEditor";
import { normalizeId } from "./classLoaderUtils";

const MAX_TABLE_ROWS = 10;
const BULK_ACTION_OPTIONS = [
  { value: "delete", label: "Eliminar seleccionados" },
];

export default function StudentTable({ yearId, classId, students }) {
  const {
    studentSchema,
    dispatch,
    studentsRef,
    classesByYear,
    emitError,
  } = useClassLoader();
  const { openCreate } = useStudentEditor();
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState({ all: false });
  const recordsAmount = students.length;
  const pageCount = Math.max(1, Math.ceil(recordsAmount / MAX_TABLE_ROWS));
  const currentPage = Math.min(page, pageCount);
  const visibleStudents = students.slice(
    (currentPage - 1) * MAX_TABLE_ROWS,
    currentPage * MAX_TABLE_ROWS
  );
  const allSelected =
    selectedIds.all &&
    !Object.values(selectedIds).some((selected) => selected === false);

  function removeSelection(studentId) {
    setSelectedIds((current) => {
      const next = { ...current };
      delete next[studentId];
      return next;
    });
  }

  function isSelected(studentId) {
    return selectedIds.all
      ? selectedIds[studentId] !== false
      : selectedIds[studentId] === true;
  }

  function toggleSelection(studentId) {
    setSelectedIds((current) => ({
      ...current,
      [studentId]: current.all
        ? current[studentId] === false
        : current[studentId] !== true,
    }));
  }

  function handleSelectAll(event) {
    setSelectedIds(
      event.target.checked ? { all: true } : { all: false }
    );
  }

  function handleBulkAction(action) {
    if (action !== "delete") {
      return;
    }

    const studentIds = [];
    for (const student of students) {
      const studentId = normalizeId(student.id);
      if (isSelected(studentId)) {
        studentIds.push(studentId);
        delete studentsRef.current[studentId];
      }
    }

    if (studentIds.length > 0) {
      dispatch({
        type: "DELETE_STUDENTS",
        yearId,
        classId,
        studentIds,
      });
      setSelectedIds({ all: false });
    }
  }

  function deleteStudent(studentId) {
    delete studentsRef.current[studentId];
    removeSelection(studentId);
    dispatch({
      type: "DELETE_STUDENT",
      yearId,
      classId,
      studentId,
    });
  }

  function moveStudent(student, targetClassId) {
    if (targetClassId === classId) {
      return;
    }

    if (
      !classesByYear[yearId]?.[targetClassId] ||
      classId === "z" ||
      targetClassId === "z"
    ) {
      emitError("Seleccione una sección válida.");
      return;
    }

    const studentId = normalizeId(student.id);
    studentsRef.current[studentId] = {
      ...student,
      _class: { year: yearId, id: targetClassId },
    };
    removeSelection(studentId);
    dispatch({
      type: "MOVE_STUDENT",
      yearId,
      classId,
      studentId,
      targetYearId: yearId,
      targetClassId,
    });
  }

  function getStudentActions(student) {
    const studentId = normalizeId(student.id);

    return {
      select: () => toggleSelection(studentId),
      delete: () => deleteStudent(studentId),
      move: (targetClassId) => moveStudent(student, targetClassId),
    };
  }

  function handleStudentAdded() {
    setPage(
      Math.max(1, Math.ceil((recordsAmount + 1) / MAX_TABLE_ROWS))
    );
  }

  function handleAddStudent() {
    openCreate({
      yearId,
      classId,
      onCommitted: handleStudentAdded,
    });
  }

  return (
    <div>
      <TableControl
        page={currentPage}
        pageCount={pageCount}
        recordsAmount={recordsAmount}
        selectedIds={selectedIds}
        bulkActionId={`class-students-bulk-action-${yearId}-${classId}`}
        bulkActionLabel="Acciones de estudiantes"
        bulkActionOptions={BULK_ACTION_OPTIONS}
        onBulkAction={handleBulkAction}
        onPageChange={setPage}
      >
        <TableContainer className="max-h-[55vh] overflow-auto">
          <DataTable>
            <TableHead>
              <tr>
                <HeadCell className="text-center">
                  <input
                    type="checkbox"
                    aria-label="Seleccionar todos"
                    checked={allSelected}
                    onChange={handleSelectAll}
                  />
                </HeadCell>
                {studentSchema.attributes.map((attribute) => (
                  <HeadCell key={attribute}>
                    {studentSchema.labels[attribute] || attribute}
                  </HeadCell>
                ))}
                <HeadCell>Materias pendientes</HeadCell>
                <HeadCell>Representantes</HeadCell>
                <HeadCell>Sección</HeadCell>
                <HeadCell>Acciones</HeadCell>
              </tr>
            </TableHead>
            <TableBody>
              {visibleStudents.map((student) => {
                const studentId = normalizeId(student.id);

                return (
                  <StudentRow
                    key={studentId}
                    student={student}
                    selected={isSelected(studentId)}
                    actions={getStudentActions(student)}
                  />
                );
              })}
            </TableBody>
          </DataTable>
        </TableContainer>
        <button
          type="button"
          onClick={handleAddStudent}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-2 transition-colors hover:bg-gray-50"
        >
          <Plus aria-hidden="true" className="h-5 w-5 text-gray-400" />
          <span className="text-sm text-gray-600">Añadir Estudiante</span>
        </button>
      </TableControl>
    </div>
  );
}
