import { Pencil, Trash2, UserRound } from "lucide-react";

import { BodyCell, BodyRow } from "../TablePrimitives";
import { useClassLoader } from "./ClassLoaderContext";
import { useStudentEditor } from "./StudentEditor";
import { normalizeId } from "./studentIdUtils";
import { DeleteButton, EditButton } from "../../../../components/Button";

export default function StudentRow({ student, selected, actions }) {
  const { classesByYear, studentSchema, subjectsById } = useClassLoader();
  const { openEdit, openSection } = useStudentEditor();
  const studentId = normalizeId(student.id);
  const studentName =
    `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim() ||
    studentId;
  const yearClasses = Object.values(
    classesByYear[student._class.year] || {}
  );
  const pendingSubjectLabels = (student.pendingSubjects || []).map(
    (subjectId) => {
      const subject = subjectsById[String(subjectId)];
      return subject?.abbr || subject?.name || String(subjectId);
    }
  );
  const guardians = student.assignedGuardians || [];

  function handleSectionChange(event) {
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
      {studentSchema.attributes.map((attribute) => (
        <BodyCell key={attribute}>
          {attribute === "id" ? (
            <button
              type="button"
              className="text-left underline decoration-emerald-500 decoration-dotted underline-offset-4"
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
          onChange={handleSectionChange}
        >
          {yearClasses.map((classGroup) => (
            <option
              key={classGroup.className}
              value={classGroup.className}
            >
              {classGroup.className}
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
