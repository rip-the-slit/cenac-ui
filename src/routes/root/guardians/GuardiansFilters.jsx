import Filter from "../components/Filter";
import { GUARDIAN_FIELDS } from "./guardiansUtils";

const CONTROL_CLASS_NAME =
  "w-full overflow-hidden rounded-lg border border-gray-300 px-3 py-2 font-normal text-gray-900";

export default function GuardiansFilters({
  FormComponent,
  filters,
  guardianFieldLabels,
  onSubmit,
}) {
  const FilterForm = FormComponent;
  return (
    <FilterForm
      method="get"
      className="grid max-w-[60rem] gap-3 md:grid-cols-4"
      onChange={(event) => {
        const formData = new FormData(event.currentTarget);
        for (const [name, value] of [...formData.entries()]) {
          if (!value) formData.delete(name);
        }
        formData.set("page", "1");
        onSubmit(formData);
      }}
    >
      {GUARDIAN_FIELDS.map((field) => (
        <Filter key={field} label={guardianFieldLabels[field] || field}>
          <input
            name={field}
            className={CONTROL_CLASS_NAME}
            placeholder={guardianFieldLabels[field] || field}
            size="1"
            defaultValue={filters[field]}
            onChange={() => {}}
          />
        </Filter>
      ))}
      <Filter label="Estudiante representado">
        <input
          name="studentQ"
          className={CONTROL_CLASS_NAME}
          placeholder="Buscar cédula o nombre"
          size="1"
          defaultValue={filters.studentQ}
          onChange={() => {}}
        />
      </Filter>
    </FilterForm>
  );
}
