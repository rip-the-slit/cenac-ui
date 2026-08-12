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
  studentFieldLabels,
  selectedIds,
  className,
  onSelectAll,
  onSelectRow,
}) {
  const allSelected =
    selectedIds.all &&
    !Object.values(selectedIds).some((selected) => selected === false);

  return (
    <TableContainer className={"relative " + className}>
      <DataTable className="text-sm">
        <TableHead className="bg-gray-100 shadow-md sticky top-0 z-10">
          <tr>
            <HeadCell className="bg-gray-100 text-center">
              <input
                type="checkbox"
                aria-label="Seleccionar todos"
                checked={allSelected}
                onChange={(event) => onSelectAll(event.target.checked)}
              />
            </HeadCell>
            <HeadCell>{studentFieldLabels.id}</HeadCell>
            <HeadCell>{studentFieldLabels.firstName}</HeadCell>
            <HeadCell>{studentFieldLabels.lastName}</HeadCell>
            <HeadCell>{studentFieldLabels.birthDate}</HeadCell>
            <HeadCell>{studentFieldLabels.birthPlace}</HeadCell>
            <HeadCell>Sección</HeadCell>
          </tr>
        </TableHead>
        <TableBody>
          {rows.map((student) => (
            <StudentsTableRow
              key={student.id}
              student={student}
              years={years}
              selected={
                selectedIds.all
                  ? selectedIds[student.id] !== false
                  : selectedIds[student.id] === true
              }
              onSelect={() => onSelectRow(student.id)}
            />
          ))}
        </TableBody>
      </DataTable>
    </TableContainer>
  );
}
