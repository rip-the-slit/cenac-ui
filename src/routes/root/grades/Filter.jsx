export default function Filter({ label, children }) {
  return (
    <label className="grid gap-1 text-sm font-medium text-gray-700">
      <span>{label}</span>
      {children}
    </label>
  );
}
