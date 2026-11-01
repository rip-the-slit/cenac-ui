import { ArrowUpRight } from "lucide-react";
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
          className="inline-flex items-center gap-1 text-gray-800 bg-gray-200 px-2 rounded-full"
        >
          {`${record.firstName || ""} ${record.lastName || ""}`.trim() || record.id}
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      ))}
    </div>
  );
}
