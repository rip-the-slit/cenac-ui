export function TableContainer({ children, className = "" }) {
  return (
    <div className={`overflow-x-auto relative border-gray-200 ${className}`}>
      {children}
    </div>
  );
}

export function DataTable({ children, className = "" }) {
  return <table className={`w-full table-auto border-collapse rounded-lg ${className}`}>{children}</table>;
}

export function TableHead({ children, className = "" }) {
  return <thead className={`text-left ${className}`}>{children}</thead>;
}

export function TableBody({ children, className = "" }) {
  return <tbody className={className}>{children}</tbody>;
}

export function HeadCell({ children, className = "", ...props }) {
  return (
    <th className={`p-2 font-semibold border ${className}`} {...props}>
      {children}
    </th>
  );
}

export function BodyCell({ children, className = "", noPadding, ...props }) {
  return (
    <td className={`${noPadding ? "" : "p-2"} border whitespace-nowrap [&:has(input[type="number"]:focus)]:outline [&:has(input[type="text"]:focus)]:outline -outline-offset-2 outline-emerald-400 ${className}`} {...props}>
      {children}
    </td>
  );
}
