import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { Form, redirect, useLoaderData } from "react-router";
import { Plus, Trash2, User } from "lucide-react";

import { useErrorDialog } from "../../../context/ErrorDialogContext";
import {
  getCache,
  getClassSuggestions,
  getYears,
  saveCache,
} from "../../../db";
import IdInput, { normalizeId } from "./IdInput";
import TableControl from "../components/TableControl";
import CollapsibleSection from "./CollapsibleSection";
import {
  BodyCell,
  DataTable,
  HeadCell,
  TableBody,
  TableContainer,
  TableHead,
} from "./TablePrimitives";

const STUDENT_ID_BASE = 30000000;
const MAX_TABLE_ROWS = 10;
const BULK_ACTION_OPTIONS = [
  { value: "delete", label: "Eliminar seleccionados" },
];

export async function classAction({ request }) {
  const formData = await request.formData();
  const studentsPayload = formData.get("students_payload");
  if (typeof studentsPayload === "string" && studentsPayload.length > 0) {
    try {
      const students = JSON.parse(studentsPayload);
      if (Array.isArray(students)) {
        saveCache("class_students", students);
        return redirect("../");
      }
    } catch (error) {
      console.error(error);
    }
  }

  const { studentClass } = await getClassSuggestions();
  const fields = Object.keys(studentClass).filter(
    (field) => !field.startsWith("_")
  );
  const studentIds = formData.getAll("id");
  const students = [];

  for (const studentId of studentIds) {
    const student = {};
    for (const field of fields) {
      student[field] = String(
        field === "id" ? studentId : formData.get(`${field}-${studentId}`) || ""
      );
    }

    const classValue = String(formData.get(`_class-${studentId}`) || "");
    const [yearId, classId] = classValue.split("-");
    student._class = { year: Number(yearId), id: classId };
    students.push(student);
  }

  saveCache("class_students", students);
  return redirect("../");
}

export async function classLoader() {
  const years = await getYears();
  const cachedStudents = getCache("class_students");
  const {
    students: suggestedStudents,
    studentClass,
    studentFieldLabels,
  } = await getClassSuggestions();
  const students =
    Array.isArray(cachedStudents) && cachedStudents.length > 0
      ? cachedStudents
      : suggestedStudents;
  const classesByYear = Object.fromEntries(years.map((year) => [year.id, {}]));
  let nextRowSequence = 0;

  for (const student of students) {
    const yearId = student?._class?.year;
    const className = student?._class?.id;
    if (!yearId || !className || !classesByYear[yearId]) {
      continue;
    }

    classesByYear[yearId][className] ??= {
      className,
      students: [],
    };
    classesByYear[yearId][className].students.push({
      ...student,
      id: normalizeId(student.id),
      _rowId: `student-row-${nextRowSequence}`,
    });
    nextRowSequence += 1;
  }

  for (const year of years) {
    classesByYear[year.id] = Object.fromEntries(
      Object.entries(classesByYear[year.id]).sort(([left], [right]) =>
        left.localeCompare(right)
      )
    );
  }

  const studentAttributes = Object.keys(studentClass).filter(
    (field) => !field.startsWith("_")
  );

  return {
    years,
    classesByYear,
    studentClass,
    studentAttributes,
    studentFieldLabels,
    nextRowSequence,
  };
}

const ClassLoaderContext = createContext(null);

function useClassLoaderContext() {
  const context = useContext(ClassLoaderContext);
  if (!context) {
    throw new Error("useClassLoaderContext must be used inside ClassLoader");
  }
  return context;
}

function getNextStudentId(classesByYear) {
  const existing = new Set();
  for (const classes of Object.values(classesByYear)) {
    for (const classGroup of Object.values(classes)) {
      for (const student of classGroup.students) {
        existing.add(String(student.id ?? "").replace(/\D/g, ""));
      }
    }
  }
  let next = STUDENT_ID_BASE;
  while (existing.has(String(next))) {
    next += 1;
  }
  return `V-${next}`;
}

