import { Form, redirect, useLoaderData } from "react-router";
import {
  getCache,
  getClassSuggestions,
  getYears,
  saveCache,
} from "../../../db";
import CollapsibleSection from "./CollapsibleSection";
import ClassCard from "./ClassCard";
import { createContext, useContext, useReducer, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { useErrorDialog } from "../../../context/ErrorDialogContext";

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
  const fields = Object.keys(studentClass).filter((field) => !field.startsWith("_"));
  const studentIds = formData.getAll("id");
  const students = [];

  for (const studentId of studentIds) {
    const student = {};
    for (const field of fields) {
      student[field] = String(field === "id" ? studentId : formData.get(`${field}-${studentId}`) || "");
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
  const classesByYear = years.reduce((acc, year) => {
    acc[year.id] = [];
    return acc;
  }, {});
  for (const student of students) {
    const yearId = student?._class?.year;
    const classId = student?._class?.id;
    if (!yearId || !classId) {
      continue;
    }
    if (!classesByYear[yearId].includes(classId)) {
      classesByYear[yearId].push(classId);
    }
  }
  Object.values(classesByYear).forEach((classList) => classList.sort());
  return { years, students, classesByYear, studentClass, studentFieldLabels };
}

const ClassLoaderContext = createContext(null);
const STUDENT_ID_BASE = 30000000;

function useClassLoaderContext() {
  const context = useContext(ClassLoaderContext);
  if (!context) {
    throw new Error("useClassLoaderContext must be used inside ClassLoader");
  }
  return context;
}

function getNextStudentId(students) {
  const existing = new Set(
    students.map((student) => String(student.id ?? "").replace(/\D/g, ""))
  );
  let next = STUDENT_ID_BASE;
  while (existing.has(String(next))) {
    next += 1;
  }
  return String(next);
}

function classLoaderReducer(state, action) {
  switch (action.type) {
    case "ADD_CLASS": {
      const currentYearClasses = state.classesByYear[action.yearId] || [];
      return {
        ...state,
        classesByYear: {
          ...state.classesByYear,
          [action.yearId]: [
            ...currentYearClasses,
            String.fromCharCode(65 + currentYearClasses.length),
          ],
        },
      };
    }
    case "DELETE_CLASS": {
      const currentYearClasses = state.classesByYear[action.yearId] || [];
      return {
        ...state,
        classesByYear: {
          ...state.classesByYear,
          [action.yearId]: currentYearClasses.filter(
            (classId) => classId !== action.classId
          ),
        },
      };
    }
    case "UPDATE_STUDENT_FIELD":
      return {
        ...state,
        students: state.students.map((student) =>
          student.id === action.studentId
            ? { ...student, [action.field]: action.value }
            : student
        ),
      };
    case "UPDATE_STUDENT_CLASS":
      return {
        ...state,
        students: state.students.map((student) =>
          student.id === action.studentId
            ? {
                ...student,
                _class: { year: action.yearId, id: action.classId },
              }
            : student
        ),
      };
    case "ADD_STUDENT":
      return {
        ...state,
        students: [...state.students, action.student],
      };
    case "DELETE_STUDENT":
      return {
        ...state,
        students: state.students.filter(
          (student) => student.id !== action.studentId
        ),
      };
    default:
      return state;
  }
}

function StudentRow({ student, studentAttributes }) {
  const { years, classesByYear, dispatch, studentFieldLabels, students, emitError } =
    useClassLoaderContext();
  const selectedClass = `${student._class.year}-${student._class.id}`;

  return (
    <tr className="border-b group">
      {studentAttributes.map((attr) => (
        <td key={attr} className="p-2 border-r">
          <input
            type="text"
            name={attr === "id" ? attr : `${attr}-${student.id}`}
            value={student[attr] ?? ""}
            onChange={(e) => {
              dispatch({
                type: "UPDATE_STUDENT_FIELD",
                studentId: student.id,
                field: attr,
                value: e.target.value,
              });
            }}
            disabled={student._locked === true}
            aria-label={studentFieldLabels[attr] || attr}
            required
            minLength={3}
            inputMode={attr === "id" ? "numeric" : undefined}
            pattern={attr === "id" ? "[0-9.]+" : undefined}
            className="w-full bg-transparent"
          />
        </td>
      ))}
      <td className="p-2 sticky right-0 bg-white">
        <div className="flex items-center gap-2">
          <select
            name={`_class-${student.id}`}
            className="min-w-[2ch]"
            value={selectedClass}
            onChange={(e) => {
              const [yearId, classId] = e.target.value.split("-");
              dispatch({
                type: "UPDATE_STUDENT_CLASS",
                studentId: student.id,
                yearId: Number(yearId),
                classId,
              });
            }}
          >
            {years.map((year) => (
              <optgroup label={year.name} key={year.id}>
                {(classesByYear[year.id] || []).map((c) => (
                  <option key={c} value={`${year.id}-${c}`}>
                    {c}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button
            type="button"
            onClick={() =>
              dispatch({ type: "DELETE_STUDENT", studentId: student.id })
            }
            className="opacity-0 rounded shadow border border-gray-200 group-hover:opacity-100 p-1 text-red-500"
            aria-label="Eliminar estudiante"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function StudentTable({ yearId, classId, students, onDeselectClass }) {
  const { studentClass, dispatch, studentFieldLabels } = useClassLoaderContext();
  const studentAttributes = Object.keys(studentClass).filter(
    (attr) => !attr.startsWith("_")
  );

  return (
    <div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onDeselectClass}
          className="p-1 flex items-center gap-2 text-xs border border-gray-100 rounded-t-lg hover:bg-gray-50"
          aria-label="Deseleccionar sección"
        >
          Sección {classId} <X className="w-4 h-4 text-gray-600" />
        </button>
      </div>
      <div className="overflow-x-auto relative">
        <table className="w-full table-auto">
          <thead className="text-left">
            <tr className="bg-gray-100">
              {studentAttributes.map((attr) => (
                <th key={attr} className="p-2 border-r font-semibold">
                  {studentFieldLabels[attr] || attr}
                </th>
              ))}
              <th className="p-2 sticky right-0 bg-gray-100 font-semibold">
                Sección
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <StudentRow
                key={student.id}
                student={student}
                studentAttributes={studentAttributes}
              />
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={() =>
          dispatch({
            type: "ADD_STUDENT",
            student: {
              ...studentClass,
              _class: {
                year: yearId,
              id: classId,
              },
              id: getNextStudentId(students)
            },
          })
        }
        className="mt-4 border-2 border-dashed border-gray-300 rounded-lg p-2 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors w-full"
      >
        <Plus className="w-5 h-5 text-gray-400" />
        <span className="text-sm text-gray-600">Añadir Estudiante</span>
      </button>
    </div>
  );
}

function ClassGrid({ yearId, classes, onAddClass, onClassClick, onDeleteClass }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {classes.map((className) => (
        <ClassCard
          key={className}
          className={className}
          onClick={() => onClassClick(className)}
          onDelete={() => onDeleteClass(className)}
          showDelete
        />
      ))}
      <button
        type="button"
        onClick={() => onAddClass(yearId)}
        className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center hover:bg-gray-50 transition-colors"
      >
        <Plus className="w-8 h-8 text-gray-400" />
        <span className="mt-2 text-sm text-gray-600">Añadir Sección</span>
      </button>
    </div>
  );
}

function ClassSelector({ yearId }) {
  const { students, classesByYear, dispatch, emitError } = useClassLoaderContext();
  const classes = classesByYear[yearId] || [];
  const [selectedClass, setSelectedClass] = useState(null);

  const handleClassClick = (className) => {
    setSelectedClass((prev) => (prev === className ? null : className));
  };

  const handleDeleteClass = (classId) => {
    const hasStudents = students.some(
      (student) => student._class?.year === yearId && student._class?.id === classId
    );
    if (hasStudents) {
      emitError("No se puede eliminar la sección porque tiene estudiantes asociados. Intente moviendo los estudiantes a otras secciones.");
      return;
    }
    dispatch({ type: "DELETE_CLASS", yearId, classId });
  };

  return (
    <div className="p-4">
      {selectedClass ? (
        <StudentTable
          yearId={yearId}
          classId={selectedClass}
          onDeselectClass={() => setSelectedClass(null)}
          students={students.filter(
            (s) => s._class.year === yearId && s._class?.id === selectedClass
          )}
        />
      ) : (
        <ClassGrid
          yearId={yearId}
          classes={classes}
          onDeleteClass={handleDeleteClass}
          onAddClass={(targetYearId) =>
            dispatch({ type: "ADD_CLASS", yearId: targetYearId })
          }
          onClassClick={handleClassClick}
        />
      )}
    </div>
  );
}

export default function ClassLoader() {
  const loaderData = useLoaderData();
  const { emitError } = useErrorDialog();
  const years = loaderData.years;
  const [state, dispatch] = useReducer(classLoaderReducer, {
    classesByYear: loaderData.classesByYear,
    students: loaderData.students,
  });
  const contextValue = {
    years,
    classesByYear: state.classesByYear,
    students: state.students,
    studentClass: loaderData.studentClass,
    studentFieldLabels: loaderData.studentFieldLabels,
    dispatch,
    emitError,
  };

  return (
    <ClassLoaderContext.Provider value={contextValue}>
      <div className="mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          Carga de Secciones
        </h1>
        <p className="text-gray-600 mb-6 text-center">
          Cargue las secciones y sus repectivos estudiantes
        </p>

        <Form method="post">
          <input
            type="hidden"
            name="students_payload"
            value={JSON.stringify(state.students)}
          />
          {years.map((y, i) => (
            <CollapsibleSection open={i === 0} key={y.id} title={y.name}>
              <ClassSelector yearId={y.id} />
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
