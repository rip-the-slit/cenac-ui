import { useRef } from "react";

function sanitizeNumber(value) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .replace(/^0+/, "")
    .slice(0, 8);
}

function splitId(value) {
  const normalized = String(value ?? "").trim();
  const match = normalized.match(/^([VE])-(.*)$/i);

  return {
    prefix: match ? `${match[1].toUpperCase()}-` : "V-",
    number: sanitizeNumber(match ? match[2] : normalized),
  };
}

export function normalizeId(value) {
  const { prefix, number } = splitId(value);
  return `${prefix}${number}`;
}

export default function IdInput({
  defaultValue,
  disabled = false,
  label = "Documento",
  onValueChange,
}) {
  const initialValue = splitId(defaultValue);
  const prefixRef = useRef(initialValue.prefix);
  const numberRef = useRef(initialValue.number);

  const emitValue = () => {
    onValueChange?.(`${prefixRef.current}${numberRef.current}`);
  };

  return (
    <div className="flex w-full bg-transparent">
      <select
        aria-label={`${label}: tipo`}
        className="shrink-0 bg-transparent border-0 px-1 text-gray-700 outline-none disabled:text-gray-400"
        defaultValue={initialValue.prefix}
        disabled={disabled}
        onChange={(event) => {
          prefixRef.current = event.target.value;
          emitValue();
        }}
      >
        <option value="V-">V-</option>
        <option value="E-">E-</option>
      </select>
      <input
        type="text"
        aria-label={label}
        className="min-w-0 w-full border-0 bg-transparent px-1 outline-none disabled:text-gray-400"
        defaultValue={initialValue.number}
        disabled={disabled}
        inputMode="numeric"
        maxLength={8}
        pattern="[1-9][0-9]{0,7}"
        required
        onChange={(event) => {
          const number = sanitizeNumber(event.target.value);
          if (number !== event.target.value) {
            event.target.value = number;
          }
          numberRef.current = number;
          emitValue();
        }}
      />
    </div>
  );
}