function getNextClassId(classes) {
  const existing = new Set(classes);
  let index = 0;
  let classId = "A";
  while (existing.has(classId)) {
    index += 1;
    classId = String.fromCharCode(65 + index);
  }
  return classId;
}

function updateClassStudents(state, yearId, classId, update) {
  const yearClasses = state.classesByYear[yearId];
  const classGroup = yearClasses?.[classId];
  if (!classGroup) {
    return state;
  }

  return {
    ...state,
    classesByYear: {
      ...state.classesByYear,
      [yearId]: {
        ...yearClasses,
        [classId]: {
          ...classGroup,
          students: update(classGroup.students),
        },
      },
    },
  };
}

function classLoaderReducer(state, action) {
  switch (action.type) {
    case "ADD_CLASS": {
      const yearClasses = state.classesByYear[action.yearId] || {};
      return {
        ...state,
        classesByYear: {
          ...state.classesByYear,
          [action.yearId]: {
            ...yearClasses,
            [action.classId]: {
              className: action.classId,
              students: [],
            },
          },
        },
      };
    }
    case "DELETE_CLASS": {
      const yearClasses = state.classesByYear[action.yearId] || {};
      const nextYearClasses = { ...yearClasses };
      delete nextYearClasses[action.classId];
      return {
        ...state,
        classesByYear: {
          ...state.classesByYear,
          [action.yearId]: nextYearClasses,
        },
      };
    }
    case "MOVE_STUDENT": {
      if (
        action.yearId === action.targetYearId &&
        action.classId === action.targetClassId
      ) {
        return state;
      }

      const sourceStudents =
        state.classesByYear[action.yearId]?.[action.classId]?.students;
      const studentIndex = sourceStudents?.findIndex(
        (candidate) => candidate._rowId === action.rowId
      );
      if (studentIndex == null || studentIndex < 0) {
        return state;
      }
      const student = sourceStudents[studentIndex];

      const withoutStudent = updateClassStudents(
        state,
        action.yearId,
        action.classId,
        (students) => {
          const nextStudents = students.slice();
          nextStudents.splice(studentIndex, 1);
          return nextStudents;
        }
      );
      return updateClassStudents(
        withoutStudent,
        action.targetYearId,
        action.targetClassId,
        (students) => [
          ...students,
          {
            ...student,
            _class: {
              year: action.targetYearId,
              id: action.targetClassId,
            },
          },
        ]
      );
    }
    case "ADD_STUDENT":
      return updateClassStudents(
        state,
        action.yearId,
        action.classId,
        (students) => [...students, action.student]
      );
    case "DELETE_STUDENT":
      return updateClassStudents(
        state,
        action.yearId,
        action.classId,
        (students) =>
          students.filter((student) => student._rowId !== action.rowId)
      );
    case "DELETE_STUDENTS": {
      const deletedRowIds = new Set(action.rowIds);
      return updateClassStudents(
        state,
        action.yearId,
        action.classId,
        (students) =>
          students.filter((student) => !deletedRowIds.has(student._rowId))
      );
    }
    default:
      return state;
  }
}

