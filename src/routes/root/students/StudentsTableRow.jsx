import { Link } from "react-router";
import { BodyCell } from "../load/TablePrimitives";

export default function StudentsTableRow({
  student,
  years,
  selected,
  onSelect,
}) {
  const to = String(student.id);
  const yearName =
    years.find(
      (year) => String(year.id) === String(student?._class?.year)
    )?.name || "";

  return (
    <tr className="odd:bg-white even:bg-gray-50 hover:bg-gray-100">
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
          {`${yearName} ${student?._class?.id || ""}`.trim()}
        </Link>
      </BodyCell>
    </tr>
  );
}
