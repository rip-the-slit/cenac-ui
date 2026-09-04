import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Reports, { reportsLoader } from "../../src/routes/root/reports/Reports";
import {
  generateReport,
  getPeriodList,
  getReportOptionData,
} from "../../src/db";

vi.mock("docx-preview", () => ({
  renderAsync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../src/db", () => ({
  generateReport: vi.fn(),
  getPeriodList: vi.fn(),
  getReportOptionData: vi.fn(),
}));

const reportOptionData = {
  reportTypes: [
    {
      value: "grades",
      name: "Boletín",
      options: [
        {
          value: "terms",
          name: "Lapsos",
          options: [
            { value: "all", name: "Todos los lapsos" },
            { value: "1", name: "1er Lapso" },
            { value: "2", name: "2do Lapso" },
            { value: "3", name: "3er Lapso" },
          ],
        },
      ],
    },
    {
      value: "enrollment",
      name: "Matrícula",
      options: [
        {
          value: "year",
          name: "Año",
          options: [
            { value: "all", name: "Todos los años" },
            { value: "1", name: "Primer año" },
          ],
        },
      ],
    },
  ],
};

function renderReports(initialEntry = "/periodo/2025/reportes") {
  const loader = vi.fn(reportsLoader);
  const router = createMemoryRouter(
    [
      {
        id: "reports",
        path: "/periodo/:periodId/reportes",
        element: <Reports />,
        loader,
      },
    ],
    { initialEntries: [initialEntry] }
  );

  render(<RouterProvider router={router} />);
  return { loader, router };
}

function latestLoaderUrl(loader) {
  const lastCall = loader.mock.calls.at(-1);
  return lastCall ? new URL(lastCall[0].request.url) : null;
}

describe("Reports page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPeriodList.mockResolvedValue([{ id: "2025" }]);
    getReportOptionData.mockResolvedValue(reportOptionData);
    generateReport.mockResolvedValue(new Blob());
  });

  it("renders the selected report type and all of its configured options", async () => {
    renderReports();

    const reportType = await screen.findByLabelText("Tipo de reporte");
    const terms = screen.getByLabelText("Lapsos");

    expect(reportType).toHaveValue("grades");
    expect(
      within(reportType).getByRole("option", { name: "Matrícula" })
    ).toHaveValue("enrollment");
    expect(terms).toHaveValue("all");
    expect(within(terms).getAllByRole("option")).toHaveLength(4);
    expect(screen.getByLabelText("Nombre del archivo")).toHaveValue(
      "reporte-Boletín"
    );

    const students = screen.getByRole("group", { name: "Estudiantes" });
    expect(
      within(students).getByRole("list", {
        name: "Estudiantes seleccionados",
      })
    ).toHaveTextContent("Todos los estudiantes");
  });

  it("downloads the generated report as a DOCX file", async () => {
    const user = userEvent.setup();
    const reportFile = new Blob(["report"]);
    const createObjectURL = vi.fn(() => "blob:report");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    generateReport.mockResolvedValue(reportFile);
    renderReports("/periodo/2025/reportes?type=grades");

    const fileName = await screen.findByLabelText("Nombre del archivo");
    await user.clear(fileName);
    await user.type(fileName, "notas-del-grupo");

    await user.click(
      await screen.findByRole("button", { name: "Descargar reporte" })
    );

    expect(createObjectURL).toHaveBeenCalledWith(reportFile);
    expect(click).toHaveBeenCalledOnce();
    expect(click.mock.instances[0]).toMatchObject({
      download: "notas-del-grupo.docx",
      href: "blob:report",
    });
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:report");
  });

  it("resets the filename when the report type changes", async () => {
    const user = userEvent.setup();
    renderReports("/periodo/2025/reportes?type=grades");

    const fileName = await screen.findByLabelText("Nombre del archivo");
    await user.clear(fileName);
    await user.type(fileName, "nombre-personalizado");
    await user.selectOptions(
      screen.getByLabelText("Tipo de reporte"),
      "enrollment"
    );

    await screen.findByLabelText("Año");
    await waitFor(() =>
      expect(screen.getByLabelText("Nombre del archivo")).toHaveValue(
        "reporte-Matrícula"
      )
    );
  });
  it("submits configured options as query parameters", async () => {
    const user = userEvent.setup();
    const { loader } = renderReports(
      "/periodo/2025/reportes?type=grades&q=V-1%20OR%20E-2"
    );

    await user.selectOptions(await screen.findByLabelText("Lapsos"), "2");

    await waitFor(() => {
      const params = latestLoaderUrl(loader)?.searchParams;
      expect(Object.fromEntries(params)).toEqual({
        type: "grades",
        terms: "2",
        q: "V-1 OR E-2",
      });
    });
    expect(screen.getByLabelText("Lapsos")).toHaveValue("2");
  });

  it("changes report type while keeping only the student filter", async () => {
    const user = userEvent.setup();
    const { loader } = renderReports(
      "/periodo/2025/reportes?type=grades&terms=2&q=V-1%20OR%20E-2"
    );

    await user.selectOptions(
      await screen.findByLabelText("Tipo de reporte"),
      "enrollment"
    );

    await screen.findByLabelText("Año");
    const params = latestLoaderUrl(loader).searchParams;
    expect(Object.fromEntries(params)).toEqual({
      type: "enrollment",
      q: "V-1 OR E-2",
    });
    expect(screen.queryByLabelText("Lapsos")).not.toBeInTheDocument();
  });

  it("removes student IDs through the filter form", async () => {
    const user = userEvent.setup();
    const { loader } = renderReports(
      "/periodo/2025/reportes?type=grades&terms=1&q=V-1%20OR%20E-2%20OR%20V-3"
    );

    await user.click(
      await screen.findByRole("button", { name: "Quitar E-2" })
    );

    await waitFor(() => {
      const params = latestLoaderUrl(loader)?.searchParams;
      expect(params.get("terms")).toBe("1");
      expect(params.get("q")).toBe("V-1 OR V-3");
    });
    expect(
      screen.queryByRole("button", { name: "Quitar E-2" })
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Quitar V-1" }));
    await screen.findByRole("button", { name: "Quitar V-3" });
    await user.click(screen.getByRole("button", { name: "Quitar V-3" }));

    await waitFor(() =>
      expect(latestLoaderUrl(loader)?.searchParams.has("q")).toBe(false)
    );
    expect(screen.getByText("Todos los estudiantes")).toBeInTheDocument();
  });

  it("resolves the period and generates the selected report", async () => {
    renderReports(
      "/periodo/actual/reportes?type=enrollment&year=1&q=V-10%20OR%20E-20"
    );

    await screen.findByLabelText("Año");
    expect(generateReport).toHaveBeenCalledWith("2025", "enrollment", {
      q: "V-10 OR E-20",
      year: "1",
    });
  });

  it("shows an empty state without requesting a report file", async () => {
    getReportOptionData.mockResolvedValue({ reportTypes: [] });
    renderReports();

    expect(
      await screen.findByText("No hay tipos de reporte disponibles")
    ).toBeInTheDocument();
    expect(generateReport).not.toHaveBeenCalled();
  });
});
