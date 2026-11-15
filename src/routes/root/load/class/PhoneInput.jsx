import FieldInput from "../../../../components/FieldInput";

const PREFIX_GROUPS = [
  { label: "Telefonía móvil", options: [
    ["0412", "Digitel"], ["0422", "Digitel"],
    ["0414", "Movistar"], ["0424", "Movistar"],
    ["0416", "Movilnet"], ["0426", "Movilnet"],
  ] },
  { label: "Telefonía fija", options: [
    ["0212", "Distrito Capital, Miranda y La Guaira"],
    ...["0235", "0238", "0246", "0247"].map((prefix) => [prefix, "Guárico"]),
    ...["0241", "0242", "0245", "0249"].map((prefix) => [prefix, "Carabobo"]),
    ...["0243", "0244"].map((prefix) => [prefix, "Aragua"]),
    ...["0251", "0252", "0253"].map((prefix) => [prefix, "Lara"]),
    ["0261", "Zulia"],
    ...["0274", "0275"].map((prefix) => [prefix, "Mérida"]),
    ["0276", "Táchira"],
    ...["0281", "0282", "0283"].map((prefix) => [prefix, "Anzoátegui"]),
    ...["0285", "0286", "0288"].map((prefix) => [prefix, "Bolívar"]),
    ["0295", "Nueva Esparta"],
  ] },
  { label: "Telefonía satelital", options: [["0415", "Globalstar / Tesan"]] },
];

export default function PhoneInput({ definition = {}, value = "", disabled = false, validationKey, onChange }) {
  const prefix = value.slice(0, 4) || "0412";
  const number = value.slice(4);
  const label = definition.label || "Teléfono";
  const knownPrefix = PREFIX_GROUPS.some((group) => group.options.some(([code]) => code === prefix));

  function changeNumber(event) {
    const digits = event.target.value.replace(/\D/g, "").slice(0, 7);
    onChange?.(`${prefix}${digits}`);
  }

  return (
    <div className="rounded-lg border border-gray-300 px-2 py-2">
      <div className="flex items-start gap-2">
        <select
          aria-label={`${label}: prefijo`}
          className="w-[6ch] shrink-0 border-0 bg-transparent px-1 outline-none disabled:text-gray-400"
          value={prefix}
          disabled={disabled}
          onChange={(event) => onChange?.(`${event.target.value}${number}`)}
        >
          {!knownPrefix && <option value={prefix}>{prefix}</option>}
          {PREFIX_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map(([code, name]) => <option key={code} value={code}>{code} — {name}</option>)}
            </optgroup>
          ))}
        </select>
        <div className="min-w-0 flex-1">
          <FieldInput
            validationKey={validationKey}
            definition={{ ...definition, type: "tel", pattern: definition.pattern || "[0-9]{7}" }}
            replaceClassName
            className="w-full border-0 bg-transparent px-1 outline-none disabled:text-gray-400"
            value={number}
            disabled={disabled}
            inputMode="numeric"
            onChange={changeNumber}
          />
        </div>
      </div>
    </div>
  );
}
