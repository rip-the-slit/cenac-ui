import { useEffect, useReducer, useRef } from "react";
import { Form, redirect, useActionData, useLoaderData } from "react-router";

import { PrimaryButton } from "../../../../components/Button";
import { PageLayout } from "../../../../components/Layout";
import { useErrorDialog } from "../../../../context/ErrorDialogContext";
import {
  createGuardian,
  getCache,
  getClassSuggestions,
  getGuardians,
  getSubjects,
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
import { getEnrollmentSubjects, normalizeId } from "./classLoaderUtils";

const MAX_GUARDIAN_SUGGESTIONS = 5;

export async function guardianSuggestionsLoader({ request }) {
  const url = new URL(request.url);
  const requestedLimit = Number.parseInt(url.searchParams.get("limit"), 10);
  const limit =
    Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, MAX_GUARDIAN_SUGGESTIONS)
      : MAX_GUARDIAN_SUGGESTIONS;

  return getGuardians({
    id: url.searchParams.get("id") || "",
    page: 1,
    limit,
  });
}

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

function normalizeGuardian(guardian) {
  return {
    ...guardian,
    id: normalizeId(guardian.id),
    _locked: true,
  };
}

export async function classLoader() {
  const cachedStudents = getCache("class_students");
  const cachedSubjectIds = getCache("subjects");
  const [years, subjects, suggestions] = await Promise.all([
    getYears(),
    getSubjects(),
    getClassSuggestions(),
  ]);
  const {
    students: suggestedStudents,
    studentClass,
    studentFieldLabels,
    guardianClass = {},
    guardianFieldLabels = {},
  } = suggestions;
  const students =
    Array.isArray(cachedStudents) && cachedStudents.length > 0
      ? cachedStudents
      : suggestedStudents;
  const classesByYear = Object.fromEntries(
    years.map((year) => [year.id, {}])
  );
  const studentsById = {};
  const subjectsById = Object.fromEntries(
    subjects.map((subject) => [String(subject.id), subject])
  );

  const subjectsByYear = {};

  for (const year of years) {
    const selectedSubjectIds =
      cachedSubjectIds?.[year.id] ??
      cachedSubjectIds?.[String(year.id)] ??
      [];
    subjectsByYear[year.id] = (
      Array.isArray(selectedSubjectIds) ? selectedSubjectIds : []
    )
      .map((subjectId) => subjectsById[String(subjectId)])
      .filter(Boolean);
  }

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
      pendingSubjects: Array.isArray(student.pendingSubjects)
        ? student.pendingSubjects.map(String)
        : [],
      assignedGuardians: Array.isArray(student.assignedGuardians)
        ? student.assignedGuardians
            .filter((guardian) => guardian && typeof guardian === "object")
            .map(normalizeGuardian)
        : [],
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
    subjectsById,
    subjectsByYear,
    studentSchema: {
      template: studentClass,
      attributes: Object.keys(studentClass).filter(
        (field) => !field.startsWith("_")
      ),
      labels: studentFieldLabels,
    },
    guardianSchema: {
      template: guardianClass,
      attributes: Object.keys(guardianClass).filter(
        (field) => !field.startsWith("_")
      ),
      labels: guardianFieldLabels,
    },
  };
}

function validateStudentChange({
  change,
  classesByYear,
  studentsById,
  studentSchema,
  years,
  subjectsByYear,
}) {
  const { mode, originalId, initialClass, student } = change;
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

  if (
    (initialClass?.id === "z" || student._class.id === "z") &&
    (initialClass?.id !== student._class.id ||
      String(initialClass?.year) !== String(student._class.year))
  ) {
    return "La inscripción en sección flotante debe realizarse desde esa sección.";
  }

  const pendingSubjects = Array.isArray(student.pendingSubjects)
    ? student.pendingSubjects.map(String)
    : [];
  if (pendingSubjects.length > 2) {
    return "Solo puede inscribir un máximo de dos materias pendientes.";
  }
  const allowedPendingSubjects = new Set(
    getEnrollmentSubjects(student._class, years, subjectsByYear).map(
      (subject) => String(subject.id)
    )
  );
  if (
    pendingSubjects.some(
      (subjectId) => !allowedPendingSubjects.has(subjectId)
    )
  ) {
    return student._class.id === "z"
      ? "Las materias pendientes deben pertenecer al último año."
      : "Las materias pendientes deben pertenecer al año anterior.";
  }

  const guardianIds = new Set();
  for (const guardian of student.assignedGuardians || []) {
    const guardianId = normalizeId(guardian.id);
    if (guardianIds.has(guardianId)) {
      return "Un representante no puede asignarse más de una vez.";
    }
    guardianIds.add(guardianId);
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
      years: loaderData.years,
      subjectsByYear: loaderData.subjectsByYear,
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

  async function handleGuardianCreate(guardian) {
    const { _locked, ...payload } = guardian;
    return createGuardian(payload);
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
    subjectsById: loaderData.subjectsById,
    subjectsByYear: loaderData.subjectsByYear,
    years: loaderData.years,
    dispatch,
    emitError,
  };
  const editorConfig = {
    emitError,
    studentSchema: loaderData.studentSchema,
    guardianSchema: loaderData.guardianSchema,
    enrollment: {
      years: loaderData.years,
      classesByYear: state.classesByYear,
      subjectsByYear: loaderData.subjectsByYear,
    },
    getNextStudentId: () => getNextStudentId(studentsRef.current),
    onCommit: handleStudentCommit,
    onCreateGuardian: handleGuardianCreate,
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
            <PrimaryButton type="submit">Continuar</PrimaryButton>
          </Form>
        </PageLayout>
      </StudentEditorProvider>
    </ClassLoaderContext.Provider>
  );
}
