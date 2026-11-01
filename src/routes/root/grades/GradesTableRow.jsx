import { BodyCell, BodyRow } from "../load/TablePrimitives";
import { formatClassName } from "../classDisplay";
import { calculateAverage } from "./gradesUtils.jsx";
import Grade from "./Grade";
import StatusIcon from "../../../components/StatusIcon";

function GradeCell({ grade, inputName, isEditing }) {
  return (
    <BodyCell
      className={
        "text-center " +
        (0 < grade && grade < 10
          ? "text-red-600"
          : 18 < grade
          ? "text-emerald-600"
          : "")
      }
    >
      {isEditing ? (
        <input
          type="number"
          min="0"
          max="20"
          step="0.1"
          name={inputName}
          className="w-[6ch] bg-transparent text-center"
          defaultValue={grade ?? "0"}
          required
        />
      ) : (
        <Grade value={grade} />
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
  selectable = true,
  termCount,
  gradeSlotsPerTerm,
  onSelect,
  showPeriod,
}) {
  const visibleSubjects = expandedSubject ? [expandedSubject] : subjects;
  const yearName =
    years.find((year) => String(year.id) === String(row.yearId))?.name || "";
  const statusName =
    statuses.find((status) => String(status.value) === String(row.status))
      ?.name || "";

  return (
    <BodyRow>
      {selectable && (
        <BodyCell className="text-center sticky">
          <input
            type="checkbox"
            aria-label={`Seleccionar ${row.fullName}`}
            checked={selected}
            onChange={onSelect}
          />
        </BodyCell>
      )}
      <BodyCell className="sticky">{row.id}</BodyCell>
      <BodyCell>{row.fullName}</BodyCell>
      <BodyCell>
        {`${yearName} ${formatClassName(row.className)}`.trim()}
      </BodyCell>
      {showPeriod && <BodyCell>{row.period ?? "—"}</BodyCell>}
      <BodyCell className="border border-r-gray-400/70">
        <StatusIcon status={row.status} title={statusName} />
      </BodyCell>
      {visibleSubjects?.length > 0 ? (
        visibleSubjects.map((subject) => {
          const subjectId = String(subject.id);
          if (!expandedSubject) {
            return (
              <GradeCell
                key={`${row.id}-${subjectId}`}
                grade={row.subjectAverages?.[subjectId]}
              />
            );
          }

          const subjectDetails = row.subjectDetails?.[subjectId];
          const terms = subjectDetails?.terms || [];
          const gradeCells = [];
          for (let termIndex = 0; termIndex < termCount; termIndex += 1) {
            const strategyCount = row.floating ? 1 : gradeSlotsPerTerm;
            for (
              let gradeIndex = 0;
              gradeIndex < strategyCount;
              gradeIndex += 1
            ) {
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
                  >
                    <Grade value={null} />
                  </BodyCell>
                );
              }
            }
            gradeCells.push(
              <BodyCell
                key={`${row.id}-${subjectId}-${termIndex}-average`}
                className="text-center font-semibold border border-r-gray-400/70"
              >
                <Grade value={subjectDetails?.termAverages?.[termIndex]} className="w-16" />
              </BodyCell>
            );
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
        })
      ) : (
        <BodyCell className="text-center">
          <Grade value={null} />
        </BodyCell>
      )}
      <BodyCell className="text-center font-bold">
        <Grade
          value={
            expandedSubject
              ? row.subjectAverages?.[String(expandedSubject.id)]
              : calculateAverage(Object.values(row.subjectAverages || {}))
          }
        />
      </BodyCell>
    </BodyRow>
  );
}
