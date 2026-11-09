import { useState } from "react";
import { formatClassName } from "../../classDisplay";
import { getEnrollmentSubjects } from "./classLoaderUtils";

import { Button, PrimaryButton } from "../../../../components/Button";
import {
  CardHeader,
  FormField,
} from "../../../../components/Layout";

const MAX_PENDING_SUBJECTS = 2;

export default function EnrollmentEditor({
  enrollment,
  student,
  locked,
  onBack,
  onConfirm,
}) {
  const [studentClass, setStudentClass] = useState({
    ...student._class,
  });
  const [pendingSubjects, setPendingSubjects] = useState(
    Array.isArray(student.pendingSubjects)
      ? student.pendingSubjects.map(String)
      : []
  );
  const availableSubjects = getEnrollmentSubjects(
    studentClass,
    enrollment.years,
    enrollment.subjectsByYear
  );
  const availableIds = new Set(
    availableSubjects.map((subject) => String(subject.id))
  );
  const selectedClass = `${studentClass.year ?? ""}:${studentClass.id ?? ""}`;
  const yearClasses = Object.values(
    enrollment.classesByYear[student._class.year] || {}
  );
  const pendingSubjectNames = availableSubjects
    .filter((subject) => pendingSubjects.includes(String(subject.id)))
    .map((subject) => subject.name);

  function handleClassChange(event) {
    const [year, id] = event.target.value.split(":");
    const yearId = Number(year);
    const nextSubjects = getEnrollmentSubjects(
      { year: yearId, id },
      enrollment.years,
      enrollment.subjectsByYear
    );
    const nextIds = new Set(
      nextSubjects.map((subject) => String(subject.id))
    );

    setStudentClass({ year: yearId, id });
    setPendingSubjects((current) =>
      current.filter((subjectId) => nextIds.has(String(subjectId)))
    );
  }

  function togglePendingSubject(subjectId) {
    const id = String(subjectId);
    setPendingSubjects((current) => {
      if (current.includes(id)) {
        return current.filter((candidate) => candidate !== id);
      }
      if (current.length >= MAX_PENDING_SUBJECTS) {
        return current;
      }
      return [...current, id];
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    onConfirm({
      _class: studentClass,
      pendingSubjects: pendingSubjects.filter((subjectId) =>
        availableIds.has(String(subjectId))
      ),
    });
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <CardHeader
        title="Inscripción"
        onBack={onBack}
        backLabel="Volver a los datos del estudiante"
      />

      <FormField label="Sección">
        <select
          aria-label="Sección de inscripción"
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 font-normal"
          value={selectedClass}
          disabled={student._class.id === "z"}
          required
          onChange={handleClassChange}
        >
          {yearClasses.map((classGroup) => (
            <option
              key={classGroup.className}
              value={`${student._class.year}:${classGroup.className}`}
              disabled={classGroup.className === "z"}
            >
              {formatClassName(classGroup.className)}
            </option>
          ))}
        </select>
      </FormField>

      <fieldset className="rounded-lg border border-gray-200 p-4">
        <legend className="px-2 font-semibold text-gray-800">
          Materias pendientes
        </legend>
        {locked ? (
          <p className="text-sm text-gray-500">
            {pendingSubjectNames.length > 0
              ? `Este estudiante lleva pendiente ${pendingSubjectNames.join(", ")}.`
              : "Este estudiante no lleva materias pendientes."}
          </p>
        ) : (
          <>
            <p className="mb-4 text-sm text-gray-500">
              Puede inscribir un máximo de {MAX_PENDING_SUBJECTS} materias pendientes.
            </p>

            {availableSubjects.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {availableSubjects.map((subject) => {
                  const subjectId = String(subject.id);
                  const checked = pendingSubjects.includes(subjectId);
                  return (
                    <label
                      key={subjectId}
                      className="flex items-center gap-3 text-sm text-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={
                          !checked &&
                          pendingSubjects.length >= MAX_PENDING_SUBJECTS
                        }
                        onChange={() => togglePendingSubject(subjectId)}
                      />
                      <span>{subject.name}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                {studentClass.id === "z"
                  ? "No hay materias del último año disponibles para esta inscripción."
                  : "No hay materias del año anterior disponibles para esta inscripción."}
              </p>
            )}
          </>
        )}
      </fieldset>

      <div className="flex justify-end gap-3">
        <Button type="button" onClick={onBack}>
          Cancelar
        </Button>
        <PrimaryButton type="submit">Aceptar</PrimaryButton>
      </div>
    </form>
  );
}
