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
      className="grid gap-1 text-sm font-medium text-gray-600 [&>*]:border-solid [&>input]:border-[3px] [&>input]:border-emerald-200 [&>select]:border-[3px] [&>select]:border-emerald-200 [&>select]:bg-white/70"
    >
      <span>{label}</span>
      {children}
    </label>
  );
}
