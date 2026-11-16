import Filter from "../components/Filter";
import { GUARDIAN_FIELDS } from "./guardiansUtils";

const CONTROL_CLASS_NAME =
  "w-full overflow-hidden rounded-lg border border-gray-300 px-3 py-2 font-normal text-gray-900";

export default function GuardiansFilters({
  FormComponent,
  filters,
  fields,
  onSubmit,
}) {
  const FilterForm = FormComponent;
  return (
    <FilterForm
      method="get"
      className="grid gap-3 md:grid-cols-4 max-w-[45rem]"
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
        <Filter key={field} label={fields[field]?.label || field}>
          {field === "legalRole" ? (
            <select name={field} className={CONTROL_CLASS_NAME} defaultValue={filters[field] || ""}>
              <option value="">Todos los roles legales</option>
              {(fields[field]?.options || []).map((option) => (
                <option key={option.value} value={option.value}>{option.label || option.name}</option>
              ))}
            </select>
          ) : <input
            type={field === "birthDate" ? "date" : "text"}
            name={field}
            className={CONTROL_CLASS_NAME}
            placeholder={fields[field]?.label || field}
            size="1"
            defaultValue={filters[field]}
            onChange={() => {}}
          />}
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
