import { useEffect, useRef, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { useFetcher, useRouteLoaderData } from "react-router";
import { renderAsync } from "docx-preview";
import {
  generateReport,
  getPeriodList,
  getReportOptionData,
} from "../../../db";
import ReportsFilters from "./ReportsFilters";
import Filter from "../components/Filter";

export async function reportsLoader({ params, request }) {
  const url = new URL(request.url);
  const periodList = await getPeriodList();
  const reportOptionData = await getReportOptionData();
  const periodId =
    params.periodId === "actual" ? periodList[0].id : params.periodId;
  const requestedReportType = url.searchParams.get("type");
  const activeReport =
    reportOptionData.reportTypes.find(
      (report) => report.value === requestedReportType
    ) || reportOptionData.reportTypes[0];
  const reportType = activeReport?.value || "";
  const filters = {
    reportType,
    q: url.searchParams.get("q") || "",
  };
  const reportFilters = { q: filters.q };

  for (const option of activeReport?.options || []) {
    const value =
      url.searchParams.get(option.value) || option.options[0]?.value || "";
    filters[option.value] = value;
    reportFilters[option.value] = value;
  }

  const reportFile = reportType
    ? await generateReport(periodId, reportType, reportFilters)
    : null;

  return {
    ...reportOptionData,
    reportFile,
    periodId,
    filters,
  };
}

export default function Reports() {
  const loaderData = useRouteLoaderData("reports");
  const filterFetcher = useFetcher();
  const activeData = filterFetcher.data ?? loaderData;
  const { reportTypes = [], reportFile, filters = {} } = activeData || {};
  const pendingFilters = filterFetcher.formData
    ? Object.fromEntries(filterFetcher.formData)
    : null;
  const viewFilters = pendingFilters
    ? {
        ...pendingFilters,
        reportType: pendingFilters.type || filters.reportType,
      }
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

  const downloadReport = () => {
    if (!reportFile) return;
    const objectUrl = URL.createObjectURL(reportFile);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `${fileName}.docx`;
    link.click();
    URL.revokeObjectURL(objectUrl);
  };

  useEffect(() => {
    if (filterFetcher.state !== "loading") return
    spinnerRef.current.classList.remove("hidden")
  }, [filterFetcher.state])

  useEffect(() => {
    if (!reportFile || !docxPreviewRef.current) return;
    docxPreviewRef.current.replaceChildren();
    renderAsync(reportFile, docxPreviewRef.current).then(() =>
      spinnerRef.current.classList.add("hidden")
    );
  }, [reportFile]);

  useEffect(() => {
    if (reportTypeRef.current === viewFilters.reportType) return;

    reportTypeRef.current = viewFilters.reportType;
    setFileName(defaultFileName);
  }, [defaultFileName, viewFilters.reportType]);

  if (reportTypes.length === 0) {
    return (
      <div className="pt-10 text-sm text-gray-500">
        No hay tipos de reporte disponibles
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <ReportsFilters
          FormComponent={filterFetcher.Form}
          filters={viewFilters}
          reportTypes={reportTypes}
          onSubmit={submitFilters}
        />
        <div className="flex gap-5 items-center">
          <Filter label="Nombre del archivo" htmlFor="report-file-name">
            <div className="rounded-lg border border-gray-300 px-3 py-2 font-normal text-gray-900 overflow-hidden w-full">
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
          <button
            type="button"
            disabled={!reportFile || filterFetcher.state !== "idle"}
            onClick={downloadReport}
            className="flex items-center gap-2 rounded-lg border border-emerald-500 bg-gradient-to-b from-emerald-500 to-emerald-600 p-3 font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Descargar reporte <Download className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="relative rounded-xl border border-gray-200 overflow-hidden">
        <div
          ref={spinnerRef}
          className="absolute inset-0 z-10 flex items-center justify-center bg-gray-200/60 hidden"
        >
          <RefreshCw className="h-6 w-6 animate-spin text-gray-500" />
        </div>
        <div className="h-[75vh] overflow-auto" ref={docxPreviewRef}></div>
      </div>
    </div>
  );
}
