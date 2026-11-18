import Filter from "../components/Filter";
import StudentsFilters from "../students/StudentsFilters";
import { formatClassName } from "../classDisplay";

const CONTROL_CLASS_NAME =
  "rounded-lg border border-gray-300 px-3 py-2 font-normal text-gray-900 overflow-hidden w-full";
const STUDENT_FILTER_NAMES = ["q", "firstName", "lastName", "birthDate", "birthPlace", "guardianQ", "year", "class", "status"];

export default function ReportsFilters({
  FormComponent, filters, reportTypes, fields, years, classesByYear, statuses, onSubmit, hideFilters,
}) {
  const activeReport = reportTypes.find((report) => report.value === filters.reportType);
  const submit = (formData) => {
    if (formData.get("type") !== filters.reportType) {
      for (const report of reportTypes) {
        for (const option of report.options || []) {
          if (!STUDENT_FILTER_NAMES.includes(option.value)) {
            formData.delete(option.value);
          }
        }
      }
    }
    onSubmit(formData);
  };
  return (
    <StudentsFilters
      FormComponent={FormComponent}
      filters={filters}
      fields={fields}
      years={years}
      classesByYear={classesByYear}
      statuses={statuses}
      guardianLabel={fields.guardians?.label}
      searchField="q"
      paginate={false}
      fieldsetName="Filtros del estudiante"
      hideStudentFilters={hideFilters}
      onSubmit={submit}
    >
      {hideFilters && <>
        <input type="hidden" name="hideFilter" value="true" />
        {STUDENT_FILTER_NAMES.map((name) => (
          <input key={name} type="hidden" name={name} value={filters[name === "class" ? "classId" : name] ?? ""} />
        ))}
      </>}
      <Filter label="Tipo de reporte">
        <select name="type" className={CONTROL_CLASS_NAME}
          value={filters.reportType} onChange={() => {}}>
          {reportTypes.map((report) => (
            <option key={report.value} value={report.value}>{report.name}</option>
          ))}
        </select>
      </Filter>
      {(activeReport?.options || []).filter((filter) => !fields[filter.value] && !(hideFilters && STUDENT_FILTER_NAMES.includes(filter.value))).map((filter) => (
        <Filter key={filter.value} label={filter.name}>
          <select name={filter.value} className={CONTROL_CLASS_NAME}
            value={filters[filter.value] ?? filter.options?.[0]?.value ?? ""} onChange={() => {}}>
            {(filter.options || []).map((option) => (
              <option key={option.value} value={option.value}>
                {filter.value === "class" ? formatClassName(option.value) : option.name}
              </option>
            ))}
          </select>
        </Filter>
      ))}
    </StudentsFilters>
  );
}
