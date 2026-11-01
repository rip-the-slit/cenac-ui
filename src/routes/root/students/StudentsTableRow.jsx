import RelationshipLinks from "../components/RelationshipLinks";
import { Link } from "react-router";
import { BodyCell, BodyRow } from "../load/TablePrimitives";
import { formatClassName } from "../classDisplay";
import StatusIcon from "../../../components/StatusIcon";

export default function StudentsTableRow({
  student,
  years,
  selected,
  onSelect,
  statuses,
}) {
  const to = String(student.id);
  const yearName =
    years.find((year) => String(year.id) === String(student?._class?.year))
      ?.name || "";
  const statusName =
    statuses.find((status) => String(status.value) === String(student.status))
      ?.name || "";
  const guardians = Array.isArray(student.assignedGuardians)
    ? student.assignedGuardians
    : [];

  return (
    <BodyRow>
      <BodyCell className="text-center">
        <input
          type="checkbox"
          aria-label={`Seleccionar ${student.firstName} ${student.lastName}`}
          checked={selected}
          onChange={onSelect}
        />
      </BodyCell>
      <BodyCell>
        <Link className="block" to={to}>
          {student.id}
        </Link>
      </BodyCell>
      <BodyCell>
        <Link className="block" to={to}>
          {student.firstName}
        </Link>
      </BodyCell>
      <BodyCell>
        <Link className="block" to={to}>
          {student.lastName}
        </Link>
      </BodyCell>
      <BodyCell>
        <Link className="block" to={to}>
          {student.birthDate}
        </Link>
      </BodyCell>
      <BodyCell>
        <Link className="block" to={to}>
          {student.birthPlace}
        </Link>
      </BodyCell>
      <BodyCell>
        <Link className="block" to={to}>
          {`${yearName} ${formatClassName(student?._class?.id || "—")}`.trim()}
        </Link>
      </BodyCell>
      <BodyCell>
        <StatusIcon status={student.status} title={statusName} />
      </BodyCell>
      <BodyCell>
        <RelationshipLinks records={guardians} entity="representantes" />
      </BodyCell>
    </BodyRow>
  );
}
