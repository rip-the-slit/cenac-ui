export default function Filter({ label, children, group = false, htmlFor }) {
  if (group) {
    return (
      <fieldset className="grid gap-1 text-sm font-medium text-gray-700">
        <legend>{label}</legend>
        {children}
      </fieldset>
    );
  }

  return (
    <label
      htmlFor={htmlFor}
      className="grid gap-1 text-sm font-medium text-gray-700"
    >
      <span>{label}</span>
      {children}
    </label>
  );
}
