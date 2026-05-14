import { useMemo, useState } from "react";
import { redirect, useLoaderData, useSearchParams, useSubmit } from "react-router";
import { getGrades, getPeriodList, loadGrades } from "../../../db";
import {
  BodyCell,
  DataTable,
  HeadCell,
  TableBody,
  TableContainer,
  TableHead,
} from "../load/TablePrimitives";
import { Pencil, Save } from "lucide-react";

function safeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatGrade(value) {
  return Number.isFinite(value) ? value.toFixed(1) : "—";
}

function pickClasses(classesByYear, year) {
  if (year) {
    return classesByYear?.[Number(year)] || [];
  }
  const all = new Set();
  Object.values(classesByYear || {}).forEach((list) => (list || []).forEach((classId) => all.add(classId)));
  return [...all].sort();
}

function buildGradesPayload(rows, edits) {
  return rows.map((row) => {
    const subjects = {};
    for (const [subjectId, info] of Object.entries(row.subjectDetails || {})) {
      const baseLapsos = info?.lapsos || [];
      const subjectEdits = edits?.[row.id]?.[subjectId] || {};
      subjects[subjectId] = baseLapsos.map((lapso, lapsoIndex) =>
        (lapso || []).map((grade, gradeIndex) => {
          const edited = subjectEdits?.[lapsoIndex]?.[gradeIndex];
          const parsed = safeNumber(edited);
          return parsed === null ? grade : parsed;
        })
      );
    }
    return { id: row.id, subjects };
  });
}

export async function gradesLoader({ params, request }) {
  const periodList = await getPeriodList();
  const periodId = params.periodId === "actual" ? periodList[0] : params.periodId;
  const url = new URL(request.url);
  const year = url.searchParams.get("year") || "";
  const classId = url.searchParams.get("class") || "";
  const q = url.searchParams.get("q") || "";
  const expanded = url.searchParams.get("expanded") || "";
  const data = await getGrades(periodId, year, classId, null, q);
  const subjects = year
    ? data.subjects.filter((subject) =>
        (data.subjectsPerYear?.[Number(year)] || []).includes(String(subject.id))
      )
    : data.subjects;
  return { ...data, subjects, filters: { year, classId, q, expanded } };
}

export async function gradesAction({ params, request }) {
  const periodList = await getPeriodList();
  const periodId = params.periodId === "actual" ? periodList[0] : params.periodId;
  const formData = await request.formData();
  const payload = formData.get("grades_payload");
  if (typeof payload === "string" && payload.length > 0) {
    try {
      const parsed = JSON.parse(payload);
      await loadGrades(periodId, parsed);
    } catch (error) {
      console.error(error);
    }
  }
  const returnSearch = String(formData.get("return_search") || "");
  return redirect(returnSearch ? `?${returnSearch}` : ".");
}

