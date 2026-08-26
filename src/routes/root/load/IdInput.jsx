import { useRef } from "react";

import { useStudentSuggestions } from "./StudentSuggestions";

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
  onStudentSelect,
  onValueChange,
}) {
  const suggestions = useStudentSuggestions();
  const initialValue = splitId(defaultValue);
  const containerRef = useRef(null);
  const prefixInputRef = useRef(null);
  const numberInputRef = useRef(null);
  const prefixRef = useRef(initialValue.prefix);
  const numberRef = useRef(initialValue.number);

  const currentValue = () => `${prefixRef.current}${numberRef.current}`;
  const applyValue = (value) => {
    const nextValue = splitId(value);
    prefixRef.current = nextValue.prefix;
    numberRef.current = nextValue.number;
    if (prefixInputRef.current) {
      prefixInputRef.current.value = nextValue.prefix;
      prefixInputRef.current.disabled = true
    }
    if (numberInputRef.current) {
      numberInputRef.current.value = nextValue.number;
      numberInputRef.current.disabled = true
      numberInputRef.current.title = "No es posible modificar estudiante preexistente."
    }
    return `${nextValue.prefix}${nextValue.number}`;
  };
  const selectStudent = (student) => {
    const value = applyValue(student.id);
    onValueChange?.(value);
    onStudentSelect?.(student);
  };
  const emitValue = () => {
    const value = currentValue();
    onValueChange?.(value);
    suggestions?.activate(containerRef.current, value, selectStudent);
  };
  const handleEscape = (event) => {
    if (event.key === "Escape") {
      suggestions?.close();
    }
  };

  return (
    <div ref={containerRef} className="flex w-full bg-transparent">
      <select
        ref={prefixInputRef}
        aria-label={`${label}: tipo`}
        className="shrink-0 bg-transparent border-0 px-1 text-gray-700 outline-none disabled:text-gray-400"
        defaultValue={initialValue.prefix}
        disabled={disabled}
        onKeyDown={handleEscape}
        onChange={(event) => {
          prefixRef.current = event.target.value;
          emitValue();
        }}
      >
        <option value="V-">V-</option>
        <option value="E-">E-</option>
      </select>
      <input
        ref={numberInputRef}
        type="text"
        aria-label={label}
        className="min-w-0 w-full border-0 bg-transparent px-1 outline-none disabled:text-gray-400"
        defaultValue={initialValue.number}
        disabled={disabled}
        title={disabled && "No es posible modificar estudiante preexistente."}
        inputMode="numeric"
        maxLength={8}
        pattern="[1-9][0-9]{0,7}"
        required
        onKeyDown={handleEscape}
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
