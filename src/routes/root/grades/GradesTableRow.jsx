import { BodyCell } from "../load/TablePrimitives";
import { calculateAverage, formatGrade } from "./gradesUtils";

export default function GradesTableRow({
  row,
  subjects,
  expandedSubject,
  isEditing,
  termCount,
  gradeSlotsPerTerm,
}) {
  const visibleSubjects = expandedSubject ? [expandedSubject] : subjects;

  return (
    <tr>
      <BodyCell>{row.id}</BodyCell>
      <BodyCell>{row.fullName}</BodyCell>
      <BodyCell>{row.class}</BodyCell>
      <BodyCell>{row.status}</BodyCell>
      {visibleSubjects.map((subject) => {
        const subjectId = String(subject.id);
        if (!expandedSubject) {
          return (
            <BodyCell key={`${row.id}-${subjectId}`} className="text-center">
              {formatGrade(row.subjectAverages?.[subjectId])}
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
                className="text-center p-0"
              >
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    name={`grade::${row.id}::${subjectId}::${termIndex}::${gradeIndex}`}
                    className="w-full p-2 text-center"
                    defaultValue={grade ?? ""}
                  />
                ) : (
                  formatGrade(grade)
                )}
              </BodyCell>
            );
          })
        );
      })}
      <BodyCell className="text-center">
        {formatGrade(
          expandedSubject
            ? row.subjectAverages?.[String(expandedSubject.id)]
            : calculateAverage(Object.values(row.subjectAverages || {}))
        )}
      </BodyCell>
    </tr>
  );
}
