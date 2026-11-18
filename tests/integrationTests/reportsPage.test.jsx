import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Reports, { reportsLoader } from "../../src/routes/root/reports/Reports";
import { generateReport, getPeriodList, getReportOptionData, getReportUrl } from "../../src/db";
import { fieldDefinitions } from "../fieldFixtures";

vi.mock("docx-preview", () => ({ renderAsync: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../../src/db", () => ({
  generateReport: vi.fn(), getPeriodList: vi.fn(), getReportOptionData: vi.fn(), getReportUrl: vi.fn(),
}));
const response = {
  reportTypes: [
    { value: "grades", name: "Boletín", options: [{
      value: "terms", name: "Lapsos", options: [
        { value: "all", name: "Todos los lapsos" },
        { value: "1", name: "1er Lapso" },
        { value: "2", name: "2do Lapso" },
        { value: "3", name: "3er Lapso" },
      ],
    }] },
    { value: "enrollment", name: "Matrícula", options: [{
      value: "year", name: "Año", options: [
        { value: "all", name: "Todos los años" },
        { value: "1", name: "Primer año" },
      ],
    }] },
  ],
  fields: fieldDefinitions({
    q: "Buscar estudiante", firstName: "Nombres", lastName: "Apellidos",
    birthDate: "Fecha de nacimiento", birthPlace: "Lugar de nacimiento",
    guardians: "Representantes", class: "Sección", status: "Estatus",
  }),
  years: [{ id: 1, name: "Primer año" }],
  classesByYear: { 1: ["A"] },
  statuses: [{ value: "pending", name: "Pendiente" }],
};
function renderReports(search = "") {
  const loader = vi.fn(reportsLoader);
  const router = createMemoryRouter([{
    id: "reports", path: "/periodo/:periodId/reportes", element: <Reports />, loader,
  }], { initialEntries: ["/periodo/actual/reportes" + search] });
  render(<RouterProvider router={router} />);
  return { loader, router };
}
function query(loader) {
  return new URL(loader.mock.calls.at(-1)[0].request.url).searchParams;
}
beforeEach(() => {
  vi.clearAllMocks();
  getPeriodList.mockResolvedValue([{ id: "2025" }]);
  getReportOptionData.mockResolvedValue(response);
  getReportUrl.mockReturnValue("/api/reports/grades?periodId=2025");
  generateReport.mockResolvedValue(new Blob());
});
describe("Reports page", () => {
  it("declares report options locally and renders every common student filter", async () => {
    renderReports();
    const type = await screen.findByLabelText("Tipo de reporte");
    const studentFilters = screen.getByRole("group", { name: "Filtros del estudiante" });
    expect(studentFilters).toContainElement(screen.getByLabelText("Nombres"));
    expect(studentFilters).not.toContainElement(type);
    expect(getReportOptionData).toHaveBeenCalled();
    expect(within(type).getByRole("option", { name: "Matrícula" })).toHaveValue("enrollment");
    expect(screen.getByLabelText("Lapsos")).toHaveValue("all");
    for (const label of Object.values(response.fields).map((field) => field.label)) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByLabelText("Año")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombres")).not.toBeRequired();
  });
  it("uses all filters and comma-separated IDs for preview and download", async () => {
    renderReports("?type=grades&terms=2&q=V-1,E-2&firstName=Ana&lastName=Perez&birthDate=2010&birthPlace=Caracas&guardianQ=Maria&year=1&class=A&status=pending");
    await screen.findByLabelText("Lapsos");
    const filters = { terms: "2", q: "V-1,E-2", firstName: "Ana", lastName: "Perez", birthDate: "2010", birthPlace: "Caracas", guardianQ: "Maria", year: "1", class: "A", status: "pending" };
    expect(generateReport).toHaveBeenCalledWith("2025", "grades", { ...filters, preview: "true" });
    expect(getReportUrl).toHaveBeenCalledWith("2025", "grades", filters);
  });
  it("changes report type while retaining common filters and IDs", async () => {
    const user = userEvent.setup();
    const { loader } = renderReports("?terms=2&q=V-1,E-2&year=1&class=A&status=pending");
    await user.selectOptions(await screen.findByLabelText("Tipo de reporte"), "enrollment");
    await waitFor(() => expect(screen.queryByLabelText("Lapsos")).not.toBeInTheDocument());
    expect(query(loader).get("q")).toBe("V-1,E-2");
    expect(query(loader).get("status")).toBe("pending");
    expect(query(loader).has("terms")).toBe(false);
    expect(screen.getByLabelText("Nombre del archivo")).toHaveValue("reporte-Matrícula");
  });
  it("clears the class when the year is cleared", async () => {
    const user = userEvent.setup();
    const { loader } = renderReports("?year=1&class=A");
    await user.selectOptions(await screen.findByLabelText("Año"), "");
    await waitFor(() => expect(query(loader).has("class")).toBe(false));
  });
  it("downloads the report using the entered filename", async () => {
    const user = userEvent.setup();
    renderReports();
    const filename = await screen.findByLabelText("Nombre del archivo");
    await user.clear(filename);
    await user.type(filename, "notas-del-grupo");
    expect(screen.getByRole("link", { name: "Descargar reporte" })).toHaveAttribute("download", "notas-del-grupo.docx");
  });
  it("shows an empty state without requesting a report when no report types exist", async () => {
    getReportOptionData.mockResolvedValue({ ...response, reportTypes: [] });
    renderReports();
    expect(await screen.findByText("No hay tipos de reporte disponibles")).toBeInTheDocument();
    expect(generateReport).not.toHaveBeenCalled();
  });
});
