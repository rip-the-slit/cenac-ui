import { UserRound } from "lucide-react";
import { Link, useParams } from "react-router";
import { BodyCell, BodyRow } from "../load/TablePrimitives";
import { formatClassName } from "../classDisplay";

export default function StudentsTableRow({
  student,
  years,
  selected,
  onSelect,
  statuses,
}) {
  const to = String(student.id);
  const { periodId } = useParams();
  const yearName =
    years.find(
      (year) => String(year.id) === String(student?._class?.year)
    )?.name || "";
  const statusName = statuses.find(
    (status) => String(status.value) === String(student.status)
  )?.name || "";
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
      <BodyCell><Link className="block" to={to}>{student.id}</Link></BodyCell>
      <BodyCell><Link className="block" to={to}>{student.firstName}</Link></BodyCell>
      <BodyCell><Link className="block" to={to}>{student.lastName}</Link></BodyCell>
      <BodyCell><Link className="block" to={to}>{student.birthDate}</Link></BodyCell>
      <BodyCell><Link className="block" to={to}>{student.birthPlace}</Link></BodyCell>
      <BodyCell>
        <Link className="block" to={to}>
          {`${yearName} ${formatClassName(student?._class?.id || "—")}`.trim()}
        </Link>
      </BodyCell>
      <BodyCell>{statusName || "—"}</BodyCell>
      <BodyCell>
        {guardians.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {guardians.map((guardian) => {
              const name = `${guardian.firstName || ""} ${guardian.lastName || ""}`.trim() || guardian.id;
              return (
                <Link
                  key={guardian.id}
                  to={"/periodo/" + periodId + "/representantes/" + guardian.id}
                  className="inline-flex items-center gap-1 underline decoration-emerald-500 decoration-dotted underline-offset-4"
                >
                  <UserRound aria-hidden="true" className="h-4 w-4" />
                  {name}
                </Link>
              );
            })}
          </div>
        ) : "—"}
      </BodyCell>
    </BodyRow>
  );
}
