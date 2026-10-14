import { UserRound } from "lucide-react";
import { Link, useParams } from "react-router";

export default function RelationshipLinks({ records = [], entity }) {
  const { periodId } = useParams();
  if (records.length === 0) return "—";

  return (
    <div className="flex flex-wrap gap-2">
      {records.map((record) => (
        <Link
          key={record.id}
          to={`/periodo/${encodeURIComponent(periodId)}/${entity}/${encodeURIComponent(record.id)}`}
          className="inline-flex items-center gap-1 underline decoration-emerald-500 decoration-dotted underline-offset-4"
        >
          <UserRound aria-hidden="true" className="h-4 w-4" />
          {`${record.firstName || ""} ${record.lastName || ""}`.trim() || record.id}
        </Link>
      ))}
    </div>
  );
}
