import Filter from "../components/Filter";
import { pickClasses } from "./studentsUtils";
import { formatClassName } from "../classDisplay";

const CONTROL_CLASS_NAME =
  "rounded-lg border border-gray-300 px-3 py-2 font-normal text-gray-900 overflow-hidden w-full";

export default function StudentsFilters({
  FormComponent,
  filters,
  years,
  classesByYear,
  fields,
  statuses,
  guardianLabel = "Representantes",
  onSubmit,
  searchField = "id",
  children,
  paginate = true,
  fieldsetName,
}) {
  const FilterForm = FormComponent;
  const studentFilters = (
    <>
      <Filter label={fields[searchField]?.label || "Buscar estudiante"}>
        <input
          name={searchField}
          className={CONTROL_CLASS_NAME}
          placeholder={fields[searchField]?.placeholder || fields[searchField]?.label}
          size="1"
          defaultValue={filters[searchField]}
          onChange={() => {}}
        />
      </Filter>
      <Filter label={fields.firstName?.label}>
        <input
          name="firstName"
          className={CONTROL_CLASS_NAME}
          placeholder={fields.firstName?.label}
          size="1"
          defaultValue={filters.firstName}
          onChange={() => {}}
        />
      </Filter>
      <Filter label={fields.lastName?.label}>
        <input
          name="lastName"
          className={CONTROL_CLASS_NAME}
          placeholder={fields.lastName?.label}
          size="1"
          defaultValue={filters.lastName}
          onChange={() => {}}
        />
      </Filter>
      <Filter label={fields.birthDate?.label}>
        <input
          name="birthDate"
          type="date"
          className={CONTROL_CLASS_NAME}
          placeholder={fields.birthDate?.label}
          size="1"
          defaultValue={filters.birthDate}
          onChange={() => {}}
        />
      </Filter>
      <Filter label={fields.birthPlace?.label}>
        <input
          name="birthPlace"
          className={CONTROL_CLASS_NAME}
          placeholder={fields.birthPlace?.label}
          size="1"
          defaultValue={filters.birthPlace}
          onChange={() => {}}
        />
      </Filter>
      <Filter label={fields.guardianQ?.label || guardianLabel}>
        <input
          name="guardianQ"
          className={CONTROL_CLASS_NAME}
          placeholder="Buscar representante"
          size="1"
          defaultValue={filters.guardianQ}
          onChange={() => {}}
        />
      </Filter>
      <Filter label={fields.year?.label || "Año"}>
        <select
          name="year"
          className={CONTROL_CLASS_NAME}
          size="1"
          defaultValue={filters.year}
          onChange={() => {}}
        >
          <option value="">Todos los años</option>
          {years.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name}
            </option>
          ))}
        </select>
      </Filter>
      <Filter label={fields.class?.label}>
        <select
          name="class"
          className={CONTROL_CLASS_NAME}
          size="1"
          value={filters.classId}
          onChange={() => {}}
        >
          <option value="">Todas las secciones</option>
          {pickClasses(classesByYear, filters.year).map((classId) => (
            <option key={classId} value={classId}>
              {formatClassName(classId)}
            </option>
          ))}
        </select>
      </Filter>
      <Filter label={fields.status?.label}>
        <select
          name="status"
          className={CONTROL_CLASS_NAME}
          size="1"
          defaultValue={filters.status}
          onChange={() => {}}
        >
          <option value="">Todos los estatus</option>
          {statuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.name}
            </option>
          ))}
        </select>
      </Filter>
    </>
  );

  return (
    <FilterForm
      className="grid gap-3 md:grid-cols-4 max-w-[45rem]"
      method="get"
      onChange={(event) => {
        const formData = new FormData(event.currentTarget);
        const year = String(formData.get("year") || "");
        const classId = String(formData.get("class") || "");
        if (!year || !pickClasses(classesByYear, year).includes(classId)) {
          formData.delete("class");
        }
        if (!formData.get("guardianQ")) formData.delete("guardianQ");
        if (paginate) formData.set("page", "1");
        onSubmit(formData);
      }}
    >
      {children}
      {fieldsetName ? (
        <fieldset className="col-span-full grid min-w-0 gap-3 rounded-lg border border-gray-200 p-3 md:grid-cols-4">
          <legend className="px-1 text-sm font-medium text-gray-700">{fieldsetName}</legend>
          {studentFilters}
        </fieldset>
      ) : studentFilters}
    </FilterForm>
  );
}
