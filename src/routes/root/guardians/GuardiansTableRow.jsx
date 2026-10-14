import RelationshipLinks from "../components/RelationshipLinks";
import { Link } from "react-router";
import { BodyCell, BodyRow } from "../load/TablePrimitives";
import { GUARDIAN_FIELDS } from "./guardiansUtils";

export default function GuardiansTableRow({ guardian, selected, onSelect }) {
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
        <RelationshipLinks records={students} entity="estudiantes" />
      </BodyCell>
    </BodyRow>
  );
}
