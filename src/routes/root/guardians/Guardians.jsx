import { useState } from "react";
import { Outlet, useFetcher, useLoaderData, useParams } from "react-router";
import { RefreshCw } from "lucide-react";
import { getGuardians } from "../../../db";
import { PageLayout } from "../../../components/Layout";
import TableControl from "../components/TableControl";
import GuardiansFilters from "./GuardiansFilters";
import GuardiansTable from "./GuardiansTable";
import { createFilterSearchParams, getViewFilters } from "./guardiansUtils";

const MAX_TABLE_ROWS = 20;
const BULK_ACTION_OPTIONS = [
  { value: "", label: "Acciones masivas" },
  { value: "none", label: "Sin acciones disponibles", disabled: true },
];

export async function guardiansLoader({ request }) {
  const url = new URL(request.url);
  const requestedPage = Number.parseInt(url.searchParams.get("page"), 10);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const limit = MAX_TABLE_ROWS;
  const filters = {
    id: url.searchParams.get("id") || "",
    firstName: url.searchParams.get("firstName") || "",
    lastName: url.searchParams.get("lastName") || "",
    birthDate: url.searchParams.get("birthDate") || "",
    legalRole: url.searchParams.get("legalRole") || "",
    phone: url.searchParams.get("phone") || "",
    address: url.searchParams.get("address") || "",
    studentQ: url.searchParams.get("studentQ") || "",
  };
  const data = await getGuardians({ ...filters, page, limit });
  const recordsAmount = data.recordsAmount;
  const pageCount = Math.max(1, Math.ceil(recordsAmount / limit));
  const currentPage = Math.min(page, pageCount);
  return {
    ...data,
    recordsAmount,
    filters: { ...filters, page: String(currentPage) },
  };
}

export default function Guardians() {
  const loaderData = useLoaderData();
  const fetcher = useFetcher();
  const params = useParams();
  const [selectedIds, setSelectedIds] = useState({ all: false });
  if (params.guardianId) return <Outlet />;

  const activeData = fetcher.data ?? loaderData;
  const { rows = [], fields = {}, filters, recordsAmount } = activeData;
  const viewFilters = getViewFilters(filters, fetcher.formData);
  const page = Number(viewFilters.page);
  const pageCount = Math.max(1, Math.ceil(recordsAmount / MAX_TABLE_ROWS));
  const submitFilters = (formData) => fetcher.submit(formData, { method: "get" });

  return (
    <PageLayout title="Representantes">
      <GuardiansFilters
        FormComponent={fetcher.Form}
        filters={viewFilters}
        fields={fields}
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
          bulkActionId="guardians-bulk-action"
          bulkActionOptions={BULK_ACTION_OPTIONS}
          onPageChange={(nextPage) =>
            submitFilters(createFilterSearchParams({ ...viewFilters, page: String(nextPage) }))
          }
        >
          <GuardiansTable
            rows={rows}
            fields={fields}
            selectedIds={selectedIds}
            className={`max-h-[55vh] overflow-auto ${fetcher.state !== "idle" ? "opacity-60" : ""}`}
            onSelectAll={(selected) =>
              setSelectedIds(selected ? { all: true } : { all: false })
            }
            onSelectRow={(id) =>
              setSelectedIds((current) => ({
                ...current,
                [id]: current.all ? current[id] === false : current[id] !== true,
              }))
            }
          />
        </TableControl>
      </div>
    </PageLayout>
  );
}
