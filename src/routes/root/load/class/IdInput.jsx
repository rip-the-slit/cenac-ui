import { useRef, useState } from "react";

import Suggestions from "./Suggestions";
import FieldInput from "../../../../components/FieldInput";
import {
  normalizeId,
  sanitizeIdNumber,
  splitId,
} from "./classLoaderUtils";

export { normalizeId } from "./classLoaderUtils";

export default function IdInput({
  definition = {},
  value = "",
  disabled = false,
  required = true,
  label = "Documento",
  onChange,
  onSuggestionSelect,
  validationMessages = definition.validationMessages,
  validationKey,
  suggestionsEndpoint = "/periodo/all/estudiantes",
  suggestionsLabel = "Sugerencias de estudiantes",
}) {
  const containerRef = useRef(null);
  const [suggestionsEnabled, setSuggestionsEnabled] = useState(false);
  const { prefix, number } = splitId(value);

  function emitValue(nextPrefix, nextNumber) {
    setSuggestionsEnabled(true);
    onChange?.(`${nextPrefix}${nextNumber}`);
  }

  return (
    <div ref={containerRef} className="flex w-full bg-transparent">
      <select
        aria-label={`${label}: tipo`}
        className="shrink-0 border-0 bg-transparent px-1 text-gray-700 outline-none disabled:text-gray-400"
        value={prefix}
        disabled={disabled}
        onChange={(event) => emitValue(event.target.value, number)}
      >
        <option value="V-">V-</option>
        <option value="E-">E-</option>
      </select>
      <FieldInput
        replaceClassName
        validationMessages={validationMessages}
        validationKey={validationKey}
        placeholder={definition.placeholder}
        type="text"
        aria-label={label}
        className="min-w-0 w-full border-0 bg-transparent px-1 outline-none disabled:text-gray-400"
        value={number}
        disabled={disabled}
        title={
          disabled
            ? "No es posible modificar un registro preexistente."
            : undefined
        }
        inputMode="numeric"
        maxLength={8}
        pattern={definition.pattern?.[prefix === "V-" ? "v" : "e"]}
        required={required}
        onChange={(event) =>
          emitValue(prefix, sanitizeIdNumber(event.target.value))
        }
      />
      {!disabled && suggestionsEnabled && onSuggestionSelect && (
        <Suggestions
          anchorRef={containerRef}
          endpoint={suggestionsEndpoint}
          label={suggestionsLabel}
          query={normalizeId(value)}
          onSelect={onSuggestionSelect}
        />
      )}
    </div>
  );
}
