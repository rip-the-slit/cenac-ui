import { ArrowUpRight, User } from "lucide-react";
import { Link, useParams } from "react-router";

export default function RelationshipLinks({
  records = [],
  entity,
  expanded = false,
}) {
  const { periodId } = useParams();
  if (records.length === 0) return "—";

  return (
    <div className="flex flex-wrap gap-2">
      {records.map((record) => {
        if (expanded) {
          return (
            <Link
              key={record.id}
              to={`/periodo/${encodeURIComponent(
                periodId
              )}/${entity}/${encodeURIComponent(record.id)}`}
              className="flex items-center justify-between gap-3 text-gray-800 bg-gray-200 p-3 rounded-md"
            >
              <User className="w-8 h-8 text-gray-600"/>
              <div>
                {entity === "estudiantes" ? <p className="text-sm">{record.legalRole} de</p> : ""}
                <div className="flex items-center gap-1 text-gray-700 font-semibold bg-gray-200 rounded-full">
                  {`${record.firstName || ""} ${
                    record.lastName || ""
                  }`.trim() || record.id}
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                {entity === "representantes" ? <p className="text-sm">{record.legalRole}</p> : ""}
              </div>
            </Link>
          );
        } else {
          return (
            <Link
              key={record.id}
              to={`/periodo/${encodeURIComponent(
                periodId
              )}/${entity}/${encodeURIComponent(record.id)}`}
              className="inline-flex items-center gap-1 text-gray-800 bg-gray-200 px-2 rounded-full"
            >
              {`${record.firstName || ""} ${record.lastName || ""}`.trim() ||
                record.id}
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          );
        }
      })}
    </div>
  );
}
