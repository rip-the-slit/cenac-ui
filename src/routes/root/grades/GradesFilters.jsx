import Filter from "../components/Filter";
import { pickClasses } from "./gradesUtils";

const CONTROL_CLASS_NAME =
  "rounded-lg border border-gray-300 px-3 py-2 font-normal text-gray-900 overflow-hidden w-full";

export default function GradesFilters({
  FormComponent,
  filters,
  years,
  classesByYear,
  statuses,
  subjects,
  onSubmit,
}) {
  const FilterForm = FormComponent;

  return (
    <FilterForm
      className="grid gap-3 md:grid-cols-4 md:auto-cols-4 max-w-[45rem]"
      method="get"
      onChange={(event) => {
        const formData = new FormData(event.currentTarget);
        if (!formData.get("year")) formData.delete("class");
        formData.set("page", "1");
        onSubmit(formData);
      }}
    >
      <Filter label="Estudiante">
        <input
          name="q"
          className={CONTROL_CLASS_NAME}
          placeholder="Buscar cédula o nombre"
          size="1"
          defaultValue={filters.q}
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
            <option key={year.id} value={year.id}>{year.name}</option>
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
            <option key={classId} value={classId}>{classId}</option>
          ))}
        </select>
      </Filter>
      <Filter label="Estatus">
        <select
          name="status"
          className={CONTROL_CLASS_NAME}
          size="1"
          defaultValue={filters.status}
          onChange={() => {}}
        >
          <option value="">Todos los estatus</option>
          {statuses.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </Filter>
      <Filter label="Materia">
        <select
          name="expanded"
          className={CONTROL_CLASS_NAME}
          size="1"
          defaultValue={filters.expanded}
          onChange={() => {}}
        >
          <option value="">Todas las materias</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>{subject.name}</option>
          ))}
        </select>
      </Filter>
    </FilterForm>
  );
}
