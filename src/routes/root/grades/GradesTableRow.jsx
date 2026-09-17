import { BodyCell, BodyRow } from "../load/TablePrimitives";
import { calculateAverage, formatGrade } from "./gradesUtils";

export default function GradesTableRow({
  row,
  subjects,
  statuses,
  expandedSubject,
  isEditing,
  selected,
  termCount,
  gradeSlotsPerTerm,
  onSelect,
  showPeriod,
}) {
  const visibleSubjects = expandedSubject ? [expandedSubject] : subjects;
  const statusName = statuses.find(
    (status) => String(status.value) === String(row.status)
  )?.name || "";

  return (
    <BodyRow>
      <BodyCell className="text-center">
        <input
          type="checkbox"
          aria-label={`Seleccionar ${row.fullName}`}
          checked={selected}
          onChange={onSelect}
        />
      </BodyCell>
      <BodyCell>{row.id}</BodyCell>
      <BodyCell>{row.fullName}</BodyCell>
      <BodyCell>{row.class}</BodyCell>
      {showPeriod && <BodyCell>{row.period ?? "—"}</BodyCell>}
      <BodyCell>{statusName}</BodyCell>
      {visibleSubjects?.length > 0 ? visibleSubjects.map((subject) => {
        const subjectId = String(subject.id);
        if (!expandedSubject) {
          return (
            <BodyCell key={`${row.id}-${subjectId}`} className="text-center">
              {row.subjectAverages?.[subjectId]
                ? formatGrade(row.subjectAverages[subjectId])
                : "N/A"}
            </BodyCell>
          );
        }

        const terms = row.subjectDetails?.[subjectId]?.terms || [];
        return Array.from({ length: termCount }, (_, termIndex) =>
          Array.from({ length: gradeSlotsPerTerm }, (_, gradeIndex) => {
            const grade = terms?.[termIndex]?.[gradeIndex] ?? null;
            return (
              <BodyCell
                key={`${row.id}-${subjectId}-${termIndex}-${gradeIndex}`}
                className="text-center"
              >
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    name={`grade::${row.id}::${subjectId}::${termIndex}::${gradeIndex}`}
                    className="w-[6ch] text-center bg-transparent"
                    defaultValue={grade ?? ""}
                  />
                ) : (
                  formatGrade(grade)
                )}
              </BodyCell>
            );
          })
        );
      }) : (
        <BodyCell className="text-center">—</BodyCell>
      )}
      <BodyCell className="text-center">
        {formatGrade(
          expandedSubject
            ? row.subjectAverages?.[String(expandedSubject.id)]
            : calculateAverage(Object.values(row.subjectAverages || {}))
        )}
      </BodyCell>
    </BodyRow>
  );
}
