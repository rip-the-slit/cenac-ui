import { ArrowLeft } from "lucide-react";
import { createElement } from "react";
import { Link } from "react-router";

export function PageLayout({
  title,
  children,
  className = "",
  headingClassName = "",
}) {
  return (
    <div
      className={`mx-auto flex h-full w-full max-w-7xl flex-col gap-4 ${className}`}
    >
      <h1 className={`text-3xl font-bold text-gray-900 ${headingClassName}`}>
        {title}
      </h1>
      {children}
    </div>
  );
}

export function Card({ as = "section", children, className = "" }) {
  return createElement(
    as,
    {
      className: `rounded-lg border border-gray-200 bg-white p-6 shadow-sm ${className}`,
    },
    children
  );
}

export function CardHeader({
  title,
  backTo,
  onBack,
  backLabel = "Volver",
  actions,
  className = "",
}) {
  const backClassName = "rounded-md p-2 text-gray-500 hover:bg-gray-100";
  const backContent = <ArrowLeft aria-hidden="true" className="h-5 w-5" />;

  return (
    <header
      className={`mb-6 flex flex-wrap items-center justify-between gap-3 ${className}`}
    >
      <div className="flex items-center gap-3">
        {backTo ? (
          <Link to={backTo} aria-label={backLabel} className={backClassName}>
            {backContent}
          </Link>
        ) : onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label={backLabel}
            className={backClassName}
          >
            {backContent}
          </button>
        ) : null}
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      </div>
      {actions}
    </header>
  );
}

export function FormField({ label, children, className = "" }) {
  return (
    <label
      className={`flex flex-col gap-2 text-sm font-medium text-gray-700 ${className}`}
    >
      {label}
      {children}
    </label>
  );
}

export function TextInput({ className = "", ...props }) {
  return (
    <input
      className={`rounded-lg border border-gray-300 px-3 py-2 font-normal ${className}`}
      {...props}
    />
  );
}
