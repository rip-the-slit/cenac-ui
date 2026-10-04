import { formatGrade } from "./gradesUtils.jsx";

export default function Grade({ value, className = "" }) {
  const grade = formatGrade(value)
  return (
    <span className={`${grade !== formatGrade(null) ? "" : "text-gray-500"} ${className}`.trim()}>
      {grade}
    </span>
  );
}
