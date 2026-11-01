import {
  BadgeCheck, CalendarDays, ContactRound, HeartHandshake, House,
  IdCard, Info, MapPin, Phone, School, UserRound,
} from "lucide-react";

const FIELD_ICONS = {
  id: IdCard,
  firstName: UserRound,
  lastName: ContactRound,
  birthDate: CalendarDays,
  birthPlace: MapPin,
  legalRole: HeartHandshake,
  phone: Phone,
  address: House,
  status: BadgeCheck,
  class: School,
};
const RELATIONSHIP_FIELDS = new Set(["assignedStudents", "assignedGuardians"]);

export default function DetailFields({ record, fields }) {
  return (
    <dl className="grid gap-5 sm:grid-cols-2">
      {Object.entries(fields)
        .filter(([field]) => !RELATIONSHIP_FIELDS.has(field) && Object.hasOwn(record, field))
        .map(([field, definition]) => {
          const Icon = FIELD_ICONS[field] || Info;
          const value = definition.options?.find(
            (option) => String(option.value) === String(record[field])
          )?.label ?? record[field];
          return (
            <div key={field} className="flex items-start gap-3">
              <Icon aria-hidden="true" className="h-10 w-10 shrink-0 rounded-lg bg-emerald-50 p-2 text-emerald-600" />
              <div className="min-w-0">
                <dt className="text-sm font-medium text-gray-500">{definition.label || field}</dt>
                <dd className="break-words text-base text-gray-900">{value == null || value === "" ? "—" : String(value)}</dd>
              </div>
            </div>
          );
        })}
    </dl>
  );
}
