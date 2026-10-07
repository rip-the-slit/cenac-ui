import { useRef, useState } from "react";

import Suggestions from "./Suggestions";
import {
  normalizeId,
  sanitizeIdNumber,
  splitId,
} from "./classLoaderUtils";

export { normalizeId } from "./classLoaderUtils";

export default function IdInput({
  value = "",
  disabled = false,
  label = "Documento",
  onChange,
  onSuggestionSelect,
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
      <input
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
        pattern="[1-9][0-9]{0,7}"
        required
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
