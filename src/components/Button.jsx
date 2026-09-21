import { Pencil, Trash2 } from "lucide-react";
import { forwardRef } from "react";

const baseClassName =
  "flex items-center gap-2 p-3 shadow-sm rounded-lg border transition-all focus:ring-2 ring-offset-2 hover:shadow-md";

const normalClassName =
  " border-gray-300 bg-white font-semibold text-gray-700 hover:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ring-gray-300";

const primaryClassName =
  " border-emerald-500 bg-gradient-to-b from-emerald-500 to-emerald-600 font-bold text-white shadow-sm hover:brightness-105 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-300 ring-emerald-500";

function createButton(className) {
  return forwardRef(function Button(
    { className: extraClassName = "", type = "button", ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={`${className} ${extraClassName}`}
        {...props}
      />
    );
  });
}

export const Button = createButton(baseClassName + normalClassName);
export const PrimaryButton = createButton(baseClassName + primaryClassName);
export const DeleteButton = (props) => {
  return (
    <button
      type="button"
      className="rounded-md p-2 text-red-500 hover:bg-red-50"
      {...props}
    >
      <Trash2 aria-hidden="true" className="h-4 w-4" />
    </button>
  );
};
export const EditButton = (props) => {
  return (
    <button
      type="button"
      className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
      {...props}
    >
      <Pencil aria-hidden="true" className="h-4 w-4" />
    </button>
  );
};
