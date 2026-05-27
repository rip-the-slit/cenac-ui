import { useMemo, useState } from "react";
import { Form, redirect, useFetcher, useLoaderData } from "react-router";
import { getGrades, getPeriodList, loadGrades } from "../../../db";
import {
  BodyCell,
  DataTable,
  HeadCell,
  TableBody,
  TableContainer,
  TableHead,
} from "../load/TablePrimitives";
import { Pencil, RefreshCw, Save } from "lucide-react";

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
  Object.values(classesByYear || {}).forEach((list) =>
    (list || []).forEach((classId) => all.add(classId))
  );
  return [...all].sort();
}

function parseGradeEntries(formData) {
  const students = new Map();

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("grade::")) {
      continue;
    }

    const [_, studentId, subjectId, termIndexRaw, gradeIndexRaw] =
      key.split("::");
    if (!studentId || !subjectId) {
      continue;
    }

    const termIndex = Number(termIndexRaw);
    const gradeIndex = Number(gradeIndexRaw);
    if (!Number.isInteger(termIndex) || !Number.isInteger(gradeIndex)) {
      continue;
    }

    const numericValue = safeNumber(value);
    if (numericValue === null) {
      continue;
    }

    if (!students.has(studentId)) {
      students.set(studentId, { id: studentId, subjects: {} });
    }

    const student = students.get(studentId);
    if (!student.subjects[subjectId]) {
      student.subjects[subjectId] = [];
    }

    if (!student.subjects[subjectId][termIndex]) {
      student.subjects[subjectId][termIndex] = [];
    }

    student.subjects[subjectId][termIndex][gradeIndex] = numericValue;
  }

  return [...students.values()];
}

export async function gradesLoader({ params, request }) {
  const periodList = await getPeriodList();
  const periodId =
    params.periodId === "actual" ? periodList[0] : params.periodId;
  const url = new URL(request.url);
  const year = url.searchParams.get("year") || "";
  const classId = url.searchParams.get("class") || "";
  const q = url.searchParams.get("q") || "";
  const status = url.searchParams.get("status") || "";
  const expanded = url.searchParams.get("expanded") || "";
  const data = await getGrades(periodId, year, classId, status, q);
  const rows = status
    ? data.rows.filter((row) => String(row.status) === status)
    : data.rows;
  return { ...data, rows, filters: { year, classId, q, status, expanded } };
}

export async function gradesAction({ params, request }) {
  const periodList = await getPeriodList();
  const periodId =
    params.periodId === "actual" ? periodList[0] : params.periodId;
  const formData = await request.formData();

  try {
    const payload = parseGradeEntries(formData);
    if (payload.length > 0) {
      await loadGrades(periodId, payload);
    }
  } catch (error) {
    console.error(error);
  }

  const returnSearch = String(formData.get("return_search") || "");
  return redirect(returnSearch ? `?${returnSearch}` : ".");
}

