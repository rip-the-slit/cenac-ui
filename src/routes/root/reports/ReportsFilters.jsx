import { X } from "lucide-react";
import Filter from "../components/Filter";

const CONTROL_CLASS_NAME =
  "rounded-lg border border-gray-300 px-3 py-2 font-normal text-gray-900 overflow-hidden w-full";

export default function ReportsFilters({
  FormComponent,
  filters,
  reportTypes,
  onSubmit,
}) {
  const FilterForm = FormComponent;
  const activeReport = reportTypes.find(
    (report) => report.value === filters.reportType
  );
  const studentIds = [
    ...new Set(
      (filters.q || "")
        .split(/\s+OR\s+/)
        .map((id) => id.trim())
        .filter(Boolean)
    ),
  ];

  const submitWithoutStudent = (studentId, form) => {
    const formData = new FormData(form);
    const remainingIds = studentIds.filter((id) => id !== studentId);
    if (remainingIds.length > 0) {
      formData.set("q", remainingIds.join(" OR "));
    } else {
      formData.delete("q");
    }
    onSubmit(formData);
  };

  return (
    <FilterForm
      className="grid gap-3 md:grid-cols-4 md:auto-cols-4 max-w-[45rem]"
      method="get"
      onChange={(event) => {
        const formData = new FormData(event.currentTarget);
        if (event.target.name === "type") {
          for (const report of reportTypes) {
            for (const option of report.options || []) {
              formData.delete(option.value);
            }
          }
        }
        onSubmit(formData);
      }}
    >
      <Filter label="Tipo de reporte">
        <select
          name="type"
          className={CONTROL_CLASS_NAME}
          value={activeReport?.value || reportTypes[0]?.value || ""}
          onChange={() => {}}
        >
          {reportTypes.map((report) => (
            <option key={report.value} value={report.value}>
              {report.name}
            </option>
          ))}
        </select>
      </Filter>

      {(activeReport?.options || []).map((filter) => (
        <Filter key={filter.value} label={filter.name}>
          <select
            name={filter.value}
            className={CONTROL_CLASS_NAME}
            value={filters[filter.value] ?? filter.options?.[0]?.value ?? ""}
            onChange={() => {}}
          >
            {(filter.options || []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.name}
              </option>
            ))}
          </select>
        </Filter>
      ))}

      <Filter label="Estudiantes" group>
        <input type="hidden" name="q" value={filters.q || ""} readOnly />
        <ul
          className={`${CONTROL_CLASS_NAME} max-h-14 overflow-y-auto`}
          aria-label="Estudiantes seleccionados"
        >
          {studentIds.length === 0 ? (
            <li className="text-gray-500">Todos los estudiantes</li>
          ) : (
            studentIds.map((studentId) => (
              <li key={studentId}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                  aria-label={`Quitar ${studentId}`}
                  onClick={(event) =>
                    submitWithoutStudent(studentId, event.currentTarget.form)
                  }
                >
                  <span>{studentId}</span>
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))
          )}
        </ul>
      </Filter>
    </FilterForm>
  );
}