function StudentRow({
  student,
  studentAttributes,
  selected,
  onSelect,
  onDelete,
  onMove,
}) {
  const { years, classesByYear, draftsRef, studentFieldLabels } =
    useClassLoaderContext();
  const [isChangingClass, setIsChangingClass] = useState(false);
  const changeClassButtonRef = useRef(null);
  const selectedClass = `${student._class.year}-${student._class.id}`;
  const studentName =
    `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim() ||
    String(student.id);

  const finishChangingClass = () => {
    setIsChangingClass(false);
    requestAnimationFrame(() => changeClassButtonRef.current?.focus());
  };

  return (
    <tr className="group odd:bg-white even:bg-gray-50 hover:bg-gray-100">
      <BodyCell className="text-center">
        <input
          type="checkbox"
          aria-label={`Seleccionar ${studentName}`}
          checked={selected}
          onChange={onSelect}
        />
      </BodyCell>
      {studentAttributes.map((attr) => (
        <BodyCell key={attr}>
          {attr === "id" ? (
            <IdInput
              defaultValue={
                draftsRef.current[student._rowId]?.[attr] ??
                student[attr] ??
                ""
              }
              disabled={student._locked === true}
              label={studentFieldLabels[attr] || attr}
              onValueChange={(value) => {
                draftsRef.current[student._rowId] = {
                  ...draftsRef.current[student._rowId],
                  [attr]: value,
                };
              }}
            />
          ) : (
            <input
              type="text"
              defaultValue={
                draftsRef.current[student._rowId]?.[attr] ??
                student[attr] ??
                ""
              }
              onChange={(event) => {
                draftsRef.current[student._rowId] = {
                  ...draftsRef.current[student._rowId],
                  [attr]: event.target.value,
                };
              }}
              disabled={student._locked === true}
              aria-label={studentFieldLabels[attr] || attr}
              required
              minLength={3}
              className="w-full bg-transparent"
            />
          )}
        </BodyCell>
      ))}
      <BodyCell className="">
        <div className="flex gap-2">
          {isChangingClass ? (
            <select
              aria-label={`Cambiar sección de ${studentName}`}
              className="w-[15ch]"
              defaultValue={selectedClass}
              autoFocus
              onBlur={finishChangingClass}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  finishChangingClass();
                }
              }}
              onChange={(event) => {
                const [targetYearId, targetClassId] =
                  event.target.value.split("-");
                onMove(Number(targetYearId), targetClassId);
                finishChangingClass();
              }}
            >
              {years.map((year) => (
                <optgroup label={year.name} key={year.id}>
                  {Object.values(classesByYear[year.id] || {}).map(
                    (classGroup) => (
                      <option
                        key={classGroup.className}
                        value={`${year.id}-${classGroup.className}`}
                      >
                        {classGroup.className}
                      </option>
                    )
                  )}
                </optgroup>
              ))}
            </select>
          ) : (
            <button
              ref={changeClassButtonRef}
              type="button"
              onClick={() => setIsChangingClass(true)}
              aria-label={`Cambiar sección de ${studentName}`}
              className="rounded bg-white border border-gray-200 w-[15ch]"
            >
              {student._class.id}
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="rounded border border-gray-200 p-1 text-red-500 opacity-0 shadow group-hover:opacity-100 group-focus-within:opacity-100"
            aria-label="Eliminar estudiante"
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </BodyCell>
    </tr>
  );
}

function StudentTable({ yearId, classId, students }) {
  const {
    createRowId,
    draftsRef,
    studentAttributes,
    studentClass,
    dispatch,
    studentFieldLabels,
    classesByYear,
  } = useClassLoaderContext();
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

  const removeSelection = (rowId) => {
    setSelectedIds((current) => {
      const next = { ...current };
      delete next[rowId];
      return next;
    });
  };

  const handleBulkAction = (action) => {
    if (action !== "delete") {
      return;
    }

    const rowIds = [];
    for (const student of students) {
      if (
        selectedIds.all
          ? selectedIds[student._rowId] !== false
          : selectedIds[student._rowId] === true
      ) {
        rowIds.push(student._rowId);
        delete draftsRef.current[student._rowId];
      }
    }
    if (rowIds.length === 0) {
      return;
    }

    dispatch({
      type: "DELETE_STUDENTS",
      yearId,
      classId,
      rowIds,
    });
    setSelectedIds({ all: false });
  };

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
        <TableContainer className="relative max-h-[55vh] overflow-auto">
          <DataTable className="text-sm">
            <TableHead className="sticky top-0 z-10 bg-gray-100 shadow-md">
              <tr>
                <HeadCell className="bg-gray-100 text-center">
                  <input
                    type="checkbox"
                    aria-label="Seleccionar todos"
                    checked={allSelected}
                    onChange={(event) =>
                      setSelectedIds(
                        event.target.checked ? { all: true } : { all: false }
                      )
                    }
                  />
                </HeadCell>
                {studentAttributes.map((attr) => (
                  <HeadCell key={attr} className="bg-gray-100">
                    {studentFieldLabels[attr] || attr}
                  </HeadCell>
                ))}
                <HeadCell className="sticky right-0 bg-gray-100">
                  Sección
                </HeadCell>
              </tr>
            </TableHead>
            <TableBody>
              {visibleStudents.map((student) => (
                <StudentRow
                  key={student._rowId}
                  student={student}
                  studentAttributes={studentAttributes}
                  selected={
                    selectedIds.all
                      ? selectedIds[student._rowId] !== false
                      : selectedIds[student._rowId] === true
                  }
                  onSelect={() =>
                    setSelectedIds((current) => ({
                      ...current,
                      [student._rowId]: current.all
                        ? current[student._rowId] === false
                        : current[student._rowId] !== true,
                    }))
                  }
                  onDelete={() => {
                    delete draftsRef.current[student._rowId];
                    removeSelection(student._rowId);
                    dispatch({
                      type: "DELETE_STUDENT",
                      yearId,
                      classId,
                      rowId: student._rowId,
                    });
                  }}
                  onMove={(targetYearId, targetClassId) => {
                    removeSelection(student._rowId);
                    dispatch({
                      type: "MOVE_STUDENT",
                      yearId,
                      classId,
                      rowId: student._rowId,
                      targetYearId,
                      targetClassId,
                    });
                  }}
                />
              ))}
            </TableBody>
          </DataTable>
        </TableContainer>
        <button
          type="button"
          onClick={() => {
            const studentId = getNextStudentId(classesByYear);
            dispatch({
              type: "ADD_STUDENT",
              yearId,
              classId,
              student: {
                ...studentClass,
                _class: { year: yearId, id: classId },
                _rowId: createRowId(),
                id: studentId,
              },
            });
            setPage(Math.ceil((recordsAmount + 1) / MAX_TABLE_ROWS));
          }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-2 transition-colors hover:bg-gray-50"
        >
          <Plus aria-hidden="true" className="h-5 w-5 text-gray-400" />
          <span className="text-sm text-gray-600">Añadir Estudiante</span>
        </button>
      </TableControl>
    </div>
  );
}
function StudentCountBadge({ classId, count }) {
  const previousCount = useRef(count);
  const [animationVersion, setAnimationVersion] = useState(0);

  useEffect(() => {
    if (previousCount.current !== count) {
      previousCount.current = count;
      setAnimationVersion((version) => version + 1);
    }
  }, [count]);

  return (
    <span
      key={animationVersion}
      aria-label={`${count} estudiantes en la sección ${classId}`}
      className={
        "inline-flex origin-left items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800 " +
        (animationVersion > 0 ? "animate-class-student-count" : "")
      }
    >
      <User aria-hidden="true" className="h-3.5 w-3.5" />
      <span aria-hidden="true">{count}</span>
    </span>
  );
}

function ClassTabs({
  yearId,
  classes,
  selectedClass,
  onAddClass,
  onDeleteClass,
  onSelectClass,
}) {
  return (
    <div className="flex gap-2">
      <div
        role="tablist"
        aria-label="Secciones"
        className="flex min-w-0 gap-2 overflow-x-auto"
      >
        {classes.map((classGroup, classIndex) => {
          const classId = classGroup.className;
          const isSelected = selectedClass === classId;

          return (
            <div
              key={classId}
              className={
                "group flex shrink-0 min-w-[225px] items-center justify-between rounded-t-lg border border-b-0 transition-colors text-gray-600 border-gray-200 " +
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
                onClick={() => onSelectClass(classId)}
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
                onClick={() => onDeleteClass(classId)}
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
        onClick={onAddClass}
        className="shrink-0 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 p-1 transition-colors hover:bg-gray-50"
        aria-label="Añadir sección"
        title="Añadir sección"
      >
        <Plus aria-hidden="true" className="h-5 w-5" />
      </button>
      </div>
      
    </div>
  );
}

function ClassSelector({ yearId }) {
  const { classesByYear, dispatch, emitError } = useClassLoaderContext();
  const yearClasses = classesByYear[yearId] || {};
  const classes = Object.values(yearClasses);
  const [selectedClass, setSelectedClass] = useState(
    classes[0]?.className ?? null
  );
  const selectedClassGroup = selectedClass ? yearClasses[selectedClass] : null;

  const handleAddClass = () => {
    const classId = getNextClassId(Object.keys(yearClasses));
    dispatch({ type: "ADD_CLASS", yearId, classId });
    setSelectedClass(classId);
  };

  const handleDeleteClass = (classId) => {
    const classGroup = yearClasses[classId];
    if (classGroup.students.length > 0) {
      emitError(
        "No se puede eliminar la sección porque tiene estudiantes asociados. Intente moviendo los estudiantes a otras secciones."
      );
      return;
    }

    if (selectedClass === classId) {
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
    dispatch({ type: "DELETE_CLASS", yearId, classId });
  };

  return (
    <div className="p-4">
      <ClassTabs
        yearId={yearId}
        classes={classes}
        selectedClass={selectedClass}
        onAddClass={handleAddClass}
        onDeleteClass={handleDeleteClass}
        onSelectClass={setSelectedClass}
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
        <div className="flex min-h-[157px] items-center justify-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
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

export default function ClassLoader() {
  const loaderData = useLoaderData();
  const { emitError } = useErrorDialog();
  const years = loaderData.years;
  const draftsRef = useRef({});
  const nextRowSequenceRef = useRef(loaderData.nextRowSequence);
  const payloadRef = useRef(null);
  const [state, dispatch] = useReducer(classLoaderReducer, {
    classesByYear: loaderData.classesByYear,
  });
  const contextValue = {
    years,
    classesByYear: state.classesByYear,
    studentClass: loaderData.studentClass,
    studentAttributes: loaderData.studentAttributes,
    studentFieldLabels: loaderData.studentFieldLabels,
    draftsRef,
    createRowId: () => `student-row-${nextRowSequenceRef.current++}`,
    dispatch,
    emitError,
  };

  const serializeStudents = () => {
    const students = [];
    for (const classes of Object.values(state.classesByYear)) {
      for (const classGroup of Object.values(classes)) {
        for (const student of classGroup.students) {
          const { _rowId, ...persistedStudent } = student;
          students.push({
            ...persistedStudent,
            ...draftsRef.current[_rowId],
          });
        }
      }
    }
    payloadRef.current.value = JSON.stringify(students);
  };

  return (
    <ClassLoaderContext.Provider value={contextValue}>
      <div className="mx-auto">
        <h1 className="mb-8 text-center text-3xl font-bold">
          Carga de Secciones
        </h1>
        <p className="mb-6 text-center text-gray-600">
          Cargue las secciones y sus respectivos estudiantes
        </p>

        <Form method="post" onSubmit={serializeStudents}>
          <input
            ref={payloadRef}
            type="hidden"
            name="students_payload"
            defaultValue=""
          />
          {years.map((year, index) => (
            <CollapsibleSection
              open={index <= 1}
              key={year.id}
              title={year.name}
            >
              <ClassSelector yearId={year.id} />
            </CollapsibleSection>
          ))}
          <button
            type="submit"
            className="text-emerald-600 underline decoration-wavy"
          >
            Continuar
          </button>
        </Form>
      </div>
    </ClassLoaderContext.Provider>
  );
}
