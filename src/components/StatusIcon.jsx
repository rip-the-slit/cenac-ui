import { Check, Circle, CircleHelp, CircleOff, Flag, X } from "lucide-react";

const STATUSES = {
  pending: { icon: Flag, label: "Pendiente", color: "text-amber-600" },
  passed: { icon: Check, label: "Aprobado", color: "text-emerald-600" },
  failed: { icon: X, label: "Reprobado", color: "text-red-600" },
  active: {icon: Circle, label: "Activo", color: "text-emerald-600"},
  inactive: {icon: CircleOff, label: "Inactivo", color: "text-gray-600"}
};

export default function StatusIcon({ status, title, className = "" }) {
  if (!status) return null;
  const config = STATUSES[status];
  const Icon = config?.icon || CircleHelp;
  const accessibleTitle = title || config?.label || String(status);

  return (
    <span
      role="img"
      aria-label={accessibleTitle}
      title={accessibleTitle}
      className={`inline-flex w-20 ${config?.color || "text-gray-500"} ${className}`}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
    </span>
  );
}
