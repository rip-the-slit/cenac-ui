import { UserRound } from "lucide-react";
import { Link, useParams } from "react-router";
import { BodyCell, BodyRow } from "../load/TablePrimitives";
import { GUARDIAN_FIELDS } from "./guardiansUtils";

export default function GuardiansTableRow({ guardian, selected, onSelect }) {
  const { periodId } = useParams();
  const name = `${guardian.firstName || ""} ${guardian.lastName || ""}`.trim();
  const students = Array.isArray(guardian.assignedStudents)
    ? guardian.assignedStudents
    : [];
  return (
    <BodyRow>
      <BodyCell className="text-center">
        <input
          type="checkbox"
          aria-label={`Seleccionar ${name || guardian.id}`}
          checked={selected}
          onChange={onSelect}
        />
      </BodyCell>
      {GUARDIAN_FIELDS.map((field) => (
        <BodyCell key={field}>
          <Link className="block" to={String(guardian.id)}>
            {guardian[field] || "—"}
          </Link>
        </BodyCell>
      ))}
      <BodyCell>
        {students.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {students.map((student) => {
              const studentName = `${student.firstName || ""} ${student.lastName || ""}`.trim() || student.id;
              return (
                <Link
                  key={student.id}
                  to={"/periodo/" + periodId + "/estudiantes/" + student.id}
                  className="inline-flex items-center gap-1 underline decoration-emerald-500 decoration-dotted underline-offset-4"
                >
                  <UserRound aria-hidden="true" className="h-4 w-4" />
                  {studentName}
                </Link>
              );
            })}
          </div>
        ) : "—"}
      </BodyCell>
    </BodyRow>
  );
}
