import { UserRound } from "lucide-react";
import { formatClassName } from "../../classDisplay";

import { BodyCell, BodyRow } from "../TablePrimitives";
import { useClassLoader } from "./ClassLoaderContext";
import { getEnrollmentSubjects, normalizeId } from "./classLoaderUtils";
import { useStudentEditor } from "./StudentEditor";
import { DeleteButton, EditButton } from "../../../../components/Button";

export default function StudentRow({ student, selected, actions, columnFields }) {
  const {
    classesByYear,
    subjectsById,
    subjectsByYear,
    years,
  } = useClassLoader();
  const { openEdit, openSection } = useStudentEditor();
  const studentId = normalizeId(student.id);
  const studentName =
    `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim() ||
    studentId;
  const yearClasses = Object.values(
    classesByYear[student._class.year] || {}
  );
  const availablePendingSubjectIds = new Set(
    getEnrollmentSubjects(student._class, years, subjectsByYear).map(
      (subject) => String(subject.id)
    )
  );
  const pendingSubjectLabels = (student.pendingSubjects || [])
    .filter((subjectId) => availablePendingSubjectIds.has(String(subjectId)))
    .map((subjectId) => {
      const subject = subjectsById[String(subjectId)];
      return subject?.abbr || subject?.name || String(subjectId);
    });
  const guardians = student.assignedGuardians || [];

  function handleClassChange(event) {
    actions.move(event.target.value);
  }

  return (
    <BodyRow className="group">
      <BodyCell className="text-center">
        <input
          type="checkbox"
          aria-label={`Seleccionar ${studentName}`}
          checked={selected}
          onChange={actions.select}
        />
      </BodyCell>
      {columnFields.map((attribute) => (
        <BodyCell key={attribute}>
          {attribute === "id" ? (
            <button
              type="button"
              className="text-left underline decoration-emerald-500 decoration-wavy"
              aria-label={`Editar cédula de ${studentName}`}
              onClick={() => openEdit(student)}
            >
              {studentId}
            </button>
          ) : (
            String(student[attribute] ?? "")
          )}
        </BodyCell>
      ))}
      <BodyCell>
        <button
          type="button"
          className="min-w-16 text-left"
          aria-label={`Editar materias pendientes de ${studentName}`}
          onClick={() => openSection(student, "enrollment")}
        >
          {pendingSubjectLabels.length > 0
            ? pendingSubjectLabels.join(", ")
            : "—"}
        </button>
      </BodyCell>
      <BodyCell>
        <button
          type="button"
          className="flex min-w-12 items-center gap-1"
          aria-label={`Editar representantes de ${studentName}`}
          onClick={() => openSection(student, "guardians")}
        >
          {guardians.length > 0 ? (
            guardians.map((guardian) => (
              <UserRound
                key={normalizeId(guardian.id)}
                aria-hidden="true"
                className="h-5 w-5 rounded-full bg-gray-200 text-gray-500 p-0.5"
              />
            ))
          ) : (
            <span>—</span>
          )}
        </button>
      </BodyCell>
      <BodyCell>
        <select
          aria-label={`Cambiar sección de ${studentName}`}
          className="w-[15ch] rounded border border-gray-200 bg-white px-2 py-1"
          value={student._class.id}
          disabled={student._class.id === "z"}
          onChange={handleClassChange}
        >
          {yearClasses.map((classGroup) => (
            <option
              key={classGroup.className}
              value={classGroup.className}
              disabled={classGroup.className === "z"}
            >
              {formatClassName(classGroup.className)}
            </option>
          ))}
        </select>
      </BodyCell>
      <BodyCell>
        <div className="flex justify-center gap-2">
          <EditButton
            type="button"
            onClick={() => openEdit(student)}
            aria-label={`Editar estudiante ${studentName}`}
          />
          <DeleteButton
            type="button"
            onClick={actions.delete}
            aria-label={`Eliminar estudiante ${studentName}`}
          />
        </div>
      </BodyCell>
    </BodyRow>
  );
}
