import { useId, useState } from "react";

export default function FieldInput({
  definition = {},
  validationMessages = definition.validationMessages || {},
  className = "",
  replaceClassName = false,
  errorClassName = "w-[20ch] p-1 text-sm text-red-600 bg-white border border-red-600 rounded-md shadow-md text-left",
  invalidClassName = "",
  validationKey,
  onBlur,
  onChange,
  onInvalid,
  ...props
}) {
  const errorId = useId();
  const [validation, setValidation] = useState(null);
  const error = validation?.key === validationKey ? validation?.message || "" : "";
  const {
    type = "text", required, placeholder, minLength, maxLength, pattern,
    min, max, step, options = [],
  } = definition;
  const attributes = { required, placeholder, minLength, maxLength, pattern, min, max, step };
  function validate(input) {
    const status = Object.keys(validationMessages).find((key) => input.validity[key]);
    setValidation({ key: validationKey, message: input.validity.valid ? "" : validationMessages[status] || input.validationMessage });
  }

  const inputProps = {
    ...attributes,
    ...props,
    "aria-label": props["aria-label"] || definition.label,
    className: `${replaceClassName ? "" : "rounded-lg border border-gray-300 px-3 py-2 font-normal"} ${className} ${error ? invalidClassName : ""}`.trim(),
    "aria-invalid": error ? true : undefined,
    "aria-describedby": [props["aria-describedby"], error ? errorId : ""].filter(Boolean).join(" ") || undefined,
    "aria-errormessage": error ? errorId : undefined,
    onBlur(event) {
      validate(event.currentTarget);
      onBlur?.(event);
    },
    onChange(event) {
      if (error) validate(event.currentTarget);
      onChange?.(event);
    },
    onInvalid(event) {
      event.preventDefault();
      validate(event.currentTarget);
      onInvalid?.(event);
    },
  };

  return (
    <>
      {type === "select" ? <select {...inputProps}>
        <option value="">{placeholder || "Seleccione una opción"}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select> : <input type={type} {...inputProps} spellCheck={false} />}
      {error && <div id={errorId} role="alert" className={"absolute -right-2 bottom-0 translate-y-2/4 " + errorClassName}>{error}</div>}
    </>
  );
}
