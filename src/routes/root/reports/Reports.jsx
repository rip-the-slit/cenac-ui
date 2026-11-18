import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { useFetcher, useRouteLoaderData } from "react-router";
import { renderAsync } from "docx-preview";
import {
  generateReport,
  getPeriodList,
  getReportOptionData,
  getReportUrl,
} from "../../../db";
import ReportsFilters from "./ReportsFilters";
import Filter from "../components/Filter";
import { PageLayout } from "../../../components/Layout";
import { PrimaryButton } from "../../../components/Button";

export async function reportsLoader({ params, request }) {
  const url = new URL(request.url);
  const periodList = await getPeriodList();
  const periodId = params.periodId === "actual" ? periodList[0].id : params.periodId;
  const reportOptionData = await getReportOptionData(periodId);
  const reportTypes = reportOptionData.reportTypes;
  const requestedReportType = url.searchParams.get("type");
  const activeReport = reportTypes.find(
    (report) => report.value === requestedReportType
  ) || reportTypes[0];
  const reportType = activeReport?.value || "";
  const hideFilters = url.searchParams.get("hideFilter") === "true";
  const q = url.searchParams.get("q") || "";
  const firstName = url.searchParams.get("firstName") || "";
  const lastName = url.searchParams.get("lastName") || "";
  const birthDate = url.searchParams.get("birthDate") || "";
  const birthPlace = url.searchParams.get("birthPlace") || "";
  const guardianQ = url.searchParams.get("guardianQ") || "";
  const year = url.searchParams.get("year") || "";
  const classId = url.searchParams.get("class") || "";
  const status = url.searchParams.get("status") || "";
  const filters = {
    reportType, q, firstName, lastName, birthDate, birthPlace,
    guardianQ, year, classId, status,
  };
  const reportFilters = { q };
  if (firstName) reportFilters.firstName = firstName;
  if (lastName) reportFilters.lastName = lastName;
  if (birthDate) reportFilters.birthDate = birthDate;
  if (birthPlace) reportFilters.birthPlace = birthPlace;
  if (guardianQ) reportFilters.guardianQ = guardianQ;
  if (year) reportFilters.year = year;
  if (classId) reportFilters.class = classId;
  if (status) reportFilters.status = status;
  for (const option of activeReport?.options || []) {
    const value = url.searchParams.get(option.value) || option.options[0]?.value || "";
    filters[option.value] = value;
    reportFilters[option.value] = value;
  }
  const reportFile = reportType
    ? await generateReport(periodId, reportType, {
        ...reportFilters,
        preview: "true",
      })
    : null;
  return {
    ...reportOptionData,
    reportFile,
    downloadUrl: reportType ? getReportUrl(periodId, reportType, reportFilters) : "",
    periodId,
    hideFilters,
    filters,
  };
}

export default function Reports() {
  const loaderData = useRouteLoaderData("reports");
  const filterFetcher = useFetcher();
  const activeData = filterFetcher.data ?? loaderData;
  const {
    reportTypes = [], fields, years = [], classesByYear = {}, statuses = [],
    reportFile,
    downloadUrl = "",
    filters = {},
    hideFilters = false,
  } = activeData || {};
  const pendingFilters = filterFetcher.formData
    ? Object.fromEntries(filterFetcher.formData)
    : null;
  const viewFilters = pendingFilters
    ? { ...pendingFilters, classId: pendingFilters.class || "", reportType: pendingFilters.type || filters.reportType }
    : filters;
  const docxPreviewRef = useRef(null);
  const spinnerRef = useRef(null);
  const reportName = reportTypes.find(
    (report) => report.value === viewFilters.reportType
  )?.name;
  const defaultFileName = reportName ? `reporte-${reportName}` : "reporte";
  const [fileName, setFileName] = useState(defaultFileName);
  const reportTypeRef = useRef(viewFilters.reportType);
  const submitFilters = (formData) =>
    filterFetcher.submit(formData, { method: "get" });

  useEffect(() => {
    if (filterFetcher.state !== "loading") return;
    spinnerRef.current?.classList.remove("hidden");
  }, [filterFetcher.state]);

  useEffect(() => {
    if (!reportFile || !docxPreviewRef.current) return;
    docxPreviewRef.current.replaceChildren();
    renderAsync(reportFile, docxPreviewRef.current).then(() =>
      spinnerRef.current?.classList.add("hidden")
    );
  }, [reportFile]);

  useEffect(() => {
    if (reportTypeRef.current === viewFilters.reportType) return;
    reportTypeRef.current = viewFilters.reportType;
    setFileName(defaultFileName);
  }, [defaultFileName, viewFilters.reportType]);

  if (reportTypes.length === 0) {
    return (
      <PageLayout title="Reportes">
        <div className="pt-10 text-sm text-gray-500">
          No hay tipos de reporte disponibles
        </div>
      </PageLayout>
    );
  }

  const downloadDisabled = !downloadUrl || filterFetcher.state !== "idle";
  return (
    <PageLayout title="Reportes">
      <div className="flex flex-wrap items-end justify-between gap-8">
        <ReportsFilters
          FormComponent={filterFetcher.Form}
          filters={viewFilters}
          reportTypes={reportTypes}
          fields={fields}
          years={years}
          classesByYear={classesByYear}
          statuses={statuses}
          hideFilters={hideFilters}
          onSubmit={submitFilters}
        />
        <div className="flex items-center gap-5">
          <Filter label="Nombre del archivo" htmlFor="report-file-name">
            <div className="w-full overflow-hidden rounded-lg border border-gray-300 px-3 py-2 font-normal text-gray-900">
              <input
                id="report-file-name"
                value={fileName}
                aria-label="Nombre del archivo"
                className="bg-transparent"
                placeholder="nombre-del-archivo"
                type="text"
                spellCheck={false}
                maxLength={20}
                onChange={(event) => setFileName(event.target.value)}
              />
              <span>.docx</span>
            </div>
          </Filter>
          <PrimaryButton
            as="a"
            href={downloadDisabled ? undefined : downloadUrl}
            download={`${fileName}.docx`}
            aria-disabled={downloadDisabled}
          >
            Descargar reporte <Download className="h-5 w-5" />
          </PrimaryButton>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-xl border border-gray-200">
        <div
          ref={spinnerRef}
          className="absolute inset-0 z-10 flex items-center justify-center bg-gray-200/60 hidden"
        >
          <div className="loading-logo h-40 w-40" />
        </div>
        <div id="docx-preview" className={"overflow-auto " + (hideFilters ? "h-[85vh] " : "h-[75vh] ")} ref={docxPreviewRef}></div>
      </div>
    </PageLayout>
  );
}
