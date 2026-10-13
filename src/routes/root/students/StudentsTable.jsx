import {
  DataTable,
  HeadCell,
  TableBody,
  TableContainer,
  TableHead,
} from "../load/TablePrimitives";
import StudentsTableRow from "./StudentsTableRow";

export default function StudentsTable({
  rows,
  years,
  fields,
  statuses,
  selectedIds,
  className,
  onSelectAll,
  onSelectRow,
}) {
  const allSelected =
    selectedIds.all &&
    !Object.values(selectedIds).some((selected) => selected === false);

  return (
    <TableContainer className={className}>
      <DataTable>
        <TableHead>
          <tr>
            <HeadCell className="text-center">
              <input
                type="checkbox"
                aria-label="Seleccionar todos"
                checked={allSelected}
                onChange={(event) => onSelectAll(event.target.checked)}
              />
            </HeadCell>
            <HeadCell>{fields.id?.label}</HeadCell>
            <HeadCell>{fields.firstName?.label}</HeadCell>
            <HeadCell>{fields.lastName?.label}</HeadCell>
            <HeadCell>{fields.birthDate?.label}</HeadCell>
            <HeadCell>{fields.birthPlace?.label}</HeadCell>
            <HeadCell>{fields.class?.label}</HeadCell>
            <HeadCell>{fields.status?.label}</HeadCell>
            <HeadCell>{fields.guardians?.label || "Representantes"}</HeadCell>
          </tr>
        </TableHead>
        <TableBody>
          {rows.map((student) => (
            <StudentsTableRow
              key={student.id}
              student={student}
              fields={fields}
              years={years}
              selected={
                selectedIds.all
                  ? selectedIds[student.id] !== false
                  : selectedIds[student.id] === true
              }
              onSelect={() => onSelectRow(student.id)}
              statuses={statuses}
            />
          ))}
        </TableBody>
      </DataTable>
    </TableContainer>
  );
}
