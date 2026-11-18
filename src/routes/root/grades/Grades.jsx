import { useState, useEffect, useRef } from "react";
import { togglePageSelection } from "../components/tableSelection";
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
} from "./gradesUtils.jsx";
import { useErrorDialog } from "../../../context/ErrorDialogContext";
import RouteAccess from "../components/RouteAccess";
import { PageLayout } from "../../../components/Layout";
import { Button, PrimaryButton } from "../../../components/Button";
import useSaveNavigationPrompt from "../load/useSaveNavigationPrompt";

const MAX_TABLE_ROWS = 20;
const BULK_ACTION_OPTIONS = [{ value: "grades", label: "Generar boletín" }];

function markChangedGrade(event) {
  const target = event.target;
  if (typeof target.name === "string" && target.name.startsWith("grade::")) {
    target.setAttribute("name", "changed::" + target.name);
  }
}

export async function gradesLoader({ params, request }) {
  const periodList = await getPeriodList();
  const periodId =
    params.periodId === "actual" ? periodList[0].id : params.periodId;
  const url = new URL(request.url);
  const requestedPage = Number.parseInt(url.searchParams.get("page"), 10);
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const limit = MAX_TABLE_ROWS;
  const year = url.searchParams.get("year") || "";
  const classId = url.searchParams.get("class") || "";
  const q = url.searchParams.get("q") || "";
  const status = url.searchParams.get("status") || "";
  const expanded = url.searchParams.get("expanded") || "";
  const data = await getGrades(periodId, year, classId, status, q, page, limit);
  const recordsAmount = data.recordsAmount;
  const pageCount = Math.max(1, Math.ceil(recordsAmount / limit));
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
  const allowSaveNavigation = useSaveNavigationPrompt(isEditing);
  const EditSaveButton = isEditing ? PrimaryButton : Button;
  const [selectedIds, setSelectedIds] = useState({ all: false });
  const navigation = useNavigation();
  const navigate = useNavigate();
  const navigationRef = useRef(null);
  const gradesFormRef = useRef(null);

  const activeData = filterFetcher.data ?? loaderData;
  let {
    rows,
    years,
    classesByYear,
    subjects,
    subjectsByYear,
    statuses,
    fields,
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
  const expandedIndex =
    viewFilters.expanded === "" ? null : Number(viewFilters.expanded);
  const expandedSubject = subjects[expandedIndex] || null;
  const page = Number(viewFilters.page);
  const pageCount = Math.max(1, Math.ceil(recordsAmount / MAX_TABLE_ROWS));
  const submitFilters = (formData) =>
    filterFetcher.submit(formData, { method: "get" });
  const handleBulkAction = (action, studentIds, allSelected) => {
    if (activeData.periodId === "all" || action !== "grades" || (!allSelected && studentIds.length === 0)) {
      return;
    }

    const params = new URLSearchParams({ type: action, hideFilter: "true" });
    const applied = activeData.filters;
    for (const [name, value] of Object.entries({
      q: !allSelected ? studentIds.join(",") : "",
      year: applied.year,
      class: applied.classId,
      status: applied.status,
    })) {
      if (value) params.set(name, value);
    }
    navigate(
      `/periodo/${encodeURIComponent(activeData.periodId)}/reportes?${params}`
    );
  };

  useEffect(() => {
    const form = gradesFormRef.current;
    const report = () => form?.reportValidity();
    form?.addEventListener("change", markChangedGrade);
    form?.addEventListener("focusout", report);
    return () => {
      form?.removeEventListener("change", markChangedGrade);
      form?.removeEventListener("focusout", report);
    };
  }, []);

  useEffect(() => {
    if (actionData instanceof Error) {
      emitError(actionData.message);
    }
  }, [actionData, emitError]);

  useEffect(() => {
    if (navigation?.state === "submitting") {
      navigationRef.current = navigation;
    } else if (navigation?.state === "idle" && navigationRef.current) {
      navigationRef.current = null;
      setIsEditing(false);
    }
  }, [navigation]);

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
          fields={fields}
          onSubmit={submitFilters}
        />
        {expandedSubject && (
          <RouteAccess
            userLevels={["Administrador", "Coordinador"]}
            periodStatuses={["active"]}
          >
            <EditSaveButton
              type={isEditing ? "submit" : "button"}
              form={isEditing ? "grades-form" : undefined}
              onClick={(event) => {
                if (!isEditing) {
                  event.preventDefault();
                  setIsEditing(true);
                }
              }}
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
            </EditSaveButton>
          </RouteAccess>
        )}
      </div>

      <Form
        id="grades-form"
        method="post"
        className="relative"
        ref={gradesFormRef}
        onSubmit={allowSaveNavigation}
      >
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
          disabled={isEditing}
          bulkActionId="grades-bulk-action"
          bulkActionOptions={activeData.periodId === "all" ? [{ label: "Acciones masivas" }] : BULK_ACTION_OPTIONS}
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
            years={years}
            fields={fields}
            statuses={statuses || []}
            expandedIndex={expandedIndex}
            isEditing={isEditing}
            selectedIds={selectedIds}
            showPeriod={activeData.periodId === "all"}
            className={
              "max-h-[55vh] overflow-auto " +
              (filterFetcher.state !== "idle" ? "opacity-60" : "")
            }
            onExpandedChange={(expanded) => {
              if (expanded === "") setIsEditing(false);
              submitFilters(
                createFilterSearchParams({ ...viewFilters, expanded })
              );
            }}
            onSelectAll={(selected) =>
              setSelectedIds(selected ? { all: true } : { all: false })
            }
            onSelectRow={(id) =>
              setSelectedIds((current) => togglePageSelection(current, id, rows))
            }
          />
        </TableControl>
      </Form>
    </PageLayout>
  );
}
