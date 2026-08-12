import Filter from "../components/Filter";
import { pickClasses } from "./studentsUtils";

const CONTROL_CLASS_NAME =
  "rounded-lg border border-gray-300 px-3 py-2 font-normal text-gray-900 overflow-hidden w-full";

export default function StudentsFilters({
  FormComponent,
  filters,
  years,
  classesByYear,
  studentFieldLabels,
  onSubmit,
}) {
  const FilterForm = FormComponent;

  return (
    <FilterForm
      className="grid gap-3 md:grid-cols-4 max-w-[45rem]"
      method="get"
      onChange={(event) => {
        const formData = new FormData(event.currentTarget);
        if (!formData.get("year")) formData.delete("class");
        formData.set("page", "1");
        onSubmit(formData);
      }}
    >
      <Filter label={studentFieldLabels.id}>
        <input
          name="id"
          className={CONTROL_CLASS_NAME}
          placeholder={studentFieldLabels.id}
          size="1"
          defaultValue={filters.id}
          onChange={() => {}}
        />
      </Filter>
      <Filter label={studentFieldLabels.firstName}>
        <input
          name="firstName"
          className={CONTROL_CLASS_NAME}
          placeholder={studentFieldLabels.firstName}
          size="1"
          defaultValue={filters.firstName}
          onChange={() => {}}
        />
      </Filter>
      <Filter label={studentFieldLabels.lastName}>
        <input
          name="lastName"
          className={CONTROL_CLASS_NAME}
          placeholder={studentFieldLabels.lastName}
          size="1"
          defaultValue={filters.lastName}
          onChange={() => {}}
        />
      </Filter>
      <Filter label={studentFieldLabels.birthDate}>
        <input
          name="birthDate"
          className={CONTROL_CLASS_NAME}
          placeholder={studentFieldLabels.birthDate}
          size="1"
          defaultValue={filters.birthDate}
          onChange={() => {}}
        />
      </Filter>
      <Filter label={studentFieldLabels.birthPlace}>
        <input
          name="birthPlace"
          className={CONTROL_CLASS_NAME}
          placeholder={studentFieldLabels.birthPlace}
          size="1"
          defaultValue={filters.birthPlace}
          onChange={() => {}}
        />
      </Filter>
      <Filter label="Año">
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
      <Filter label="Sección">
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
              {classId}
            </option>
          ))}
        </select>
      </Filter>
    </FilterForm>
  );
}
