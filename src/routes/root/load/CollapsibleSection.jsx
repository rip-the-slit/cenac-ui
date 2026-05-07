import { ChevronDown } from "lucide-react";
import { useState } from "react";

export default function CollapsibleSection({ open = false, title, children }) {
  const [isOpen, setIsOpen] = useState(open);

  return (
    <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="font-semibold text-gray-800">{title}</span>
        <span>
          <ChevronDown
            className={"w-5 h-5 text-gray-400 transition-transform " + (isOpen ? "rotate-180" : "")}
          />
        </span>
      </button>
      <div
        className={
          "overflow-hidden transition-[max-height,opacity] duration-200 " +
          (isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0 pointer-events-none")
        }
      >
        {children}
      </div>
    </div>
  );
}
