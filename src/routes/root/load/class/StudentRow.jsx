import { Pencil, Trash2 } from "lucide-react";

import { BodyCell, BodyRow } from "../TablePrimitives";
import { useClassLoader } from "./ClassLoaderContext";
import { useStudentEditor } from "./StudentEditor";
import { normalizeId } from "./studentIdUtils";

export default function StudentRow({ student, selected, actions }) {
  const { classesByYear, studentSchema } = useClassLoader();
  const { openEdit } = useStudentEditor();
  const studentId = normalizeId(student.id);
  const studentName =
    `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim() ||
    studentId;
  const yearClasses = Object.values(
    classesByYear[student._class.year] || {}
  );

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
          <button
            type="button"
            onClick={() => openEdit(student)}
            className="rounded border border-gray-200 p-1 text-gray-600 shadow hover:bg-gray-50"
            aria-label={`Editar estudiante ${studentName}`}
          >
            <Pencil aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={actions.delete}
            className="rounded border border-gray-200 p-1 text-red-500 shadow hover:bg-red-50"
            aria-label={`Eliminar estudiante ${studentName}`}
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </BodyCell>
    </BodyRow>
  );
}
