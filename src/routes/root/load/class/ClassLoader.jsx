import { useEffect, useReducer, useRef } from "react";
import { Form, redirect, useActionData, useLoaderData } from "react-router";

import { PageLayout } from "../../../../components/Layout";
import { useErrorDialog } from "../../../../context/ErrorDialogContext";
import {
  getCache,
  getClassSuggestions,
  getYears,
  saveCache,
} from "../../../../db";
import CollapsibleSection from "../CollapsibleSection";
import ClassLoaderContext from "./ClassLoaderContext";
import ClassSelector from "./ClassSelector";
import {
  classLoaderReducer,
  getNextStudentId,
  serializeStudents,
} from "./classLoaderModel";
import StudentEditorProvider from "./StudentEditor";
import { normalizeId } from "./studentIdUtils";

export async function classAction({ request }) {
  try {
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
        return error;
      }
    }

    const { studentClass } = await getClassSuggestions();
    const fields = Object.keys(studentClass).filter(
      (field) => !field.startsWith("_")
    );
    const students = formData.getAll("id").map((studentId) => {
      const student = {};

      for (const field of fields) {
        student[field] = String(
          field === "id"
            ? studentId
            : formData.get(`${field}-${studentId}`) || ""
        );
      }

      const classValue = String(
        formData.get(`_class-${studentId}`) || ""
      );
      const [yearId, classId] = classValue.split("-");
      student._class = { year: Number(yearId), id: classId };
      return student;
    });

    saveCache("class_students", students);
    return redirect("../");
  } catch (error) {
    return error;
  }
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
  const classesByYear = Object.fromEntries(
    years.map((year) => [year.id, {}])
  );
  const studentsById = {};

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
    const normalizedStudent = {
      ...student,
      id: normalizeId(student.id),
      _locked: true,
    };
    studentsById[normalizedStudent.id] = normalizedStudent;
    classesByYear[yearId][className].students.push(normalizedStudent);
  }

  for (const year of years) {
    classesByYear[year.id] = Object.fromEntries(
      Object.entries(classesByYear[year.id]).sort(([left], [right]) =>
        left.localeCompare(right)
      )
    );
  }

  return {
    years,
    classesByYear,
    studentsById,
    studentSchema: {
      template: studentClass,
      attributes: Object.keys(studentClass).filter(
        (field) => !field.startsWith("_")
      ),
      labels: studentFieldLabels,
    },
  };
}

function validateStudentChange({
  change,
  classesByYear,
  studentsById,
  studentSchema,
}) {
  const { mode, originalId, student } = change;
  const studentId = normalizeId(student.id);

  if (!/^[VE]-[1-9]\d{0,7}$/.test(studentId)) {
    return "Ingrese una cédula válida.";
  }

  const missingField = studentSchema.attributes.find(
    (field) => !String(student[field] ?? "").trim()
  );
  if (missingField) {
    return `${studentSchema.labels[missingField] || missingField} es obligatorio.`;
  }

  const duplicate =
    studentsById[studentId] &&
    (mode === "create" || studentId !== originalId);
  if (duplicate) {
    return "Ya existe un estudiante con esta cédula.";
  }

  if (!classesByYear[student._class?.year]?.[student._class?.id]) {
    return "Seleccione una sección válida.";
  }

  if (mode === "edit" && !studentsById[originalId]) {
    return "No se encontró el estudiante que intenta editar.";
  }

  return null;
}

export default function ClassLoader() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const { emitError } = useErrorDialog();
  const payloadRef = useRef(null);
  const studentsRef = useRef(null);
  const [state, dispatch] = useReducer(classLoaderReducer, {
    classesByYear: loaderData.classesByYear,
  });

  if (studentsRef.current === null) {
    studentsRef.current = loaderData.studentsById;
  }

  useEffect(() => {
    if (actionData instanceof Error) {
      emitError(actionData.message);
    }
  }, [actionData, emitError]);

  function handleStudentCommit(change) {
    const error = validateStudentChange({
      change,
      classesByYear: state.classesByYear,
      studentsById: studentsRef.current,
      studentSchema: loaderData.studentSchema,
    });

    if (error) {
      emitError(error);
      return false;
    }

    const { mode, originalId, student } = change;
    const studentId = normalizeId(student.id);

    if (mode === "create") {
      studentsRef.current[studentId] = student;
      dispatch({
        type: "ADD_STUDENT",
        yearId: student._class.year,
        classId: student._class.id,
        student,
      });
      return true;
    }

    const originalStudent = studentsRef.current[originalId];
    delete studentsRef.current[originalId];
    studentsRef.current[studentId] = student;
    dispatch({
      type: "UPDATE_STUDENT",
      yearId: originalStudent._class.year,
      classId: originalStudent._class.id,
      originalId,
      student,
    });
    return true;
  }

  function handleSerializeStudents() {
    payloadRef.current.value = JSON.stringify(
      serializeStudents(studentsRef.current)
    );
  }

  const contextValue = {
    classesByYear: state.classesByYear,
    studentSchema: loaderData.studentSchema,
    studentsRef,
    dispatch,
    emitError,
  };
  const editorConfig = {
    studentSchema: loaderData.studentSchema,
    enrollment: {
      years: loaderData.years,
      classesByYear: state.classesByYear,
    },
    getNextStudentId: () => getNextStudentId(studentsRef.current),
    onCommit: handleStudentCommit,
  };

  return (
    <ClassLoaderContext.Provider value={contextValue}>
      <StudentEditorProvider editorConfig={editorConfig}>
        <PageLayout title="Carga de Secciones">
          <p className="mb-6 text-gray-600">
            Cargue las secciones y sus respectivos estudiantes
          </p>

          <Form method="post" onSubmit={handleSerializeStudents}>
            <input
              ref={payloadRef}
              type="hidden"
              name="students_payload"
              defaultValue=""
            />
            {loaderData.years.map((year, index) => (
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
        </PageLayout>
      </StudentEditorProvider>
    </ClassLoaderContext.Provider>
  );
}
