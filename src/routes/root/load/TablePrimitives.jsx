export function TableContainer({ children, className = "" }) {
  return (
    <div className={`overflow-x-auto relative border-gray-200 outline outline-gray-200 -outline-offset-1 rounded-lg ${className}`}>
      {children}
    </div>
  );
}

export function DataTable({ children, className = "" }) {
  return <table className={`w-full table-auto border-collapse rounded-lg text-sm ${className}`}>{children}</table>;
}

export function TableHead({ children, className = "" }) {
  return <thead className={`sticky top-0 z-10 bg-gray-100 text-left shadow-md ${className}`}>{children}</thead>;
}

export function TableBody({ children, className = "" }) {
  return <tbody className={className}>{children}</tbody>;
}

export function HeadCell({ children, className = "", ...props }) {
  return (
    <th className={`border bg-gray-100 p-2 font-semibold ${className}`} {...props}>
      {children}
    </th>
  );
}

export function BodyRow({ children, className = "", ...props }) {
  return (
    <tr
      className={`odd:bg-white even:bg-gray-50 hover:bg-gray-100 ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

export function BodyCell({ children, className = "", noPadding, ...props }) {
  return (
    <td className={`${noPadding ? "" : "p-2"} border whitespace-nowrap [&:has(input[type="number"]:focus)]:outline [&:has(input[type="text"]:focus)]:outline -outline-offset-2 outline-emerald-400 ${className}`} {...props}>
      {children}
    </td>
  );
}
