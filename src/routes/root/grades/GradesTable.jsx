import { ArrowLeft, ArrowRight, X } from "lucide-react";
import {
  DataTable,
  EmptyTableMessage,
  HeadCell,
  TableBody,
  TableContainer,
  TableHead,
} from "../load/TablePrimitives";
import GradesTableRow from "./GradesTableRow";

const TERM_COUNT = 3;
const GRADE_SLOTS_PER_TERM = 5;

export default function GradesTable({
  rows,
  subjects,
  years,
  fields,
  statuses,
  expandedIndex = null,
  isEditing,
  selectable = true,
  selectedIds = {},
  className,
  onExpandedChange,
  onSelectAll,
  onSelectRow,
  showPeriod,
}) {
  const expandedSubject =
    expandedIndex === null ? null : subjects[expandedIndex];
  const visibleSubjects = expandedSubject ? [expandedSubject] : subjects;
  const rowSpan = expandedSubject ? 4 : 2;
  const fixedColumnCount =
    4 + Number(Boolean(selectable)) + Number(Boolean(showPeriod)) + 1;
  const gradeColumnCount = expandedSubject
    ? TERM_COUNT * (GRADE_SLOTS_PER_TERM + 1) + 1
    : Math.max(subjects.length, 1);
  const emptyColSpan = fixedColumnCount + gradeColumnCount;
  const allSelected =
    selectedIds.all &&
    !Object.values(selectedIds).some((selected) => selected === false);

  return (
    <TableContainer className={className}>
      <DataTable>
        <TableHead>
          <tr>
            {selectable && (
              <HeadCell rowSpan={rowSpan} className="text-center sticky">
                <input
                  type="checkbox"
                  aria-label="Seleccionar todos"
                  checked={allSelected}
                  onChange={(event) => onSelectAll(event.target.checked)}
                />
              </HeadCell>
            )}
            <HeadCell className="sticky" rowSpan={rowSpan}>{fields.id?.label}</HeadCell>
            <HeadCell className="sticky" rowSpan={rowSpan}>{fields.fullName?.label}</HeadCell>
            <HeadCell rowSpan={rowSpan}>{fields.class?.label}</HeadCell>
            {showPeriod && (
              <HeadCell rowSpan={rowSpan}>{fields.period?.label}</HeadCell>
            )}
            <HeadCell rowSpan={rowSpan}>{fields.status?.label}</HeadCell>
            {!expandedSubject && (
              <HeadCell
                className="text-center"
                colSpan={Math.max(subjects.length, 1)}
              >
                Areas de Formación
              </HeadCell>
            )}
            {!expandedSubject && (
              <HeadCell className="text-center" rowSpan={2}>
                Nota Final
              </HeadCell>
            )}
          </tr>
          <tr>
            {visibleSubjects.length === 0 && (
              <HeadCell aria-label="Sin materias" />
            )}
            {visibleSubjects.map((subject, i) => (
              <HeadCell
                key={subject.id}
                className="text-center relative"
                colSpan={
                  expandedSubject
                    ? TERM_COUNT * (GRADE_SLOTS_PER_TERM + 1) + 1
                    : 1
                }
                title={expandedSubject ? "Materia expandida" : subject.name}
              >
                {expandedSubject ? (
                  <>
                    <button
                      type="button"
                      className="mr-5 disabled:opacity-30"
                      disabled={expandedIndex === 0}
                      onClick={() => onExpandedChange(expandedIndex - 1)}
                      aria-label="Materia anterior"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <button
                      className="mr-1"
                      type="button"
                      onClick={() => onExpandedChange("")}
                      aria-label="Volver"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  ""
                )}
                <button
                  type="button"
                  className="underline decoration-dotted"
                  onClick={() => onExpandedChange(expandedSubject ? "" : i)}
                >
                  {expandedSubject
                    ? subject.name
                    : subject.abbr || subject.name}
                </button>
                {expandedSubject ? (
                  <button
                    type="button"
                    className="ml-5 disabled:opacity-30"
                    disabled={expandedIndex === subjects.length - 1}
                    onClick={() => onExpandedChange(expandedIndex + 1)}
                    aria-label="Materia siguiente"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  ""
                )}
              </HeadCell>
            ))}
            {expandedSubject && (
              <HeadCell className="text-center" rowSpan={3}>
                Nota Final
              </HeadCell>
            )}
          </tr>
          {expandedSubject && (
            <tr>
              {Array.from({ length: TERM_COUNT }, (_, termIndex) => (
                <>
                  <HeadCell
                    key={`l${termIndex + 1}`}
                    className="text-center"
                    colSpan={GRADE_SLOTS_PER_TERM}
                  >
                    L{termIndex + 1}
                  </HeadCell>
                  <HeadCell
                    key={`l${termIndex + 1}-average`}
                    className="text-center"
                    rowSpan={2}
                  >
                    Promedio
                  </HeadCell>
                </>
              ))}
              <HeadCell className="text-center" rowSpan={2}>
                Revisión
              </HeadCell>
            </tr>
          )}
          {expandedSubject && (
            <tr>
              {Array.from({ length: TERM_COUNT }, (_, termIndex) => [
                ...Array.from(
                  { length: GRADE_SLOTS_PER_TERM },
                  (_, gradeIndex) => (
                    <HeadCell
                      key={`l${termIndex + 1}-${gradeIndex + 1}`}
                      className="text-center"
                    >
                      E{gradeIndex + 1}
                    </HeadCell>
                  )
                ),
              ])}
            </tr>
          )}
        </TableHead>
        <TableBody>
          {rows.length === 0 && <EmptyTableMessage colSpan={emptyColSpan} />}
          {rows.map((row) => (
            <GradesTableRow
              key={`${row.id}-${row.period}-${row.yearId}-${row.className}`}
              row={row}
              selectable={selectable}
              statuses={statuses}
              subjects={subjects}
              years={years}
              expandedSubject={expandedSubject}
              isEditing={
                isEditing &&
                Boolean(
                  expandedSubject &&
                    row.subjectDetails?.[String(expandedSubject.id)]
                )
              }
              selected={
                selectedIds.all
                  ? selectedIds[row.id] !== false
                  : selectedIds[row.id] === true
              }
              termCount={TERM_COUNT}
              gradeSlotsPerTerm={GRADE_SLOTS_PER_TERM}
              onSelect={() => onSelectRow(row.id)}
              showPeriod={showPeriod}
            />
          ))}
        </TableBody>
      </DataTable>
    </TableContainer>
  );
}
