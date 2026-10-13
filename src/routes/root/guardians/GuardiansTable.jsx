import {
  DataTable,
  HeadCell,
  TableBody,
  TableContainer,
  TableHead,
} from "../load/TablePrimitives";
import { GUARDIAN_FIELDS } from "./guardiansUtils";
import GuardiansTableRow from "./GuardiansTableRow";

export default function GuardiansTable({
  rows,
  fields,
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
            {GUARDIAN_FIELDS.map((field) => (
              <HeadCell key={field}>{fields[field]?.label || field}</HeadCell>
            ))}
            <HeadCell>Estudiantes representados</HeadCell>
          </tr>
        </TableHead>
        <TableBody>
          {rows.map((guardian) => (
            <GuardiansTableRow
              key={guardian.id}
              guardian={guardian}
              fields={fields}
              selected={
                selectedIds.all
                  ? selectedIds[guardian.id] !== false
                  : selectedIds[guardian.id] === true
              }
              onSelect={() => onSelectRow(guardian.id)}
            />
          ))}
        </TableBody>
      </DataTable>
    </TableContainer>
  );
}
