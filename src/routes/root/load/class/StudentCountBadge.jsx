import { useEffect, useRef, useState } from "react";
import { User } from "lucide-react";

export default function StudentCountBadge({ classId, count }) {
  const previousCount = useRef(count);
  const [animationVersion, setAnimationVersion] = useState(0);

  useEffect(() => {
    if (previousCount.current !== count) {
      previousCount.current = count;
      setAnimationVersion((version) => version + 1);
    }
  }, [count]);

  const animationClass =
    animationVersion > 0 ? "animate-class-student-count" : "";

  return (
    <span
      key={animationVersion}
      aria-label={`${count} estudiantes en la sección ${classId}`}
      className={`inline-flex origin-left items-center gap-1 rounded-md bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800 ${animationClass}`}
    >
      <User aria-hidden="true" className="h-3.5 w-3.5" />
      <span aria-hidden="true">{count}</span>
    </span>
  );
}
