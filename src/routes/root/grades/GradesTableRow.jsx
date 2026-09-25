import { BodyCell, BodyRow } from "../load/TablePrimitives";
import { formatClassName } from "../classDisplay";
import { calculateAverage, formatGrade } from "./gradesUtils.jsx";

function GradeCell({ grade, inputName, isEditing }) {
  return (
    <BodyCell className="text-center">
      {isEditing ? (
        <input
          type="number"
          min="0"
          max="20"
          step="0.1"
          name={inputName}
          className="w-[6ch] bg-transparent text-center"
          defaultValue={grade ?? "0"}
        />
      ) : (
        formatGrade(grade)
      )}
    </BodyCell>
  );
}

export default function GradesTableRow({
  row,
  subjects,
  statuses,
  years,
  expandedSubject,
  isEditing,
  selected,
  termCount,
  gradeSlotsPerTerm,
  onSelect,
  showPeriod,
}) {
  const visibleSubjects = expandedSubject ? [expandedSubject] : subjects;
  const yearName =
    years.find(
      (year) => String(year.id) === String(row.yearId)
    )?.name || "";
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
      <BodyCell>{`${yearName} ${formatClassName(row.className)}`}</BodyCell>
      {showPeriod && <BodyCell>{row.period ?? "—"}</BodyCell>}
      <BodyCell>{statusName}</BodyCell>
      {visibleSubjects?.length > 0 ? visibleSubjects.map((subject) => {
        const subjectId = String(subject.id);
        if (!expandedSubject) {
          return (
            <BodyCell key={`${row.id}-${subjectId}`} className="text-center">
              {formatGrade(row.subjectAverages[subjectId])}
            </BodyCell>
          );
        }

        const terms = row.subjectDetails?.[subjectId]?.terms || [];
        const gradeCells = [];
        for (let termIndex = 0; termIndex < termCount; termIndex += 1) {
          const strategyCount = row.floating ? 1 : gradeSlotsPerTerm;
          for (let gradeIndex = 0; gradeIndex < strategyCount; gradeIndex += 1) {
            const cellKey = `${row.id}-${subjectId}-${termIndex}-${gradeIndex}`;
            gradeCells.push(
              <GradeCell
                key={cellKey}
                grade={terms?.[termIndex]?.[gradeIndex] ?? null}
                isEditing={isEditing}
                inputName={`grade::${row.yearId}::${row.id}::${subjectId}::${termIndex}::${gradeIndex}`}
              />
            );
          }
          if (row.floating) {
            for (let index = 1; index < gradeSlotsPerTerm; index += 1) {
              gradeCells.push(
                <BodyCell
                  key={`${row.id}-${subjectId}-${termIndex}-padding-${index}`}
                  aria-label="Sin estrategia"
                  className="text-center"
                >{formatGrade(null)}</BodyCell>
              );
            }
          }
        }

        const revisionKey = `${row.id}-${subjectId}-${termCount}-0`;
        gradeCells.push(
          <GradeCell
            key={revisionKey}
            grade={terms?.[termCount]?.[0] ?? null}
            isEditing={isEditing}
            inputName={`grade::${row.yearId}::${row.id}::${subjectId}::${termCount}::0`}
          />
        );
        return gradeCells;
      }) : (
        <BodyCell className="text-center">{formatGrade(null)}</BodyCell>
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
