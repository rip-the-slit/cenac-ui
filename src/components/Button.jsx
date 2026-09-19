import { forwardRef } from "react";

const baseClassName = "flex items-center gap-2 p-3 shadow-sm rounded-lg border "

const normalClassName =
  " border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50";

const primaryClassName =
  " border-emerald-500 bg-gradient-to-b from-emerald-500 to-emerald-600 font-bold text-white shadow-sm transition-colors hover:from-emerald-600 hover:to-emerald-700 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-300";

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
