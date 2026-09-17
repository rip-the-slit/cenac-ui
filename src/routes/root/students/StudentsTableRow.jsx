import { Link } from "react-router";
import { BodyCell, BodyRow } from "../load/TablePrimitives";

export default function StudentsTableRow({
  student,
  years,
  selected,
  onSelect,
  statuses,
}) {
  const to = String(student.id);
  const yearName =
    years.find(
      (year) => String(year.id) === String(student?._class?.year)
    )?.name || "";
  const statusName = statuses.find(
    (status) => String(status.value) === String(student.status)
  )?.name || "";


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
        <Link className="block" to={to}>{student.id}</Link>
      </BodyCell>
      <BodyCell>
        <Link className="block" to={to}>{student.firstName}</Link>
      </BodyCell>
      <BodyCell>
        <Link className="block" to={to}>{student.lastName}</Link>
      </BodyCell>
      <BodyCell>
        <Link className="block" to={to}>{student.birthDate}</Link>
      </BodyCell>
      <BodyCell>
        <Link className="block" to={to}>{student.birthPlace}</Link>
      </BodyCell>
      <BodyCell>
        <Link className="block" to={to}>
          {`${yearName} ${student?._class?.id || "—"}`.trim()}
        </Link>
      </BodyCell>
      <BodyCell>{statusName ?? "—"}</BodyCell>
    </BodyRow>
  );
}
