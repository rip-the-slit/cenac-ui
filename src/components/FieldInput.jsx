import { TextInput } from "./Layout";

export default function FieldInput({ definition = {}, ...props }) {
  const {
    type = "text", required, placeholder, minLength, maxLength, pattern,
    min, max, step, options = [],
  } = definition;
  const attributes = { required, placeholder, minLength, maxLength, pattern, min, max, step };
  if (type === "select") {
    return (
      <select
        className="rounded-lg border border-gray-300 px-3 py-2 font-normal"
        {...attributes}
        {...props}
      >
        <option value="">{placeholder || "Seleccione una opción"}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    );
  }
  return <TextInput type={type} {...attributes} {...props} />;
}
