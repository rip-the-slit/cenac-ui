import { useState } from "react";
import { Outlet, useFetcher, useLoaderData, useParams } from "react-router";
import { RefreshCw } from "lucide-react";
import { getPeriodList, getStudents } from "../../../db";
import TableControl from "../components/TableControl";
import StudentsFilters from "./StudentsFilters";
import StudentsTable from "./StudentsTable";
import {
  createFilterSearchParams,
  getViewFilters,
} from "./studentsUtils";

const MAX_TABLE_ROWS = 20;
const BULK_ACTION_OPTIONS = [
  { value: "", label: "Acciones masivas" },
  { value: "none", label: "Sin acciones disponibles", disabled: true },
];

export async function studentsLoader({ params, request }) {
  const periodList = await getPeriodList();
  const periodId =
    params.periodId === "actual" ? periodList[0].id : params.periodId;
  const url = new URL(request.url);
  const requestedPage = Number.parseInt(url.searchParams.get("page"), 10);
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const filters = {
    id: url.searchParams.get("id") || "",
    firstName: url.searchParams.get("firstName") || "",
    lastName: url.searchParams.get("lastName") || "",
    birthDate: url.searchParams.get("birthDate") || "",
    birthPlace: url.searchParams.get("birthPlace") || "",
    year: url.searchParams.get("year") || "",
    classId: url.searchParams.get("class") || "",
    status: url.searchParams.get("status") || "",
    page: String(page),
  };
  const data = await getStudents(periodId, {
    ...filters,
    page,
    limit: MAX_TABLE_ROWS,
  });
  const recordsAmount = data.recordsAmount;
  const pageCount = Math.max(1, Math.ceil(recordsAmount / MAX_TABLE_ROWS));
  const currentPage = Math.min(page, pageCount);

  return {
    ...data,
    recordsAmount,
    filters: { ...filters, page: String(currentPage) },
  };
}

export default function Students() {
  const loaderData = useLoaderData();
  const fetcher = useFetcher();
  const params = useParams();
  const [selectedIds, setSelectedIds] = useState({ all: false });

  if (params.studentId) return <Outlet />;

  const activeData = fetcher.data ?? loaderData;
  const {
    rows,
    years,
    classesByYear,
    studentFieldLabels,
    statuses,
    filters,
    recordsAmount,
  } = activeData;
  const viewFilters = getViewFilters(filters, fetcher.formData);
  const page = Number(viewFilters.page);
  const pageCount = Math.max(1, Math.ceil(recordsAmount / MAX_TABLE_ROWS));
  const submitFilters = (formData) =>
    fetcher.submit(formData, { method: "get" });

  return (
    <div className="flex flex-col gap-4 pt-10 h-full">
      <StudentsFilters
        FormComponent={fetcher.Form}
        filters={viewFilters}
        years={years}
        classesByYear={classesByYear}
        studentFieldLabels={studentFieldLabels}
        statuses={statuses || []}
        onSubmit={submitFilters}
      />

      <div className="relative">
        {fetcher.state !== "idle" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60">
            <RefreshCw className="h-5 w-5 animate-spin text-gray-500" />
          </div>
        )}
        <TableControl
          page={page}
          pageCount={pageCount}
          recordsAmount={recordsAmount}
          selectedIds={selectedIds}
          bulkActionId="students-bulk-action"
          bulkActionOptions={BULK_ACTION_OPTIONS}
          onPageChange={(nextPage) =>
            submitFilters(
              createFilterSearchParams({
                ...viewFilters,
                page: String(nextPage),
              })
            )
          }
        >
          <StudentsTable
            rows={rows}
            years={years}
            studentFieldLabels={studentFieldLabels}
            selectedIds={selectedIds}
            className={
              "max-h-[55vh] overflow-auto " +
              (fetcher.state !== "idle" ? "opacity-60" : "")
            }
            onSelectAll={(selected) =>
              setSelectedIds(selected ? { all: true } : { all: false })
            }
            onSelectRow={(id) =>
              setSelectedIds((current) => ({
                ...current,
                [id]: current.all
                  ? current[id] === false
                  : current[id] !== true,
              }))
            }
          />
        </TableControl>
      </div>
    </div>
  );
}
