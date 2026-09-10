import { createElement, forwardRef } from "react";

const BASE_CLASS_NAME =
  "bg-white border border-gray-200 rounded-lg shadow-xl absolute z-10";

const FloatingOverlay = forwardRef(function FloatingOverlay(
  { as = "div", className = "", ...props },
  ref
) {
  return createElement(as, {
    ...props,
    ref,
    className: `${BASE_CLASS_NAME} ${className}`,
  });
});

export default FloatingOverlay;
