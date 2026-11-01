import { formatGrade } from "./gradesUtils.jsx";

export default function Grade({ value, className = "" }) {
  const grade = formatGrade(value)
  return (
    <div className={`${grade !== formatGrade(null) ? "" : "text-gray-500"} ${className}`.trim()}>
      {grade}
    </div>
  );
}
