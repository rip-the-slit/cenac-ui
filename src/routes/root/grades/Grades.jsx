import { useState, useEffect, useRef } from "react";
import {
  Form,
  useActionData,
  useFetcher,
  useLoaderData,
  useNavigate,
  useNavigation,
} from "react-router";
import { Pencil, RefreshCw, Save } from "lucide-react";
import { getGrades, getPeriodList, loadGrades } from "../../../db";
import GradesFilters from "./GradesFilters";
import GradesTable from "./GradesTable";
import TableControl from "../components/TableControl";
import {
  createFilterSearchParams,
  getViewFilters,
  parseGradeEntries,
} from "./gradesUtils";
import { useErrorDialog } from "../../../context/ErrorDialogContext";
import RouteAccess from "../components/RouteAccess";
import { PageLayout } from "../../../components/Layout";

const MAX_TABLE_ROWS = 20;
const BULK_ACTION_OPTIONS = [
  { value: "grades", label: "Generar boletín" },
];

export async function gradesLoader({ params, request }) {
  const url = new URL(request.url);
  const periodList = await getPeriodList();
  const periodId =
    params.periodId === "actual" ? periodList[0].id : params.periodId;
  const year = url.searchParams.get("year") || "";
  const classId = url.searchParams.get("class") || "";
  const q = url.searchParams.get("q") || "";
  const status = url.searchParams.get("status") || "";
  const expanded = url.searchParams.get("expanded") || "";
  const requestedPage = Number.parseInt(url.searchParams.get("page"), 10);
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const data = await getGrades(
    periodId,
    year,
    classId,
    status,
    q,
    page,
    MAX_TABLE_ROWS
  );
  const recordsAmount = data.recordsAmount;
  const pageCount = Math.max(1, Math.ceil(recordsAmount / MAX_TABLE_ROWS));
  const currentPage = Math.min(page, pageCount);
  return {
    ...data,
    periodId,
    recordsAmount,
    filters: {
      year,
      classId,
      q,
      status,
      expanded,
      page: String(currentPage),
    },
  };
}

export async function gradesAction({ params, request }) {
  try {
    const periodList = await getPeriodList();
    const periodId =
      params.periodId === "actual" ? periodList[0].id : params.periodId;
    const formData = await request.formData();

    const payload = parseGradeEntries(formData);
    if (payload.length > 0) return await loadGrades(periodId, payload);
  } catch (error) {
    return error;
  }
}

export default function Grades() {
  const loaderData = useLoaderData();
  const filterFetcher = useFetcher();
  const actionData = useActionData();
  const { emitError } = useErrorDialog();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState({ all: false });
  const navigation = useNavigation()
  const navigate = useNavigate();
  const navigationRef = useRef(null)

  const activeData = filterFetcher.data ?? loaderData;
  let {
    rows,
    years,
    classesByYear,
    subjects,
    subjectsByYear,
    statuses,
    studentGradesFieldLabels,
    filters,
    recordsAmount,
  } = activeData;
  const viewFilters = getViewFilters(filters, filterFetcher.formData);
  if (viewFilters.year) {
    const taughtSubjectIds = subjectsByYear?.[viewFilters.year] || [];
    subjects = subjects.filter((subject) =>
      taughtSubjectIds.some(
        (subjectId) => String(subjectId) === String(subject.id)
      )
    );
  }
  const expandedSubject =
    subjects.find((subject) => String(subject.id) === viewFilters.expanded) ||
    null;
  const page = Number(viewFilters.page);
  const pageCount = Math.max(1, Math.ceil(recordsAmount / MAX_TABLE_ROWS));
  const submitFilters = (formData) =>
    filterFetcher.submit(formData, { method: "get" });
  const handleBulkAction = (action, studentIds, allSelected) => {
    if (action !== "grades" || (!allSelected && studentIds.length === 0)) {
      return;
    }

    const params = new URLSearchParams({ type: action });
    if (!allSelected) params.set("q", studentIds.join(" OR "));
    navigate(
      `/periodo/${encodeURIComponent(activeData.periodId)}/reportes?${params}`
    );
  };

  useEffect(() => {
    if (actionData instanceof Error) {
      emitError(actionData.message);
    }
  }, [actionData, emitError]);

  useEffect(() => {
    if (navigation?.state === "submitting") {
      navigationRef.current = navigation
    } else if (navigation?.state === "idle" && navigationRef.current) {
      navigationRef.current = null
      setIsEditing(false)
    }
  }, [navigation])

  return (
    <PageLayout title="Notas">
      <div className="flex-0 flex flex-wrap items-end justify-between gap-3">
        <GradesFilters
          FormComponent={filterFetcher.Form}
          filters={viewFilters}
          years={years}
          classesByYear={classesByYear}
          statuses={statuses || []}
          subjects={subjects || []}
          studentGradesFieldLabels={studentGradesFieldLabels}
          onSubmit={submitFilters}
        />
        {expandedSubject && (
          <RouteAccess
            userLevels={["Administrador", "Coordinador"]}
            periodStatuses={["active"]}
          >
            <button
              type={isEditing ? "submit" : "button"}
              form={isEditing ? "grades-form" : undefined}
              onClick={(event) => {
                if (!isEditing) {
                  event.preventDefault();
                  setIsEditing(true);
                }
              }}
              className={`flex items-center gap-2 font-semibold p-3 shadow-sm rounded-lg bg-gradient-to-b border ${
                isEditing
                  ? "from-emerald-500 to-emerald-600 border-emerald-500 text-white"
                  : "from-gray-50 to-gray-200 border-gray-300 text-gray-700"
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
          </RouteAccess>
        )}
      </div>

      <Form id="grades-form" method="post" className="relative">
        <input
          type="hidden"
          name="return_search"
          value={createFilterSearchParams(viewFilters).toString()}
        />
        {filterFetcher.state !== "idle" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
            <RefreshCw className="h-5 w-5 animate-spin text-gray-500" />
          </div>
        )}
        <TableControl
          page={page}
          pageCount={pageCount}
          recordsAmount={recordsAmount}
          selectedIds={selectedIds}
          bulkActionId="grades-bulk-action"
          bulkActionOptions={BULK_ACTION_OPTIONS}
          onBulkAction={handleBulkAction}
          onPageChange={(nextPage) =>
            submitFilters(
              createFilterSearchParams({
                ...viewFilters,
                page: String(nextPage),
              })
            )
          }
        >
          <GradesTable
            rows={rows}
            subjects={subjects}
            studentGradesFieldLabels={studentGradesFieldLabels}
            statuses={statuses || []}
            expandedSubject={expandedSubject}
            isEditing={isEditing}
            selectedIds={selectedIds}
            showPeriod={activeData.periodId === "all"}
            className={
              "max-h-[55vh] overflow-auto " +
              (filterFetcher.state !== "idle" ? "opacity-60" : "")
            }
            onExpandedChange={(expanded) => {
              if (!expanded) setIsEditing(false);
              submitFilters(
                createFilterSearchParams({ ...viewFilters, expanded })
              );
            }}
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
      </Form>
    </PageLayout>
  );
}