export default function Grades() {
  const loaderData = useLoaderData();
  const filterFetcher = useFetcher();
  const [isEditing, setIsEditing] = useState(false);

  const activeData = filterFetcher.data ?? loaderData;
  const { rows, years, classesByYear, subjects, filters } = activeData;
  const isSearching = filterFetcher.state !== "idle";

  const getFilterValue = (name, fallback = "") => {
    const pending = filterFetcher.formData?.get(name);
    if (pending != null) return String(pending);
    return fallback;
  };

  const viewFilters = {
    q: getFilterValue("q", filters.q),
    year: getFilterValue("year", filters.year),
    classId: getFilterValue("class", filters.classId),
    status: getFilterValue("status", filters.status),
    expanded: getFilterValue("expanded", filters.expanded),
  };

  const submitFilters = ({ q, year, classId, status, expanded }) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (year) params.set("year", year);
    if (year && classId) params.set("class", classId);
    if (status) params.set("status", status);
    if (expanded) params.set("expanded", expanded);
    filterFetcher.submit(params, { method: "get" });
  };

  const classes = pickClasses(classesByYear, viewFilters.year);
  const expandedId = viewFilters.expanded;
  const expandedSubject =
    subjects.find((subject) => String(subject.id) === expandedId) || null;
  const termCount = 3;
  const gradeSlotsPerTerm = 4;
  const sampleTerm = useMemo(() => {
    const rowWithExpanded = rows.find(
      (row) => row.subjectDetails?.[expandedId]
    );
    return rowWithExpanded?.subjectDetails?.[expandedId]?.terms || [[], [], []];
  }, [rows, expandedId]);

  const handleToggleExpanded = (subjectId) => {
    const nextExpanded = expandedId === String(subjectId) ? "" : String(subjectId);
    if (!nextExpanded) {
      setIsEditing(false);
    }
    submitFilters({
      q: viewFilters.q,
      year: viewFilters.year,
      classId: viewFilters.classId,
      status: viewFilters.status,
      expanded: nextExpanded,
    });
  };

  const returnSearch = new URLSearchParams();
  if (viewFilters.q) returnSearch.set("q", viewFilters.q);
  if (viewFilters.year) returnSearch.set("year", viewFilters.year);
  if (viewFilters.year && viewFilters.classId) {
    returnSearch.set("class", viewFilters.classId);
  }
  if (viewFilters.status) returnSearch.set("status", viewFilters.status);
  if (viewFilters.expanded) returnSearch.set("expanded", viewFilters.expanded);

  return (
    <div className="space-y-4 mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <filterFetcher.Form
          className="grid gap-3 md:grid-cols-4"
          method="get"
          onChange={(event) => {
            const formData = new FormData(event.currentTarget);
            const year = String(formData.get("year") || "");
            if (!year) formData.delete("class");
            filterFetcher.submit(formData, { method: "get" });
          }}
        >
          <input
            name="q"
            className="rounded-lg border border-gray-300 px-3 py-2"
            placeholder="Buscar cédula o nombre"
            value={viewFilters.q}
            onChange={() => {}}
          />
          <select
            name="year"
            className="rounded-lg border border-gray-300 px-3 py-2"
            value={viewFilters.year}
            onChange={() => {}}
          >
            <option value="">Todos los años</option>
            {years.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>
          <select
            name="class"
            className="rounded-lg border border-gray-300 px-3 py-2"
            value={viewFilters.classId}
            onChange={() => {}}
          >
            <option value="">Todas las secciones</option>
            {classes.map((classId) => (
              <option key={classId} value={classId}>
                {classId}
              </option>
            ))}
          </select>
          <select
            name="status"
            className="rounded-lg border border-gray-300 px-3 py-2"
            value={viewFilters.status}
            onChange={() => {}}
          >
            <option value="">Todos los estatus</option>
            {(loaderData.statuses || []).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <input name="expanded" type="hidden" value={viewFilters.expanded} readOnly />
        </filterFetcher.Form>
        {expandedSubject ? (
          <button
            type={isEditing ? "submit" : "button"}
            form={isEditing ? "grades-form" : ""}
            onClick={() => setIsEditing(prev => !prev)}
            className={`flex items-center gap-2 font-semibold p-3 shadow-sm rounded-lg bg-gradient-to-b border ${
              isEditing
                ? "from-emerald-500 to-emerald-600 border-emerald-500 text-white"
                : "from-gray-50 to-gray-200 border-gray-300"
            }`}
          >
            {isEditing ? (
              <>
                Guardar edición <Save className="w-5 h-5" />
              </>
            ) : (
              <>
                Editar <Pencil className="w-5 h-5" />
              </>
            )}
          </button>
        ) : null}
      </div>

      <Form id="grades-form" method="post">
        <input type="hidden" name="return_search" value={returnSearch.toString()} />
        <div className="relative">
          {isSearching && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
              <RefreshCw className="h-5 w-5 animate-spin text-gray-500" />
            </div>
          )}
          <TableContainer className={isSearching ? "opacity-60" : ""}>
            <DataTable className="text-sm">
              <TableHead className="bg-gray-100">
                <tr className="">
                  <HeadCell rowSpan={expandedSubject ? 4 : 2}>C.I.</HeadCell>
                  <HeadCell rowSpan={expandedSubject ? 4 : 2}>
                    Nombre Completo
                  </HeadCell>
                  <HeadCell rowSpan={expandedSubject ? 4 : 2}>Sección</HeadCell>
                  <HeadCell rowSpan={expandedSubject ? 4 : 2}>
                    Estatus
                  </HeadCell>
                  {expandedSubject ? null : (
                    <HeadCell className="text-center" colSpan={subjects.length}>
                      Areas de Formación
                    </HeadCell>
                  )}
                </tr>
                <tr className="">
                  {(expandedSubject ? [expandedSubject] : subjects).map(
                    (subject) => {
                      const isExpanded = String(subject.id) === expandedId;
                      if (!isExpanded) {
                        return (
                          <HeadCell key={subject.id} className="text-center white">
                            <button
                              type="button"
                              className="underline decoration-dotted"
                              onClick={() => handleToggleExpanded(subject.id)}
                            >
                              {subject.abbr || subject.name}
                            </button>
                          </HeadCell>
                        );
                      }
                      return (
                        <HeadCell
                          key={subject.id}
                          className="text-center"
                          colSpan={termCount * gradeSlotsPerTerm}
                        >
                          <button
                            type="button"
                            className="underline decoration-dotted"
                            onClick={() => handleToggleExpanded(subject.id)}
                          >
                            {subject.name}
                          </button>
                        </HeadCell>
                      );
                    }
                  )}
                </tr>
                {expandedSubject && (
                  <tr className="">
                    {Array.from({ length: termCount }, (_, termIndex) => (
                      <HeadCell
                        key={`l${termIndex + 1}`}
                        className="text-center"
                        colSpan={gradeSlotsPerTerm}
                      >
                        {`L${termIndex + 1}`}
                      </HeadCell>
                    ))}
                  </tr>
                )}
                {expandedSubject && (
                  <tr className="">
                    {Array.from({ length: termCount }, (_, termIndex) =>
                      Array.from(
                        { length: gradeSlotsPerTerm },
                        (_, gradeIndex) => (
                          <HeadCell
                            key={`l${termIndex + 1}-${gradeIndex + 1}`}
                            className="text-center"
                          >
                            {gradeIndex + 1}
                          </HeadCell>
                        )
                      )
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
                    <BodyCell>{row.status}</BodyCell>
                    {(expandedSubject ? [expandedSubject] : subjects).map(
                      (subject) => {
                        const subjectId = String(subject.id);
                        if (subjectId !== expandedId) {
                          return (
                            <BodyCell
                              key={`${row.id}-${subjectId}`}
                              className="text-center"
                            >
                              {formatGrade(row.subjectAverages?.[subjectId])}
                            </BodyCell>
                          );
                        }
                        const terms =
                          row.subjectDetails?.[subjectId]?.terms || sampleTerm;
                        return Array.from({ length: termCount }, (_, termIndex) =>
                          Array.from(
                            { length: gradeSlotsPerTerm },
                            (_, gradeIndex) => {
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
                            }
                          )
                        );
                      }
                    )}
                  </tr>
                ))}
              </TableBody>
            </DataTable>
          </TableContainer>
        </div>
      </Form>
    </div>
  );
}
