import Filter from "./Filter";
import { pickClasses } from "./gradesUtils";

const CONTROL_CLASS_NAME =
  "rounded-lg border border-gray-300 px-3 py-2 font-normal text-gray-900";

export default function GradesFilters({
  FormComponent,
  filters,
  years,
  classesByYear,
  statuses,
  onSubmit,
}) {
  const FilterForm = FormComponent;

  return (
    <FilterForm
      className="grid gap-3 md:grid-cols-4"
      method="get"
      onChange={(event) => {
        const formData = new FormData(event.currentTarget);
        if (!formData.get("year")) formData.delete("class");
        onSubmit(formData);
      }}
    >
      <Filter label="Estudiante">
        <input
          name="q"
          className={CONTROL_CLASS_NAME}
          placeholder="Buscar cédula o nombre"
          value={filters.q}
          onChange={() => {}}
        />
      </Filter>
      <Filter label="Año">
        <select
          name="year"
          className={CONTROL_CLASS_NAME}
          value={filters.year}
          onChange={() => {}}
        >
          <option value="">Todos los años</option>
          {years.map((year) => (
            <option key={year.id} value={year.id}>{year.name}</option>
          ))}
        </select>
      </Filter>
      <Filter label="Sección">
        <select
          name="class"
          className={CONTROL_CLASS_NAME}
          value={filters.classId}
          onChange={() => {}}
        >
          <option value="">Todas las secciones</option>
          {pickClasses(classesByYear, filters.year).map((classId) => (
            <option key={classId} value={classId}>{classId}</option>
          ))}
        </select>
      </Filter>
      <Filter label="Estatus">
        <select
          name="status"
          className={CONTROL_CLASS_NAME}
          value={filters.status}
          onChange={() => {}}
        >
          <option value="">Todos los estatus</option>
          {statuses.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </Filter>
      <input name="expanded" type="hidden" value={filters.expanded} readOnly />
    </FilterForm>
  );
}