export default function Grades() {
  const { rows, years, classesByYear, subjects, filters } = useLoaderData();
  const [searchParams, setSearchParams] = useSearchParams();
  const submit = useSubmit();
  const [isEditing, setIsEditing] = useState(false);
  const [edits, setEdits] = useState({});

  const classes = pickClasses(classesByYear, filters.year);
  const expandedId = filters.expanded;
  const expandedSubject = subjects.find((subject) => String(subject.id) === expandedId) || null;
  const lapsoCount = 3;
  const gradeSlotsPerLapso = 4;
  const sampleLapsos = useMemo(() => {
    const rowWithExpanded = rows.find((row) => row.subjectDetails?.[expandedId]);
    return rowWithExpanded?.subjectDetails?.[expandedId]?.lapsos || [[], [], []];
  }, [rows, expandedId]);

  const applyFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (!value) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    if (key === "year") {
      next.delete("class");
    }
    setSearchParams(next);
  };

  const toggleExpanded = (subjectId) => {
    const next = new URLSearchParams(searchParams);
    if (next.get("expanded") === String(subjectId)) {
      next.delete("expanded");
    } else {
      next.set("expanded", String(subjectId));
    }
    setSearchParams(next);
  };

  const handleToggleEdit = () => {
    if (!isEditing) {
      setIsEditing(true);
      return;
    }
    const formData = new FormData();
    formData.set("grades_payload", JSON.stringify(buildGradesPayload(rows, edits)));
    formData.set("return_search", searchParams.toString());
    submit(formData, { method: "post" });
    setIsEditing(false);
    setEdits({});
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            className="rounded-lg border border-gray-300 px-3 py-2"
            placeholder="Buscar cédula o nombre"
            value={filters.q}
            onChange={(event) => applyFilter("q", event.target.value)}
          />
          <select
            className="rounded-lg border border-gray-300 px-3 py-2"
            value={filters.year}
            onChange={(event) => applyFilter("year", event.target.value)}
          >
            <option value="">Todos los años</option>
            {years.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-gray-300 px-3 py-2"
            value={filters.classId}
            onChange={(event) => applyFilter("class", event.target.value)}
          >
            <option value="">Todas las secciones</option>
            {classes.map((classId) => (
              <option key={classId} value={classId}>
                {classId}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleToggleEdit}
          className={`flex items-center gap-2 font-semibold p-3 shadow-sm rounded-lg bg-gradient-to-b border ${isEditing ? "from-emerald-500 to-emerald-600 border-emerald-500 text-white" : "from-gray-50 to-gray-200 border-gray-300"}`}
        >
          {isEditing ? <>Guardar edición <Save className="w-5 h-5" /></> : <>Editar <Pencil className="w-5 h-5" /></>}
        </button>
      </div>

      <TableContainer className="">
        <DataTable className="text-sm">
          <TableHead>
            <tr className="">
              <HeadCell rowSpan={expandedSubject ? 4 : 2}>C.I.</HeadCell>
              <HeadCell rowSpan={expandedSubject ? 4 : 2}>Nombre Completo</HeadCell>
              <HeadCell rowSpan={expandedSubject ? 4 : 2}>Sección</HeadCell>
              {expandedSubject ? null : <HeadCell className="text-center" colSpan={subjects.length}>
                Notas
              </HeadCell>}
            </tr>
            <tr className="">
              {(expandedSubject ? [expandedSubject] : subjects).map((subject) => {
                const isExpanded = String(subject.id) === expandedId;
                if (!isExpanded) {
                  return (
                    <HeadCell key={subject.id} className="text-center">
                      <button type="button" className="underline decoration-dotted" onClick={() => toggleExpanded(subject.id)}>
                        {subject.abbr}
                      </button>
                    </HeadCell>
                  );
                }
                return (
                  <HeadCell
                    key={subject.id}
                    className="text-center"
                    colSpan={lapsoCount * gradeSlotsPerLapso}
                  >
                    <button type="button" className="underline decoration-dotted" onClick={() => toggleExpanded(subject.id)}>
                      {subject.name}
                    </button>
                  </HeadCell>
                );
              })}
            </tr>
            {expandedSubject && (
              <tr className="">
                {Array.from({ length: lapsoCount }, (_, lapsoIndex) => (
                  <HeadCell key={`l${lapsoIndex + 1}`} className="text-center" colSpan={gradeSlotsPerLapso}>
                    {`L${lapsoIndex + 1}`}
                  </HeadCell>
                ))}
              </tr>
            )}
            {expandedSubject && (
              <tr className="">
                {Array.from({ length: lapsoCount }, (_, lapsoIndex) =>
                  Array.from({ length: gradeSlotsPerLapso }, (_, gradeIndex) => (
                    <HeadCell key={`l${lapsoIndex + 1}-${gradeIndex + 1}`} className="text-center">
                      {gradeIndex + 1}
                    </HeadCell>
                  ))
                )}
              </tr>
            )}
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <tr key={row.id} className="">
                <BodyCell>{row.id}</BodyCell>
                <BodyCell>{row.fullName}</BodyCell>
                <BodyCell>{row.class}</BodyCell>
                {(expandedSubject ? [expandedSubject] : subjects).map((subject) => {
                  const subjectId = String(subject.id);
                  if (subjectId !== expandedId) {
                    return (
                      <BodyCell key={`${row.id}-${subjectId}`} className="text-center">
                        {formatGrade(row.subjectAverages?.[subjectId])}
                      </BodyCell>
                    );
                  }
                  const lapsos = row.subjectDetails?.[subjectId]?.lapsos || sampleLapsos;
                  return Array.from({ length: lapsoCount }, (_, lapsoIndex) =>
                    Array.from({ length: gradeSlotsPerLapso }, (_, gradeIndex) => {
                      const grade = lapsos?.[lapsoIndex]?.[gradeIndex] ?? null;
                      const edited = edits?.[row.id]?.[subjectId]?.[lapsoIndex]?.[gradeIndex];
                      return (
                        <BodyCell key={`${row.id}-${subjectId}-${lapsoIndex}-${gradeIndex}`} className="text-center">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              max="20"
                              step="0.1"
                              className="w-[8ch] rounded border border-gray-300 px-2 text-center"
                              value={edited ?? (grade ?? "")}
                              onChange={(event) => {
                                const value = event.target.value;
                                setEdits((prev) => ({
                                  ...prev,
                                  [row.id]: {
                                    ...(prev[row.id] || {}),
                                    [subjectId]: {
                                      ...(prev[row.id]?.[subjectId] || {}),
                                      [lapsoIndex]: {
                                        ...(prev[row.id]?.[subjectId]?.[lapsoIndex] || {}),
                                        [gradeIndex]: value,
                                      },
                                    },
                                  },
                                }));
                              }}
                            />
                          ) : (
                            formatGrade(grade)
                          )}
                        </BodyCell>
                      );
                    })
                  );
                })}
              </tr>
            ))}
          </TableBody>
        </DataTable>
      </TableContainer>
    </div>
  );
}
