import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const arrowStyle = "flex w-full justify-center py-1 text-gray-600 enabled:hover:bg-gray-100 disabled:opacity-30";

export default function SelectorBatches({ items, size, children }) {
  const [batch, setBatch] = useState(0);
  const last = Math.max(0, Math.ceil(items.length / size) - 1);
  const current = Math.min(batch, last);
  return (
    <>
      {last > 0 && (
        <button type="button" className={arrowStyle} aria-label="Ver anteriores"
          disabled={current === 0} onClick={() => setBatch(current - 1)}>
          <ChevronUp aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
      {children(items.slice(current * size, (current + 1) * size))}
      {last > 0 && (
        <button type="button" className={arrowStyle} aria-label="Ver siguientes"
          disabled={current === last} onClick={() => setBatch(current + 1)}>
          <ChevronDown aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
    </>
  );
}
