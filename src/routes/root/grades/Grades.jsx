import { useState } from "react";
import { Form, redirect, useFetcher, useLoaderData } from "react-router";
import { Pencil, RefreshCw, Save } from "lucide-react";
import { getGrades, getPeriodList, loadGrades } from "../../../db";
import GradesFilters from "./GradesFilters";
import GradesTable from "./GradesTable";
import {
  createFilterSearchParams,
  getViewFilters,
  parseGradeEntries,
} from "./gradesUtils";

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
    if (payload.length > 0) await loadGrades(periodId, payload);
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
  const { rows, years, classesByYear, subjects, statuses, filters } = activeData;
  const viewFilters = getViewFilters(filters, filterFetcher.formData);
  const expandedSubject =
    subjects.find((subject) => String(subject.id) === viewFilters.expanded) || null;
  const submitFilters = (formData) =>
    filterFetcher.submit(formData, { method: "get" });

  return (
    <div className="space-y-4 mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <GradesFilters
          FormComponent={filterFetcher.Form}
          filters={viewFilters}
          years={years}
          classesByYear={classesByYear}
          statuses={statuses || []}
          onSubmit={submitFilters}
        />
        {expandedSubject && (
          <button
            type={isEditing ? "submit" : "button"}
            form={isEditing ? "grades-form" : undefined}
            onClick={() => !isEditing && setIsEditing(true)}
            className={`flex items-center gap-2 font-semibold p-3 shadow-sm rounded-lg bg-gradient-to-b border ${
              isEditing
                ? "from-emerald-500 to-emerald-600 border-emerald-500 text-white"
                : "from-gray-50 to-gray-200 border-gray-300"
            }`}
          >
            {isEditing ? (
              <>Guardar edición <Save className="w-5 h-5" /></>
            ) : (
              <>Editar <Pencil className="w-5 h-5" /></>
            )}
          </button>
        )}
      </div>

      <Form id="grades-form" method="post">
        <input type="hidden" name="return_search" value={createFilterSearchParams(viewFilters).toString()} />
        <div className="relative">
          {filterFetcher.state !== "idle" && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
              <RefreshCw className="h-5 w-5 animate-spin text-gray-500" />
            </div>
          )}
          <GradesTable
            rows={rows}
            subjects={subjects}
            expandedSubject={expandedSubject}
            isEditing={isEditing}
            className={filterFetcher.state !== "idle" ? "opacity-60" : ""}
            onExpandedChange={(expanded) => {
              if (!expanded) setIsEditing(false);
              submitFilters(createFilterSearchParams({ ...viewFilters, expanded }));
            }}
          />
        </div>
      </Form>
    </div>
  );
}
