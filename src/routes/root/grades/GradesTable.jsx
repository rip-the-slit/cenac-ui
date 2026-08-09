import { ArrowLeft } from "lucide-react";
import {
  DataTable,
  HeadCell,
  TableBody,
  TableContainer,
  TableHead,
} from "../load/TablePrimitives";
import GradesTableRow from "./GradesTableRow";

const TERM_COUNT = 3;
const GRADE_SLOTS_PER_TERM = 4;

export default function GradesTable({
  rows,
  subjects,
  expandedSubject,
  isEditing,
  className,
  onExpandedChange,
}) {
  const visibleSubjects = expandedSubject ? [expandedSubject] : subjects;
  const rowSpan = expandedSubject ? 4 : 2;

  return (
    <TableContainer className={"relative " + className}>
      <DataTable className="text-sm">
        <TableHead className="bg-gray-100 shadow-md sticky top-0 z-10">
          <tr>
            <HeadCell rowSpan={rowSpan} className="sticky left-0 bg-gray-100">C.I.</HeadCell>
            <HeadCell rowSpan={rowSpan}>Nombre Completo</HeadCell>
            <HeadCell rowSpan={rowSpan}>Sección</HeadCell>
            <HeadCell rowSpan={rowSpan}>Estatus</HeadCell>
            {!expandedSubject && (
              <HeadCell className="text-center" colSpan={subjects.length}>
                Areas de Formación
              </HeadCell>
            )}
            {!expandedSubject && <HeadCell className="text-center" rowSpan={2}>Nota Final</HeadCell>}
          </tr>
          <tr>
            {visibleSubjects.map((subject) => (
              <HeadCell
                key={subject.id}
                className="text-center relative"
                colSpan={expandedSubject ? TERM_COUNT * GRADE_SLOTS_PER_TERM : 1}
                title={expandedSubject ? "Volver" : subject.name}
              >
                {expandedSubject ? (
                  <button
                    type="button"
                    className="absolute left-2"
                    onClick={() => onExpandedChange("")}
                    aria-label="Volver"
                  >
                    <ArrowLeft width={20} className="text-gray-500"/>
                  </button>
                ) : (
                  ""
                )}
                <button
                  type="button"
                  className="underline decoration-dotted"
                  onClick={() =>
                    onExpandedChange(expandedSubject ? "" : String(subject.id))
                  }
                >
                  {expandedSubject ? subject.name : subject.abbr || subject.name}
                </button>
              </HeadCell>
            ))}
            {expandedSubject && <HeadCell className="text-center" rowSpan={3}>Nota Final</HeadCell>}
          </tr>
          {expandedSubject && (
            <tr>
              {Array.from({ length: TERM_COUNT }, (_, termIndex) => (
                <HeadCell
                  key={`l${termIndex + 1}`}
                  className="text-center"
                  colSpan={GRADE_SLOTS_PER_TERM}
                >
                  {`L${termIndex + 1}`}
                </HeadCell>
              ))}
            </tr>
          )}
          {expandedSubject && (
            <tr>
              {Array.from({ length: TERM_COUNT }, (_, termIndex) =>
                Array.from({ length: GRADE_SLOTS_PER_TERM }, (_, gradeIndex) => (
                  <HeadCell
                    key={`l${termIndex + 1}-${gradeIndex + 1}`}
                    className="text-center"
                  >
                    {gradeIndex + 1}
                  </HeadCell>
                ))
              )}
            </tr>
          )}
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <GradesTableRow
              key={row.id}
              row={row}
              subjects={subjects}
              expandedSubject={expandedSubject}
              isEditing={isEditing}
              termCount={TERM_COUNT}
              gradeSlotsPerTerm={GRADE_SLOTS_PER_TERM}
            />
          ))}
        </TableBody>
      </DataTable>
    </TableContainer>
  );
}
