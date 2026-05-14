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

export function BodyCell({ children, className = "", ...props }) {
  return (
    <td className={`p-2 bg-white border whitespace-nowrap ${className}`} {...props}>
      {children}
    </td>
  );
}
