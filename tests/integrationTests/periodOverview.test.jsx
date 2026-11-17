import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PeriodOverview, {
  periodOverviewLoader,
  periodOverviewAction,
} from "../../src/routes/root/PeriodOverview";
import { archivePeriod, getClassesByYear, getPeriodList, getYears } from "../../src/db";
import { ErrorDialogProvider } from "../../src/context/ErrorDialogContext";

vi.mock("../../src/db", () => ({
  archivePeriod: vi.fn(),
  getClassesByYear: vi.fn(),
  getPeriodList: vi.fn(),
  getYears: vi.fn(),
}));

const periods = [{ id: "2025" }, { id: "2024" }];
const years = [
  { id: "1", name: "Primer año" },
  { id: "2", name: "Segundo año" },
  { id: "3", name: "Tercer año" },
];
const classesByYear = {
  1: [
    { id: 1, name: "A", studentCount: 1, yearPeriodId: 1, yearId: 1, periodId: "2025" },
    { id: 2, name: "B", studentCount: 30, yearPeriodId: 1, yearId: 1, periodId: "2025" },
  ],
  2: [{ id: 3, name: "A", studentCount: 0, yearPeriodId: 2, yearId: 2, periodId: "2025" }],
  3: [],
};
const populatedStats = {
  students: { total: 40, passed: 30 },
  grades: { total: 60, loaded: 15 },
};

function renderOverview({
  entry = "/periodo/2025",
  stats = populatedStats,
  userLevel = "Administrador",
} = {}) {
  const router = createMemoryRouter(
    [
      {
        id: "auth",
        path: "/",
        loader: () => ({ activeUser: { userLevel } }),
        element: <Outlet />,
        children: [
          {
            id: "period",
            path: "periodo/:periodId",
            element: <Outlet />,
            loader: ({ params }) => ({
              periodId: params.periodId === "actual" ? periods[0].id : params.periodId,
              data: {
                stats,
                status: params.periodId === "all" ? "archived" : "active",
              },
            }),
            children: [
              {
                index: true,
                element: <PeriodOverview />,
                loader: periodOverviewLoader,
              },
            ],
          },
        ],
      },
    ],
    { initialEntries: [entry] }
  );

  render(
    <ErrorDialogProvider>
      <RouterProvider router={router} />
    </ErrorDialogProvider>
  );
}

describe("PeriodOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPeriodList.mockResolvedValue(periods);
    getYears.mockResolvedValue(years);
    getClassesByYear.mockResolvedValue(classesByYear);
  });

  it.each([true, false])("confirms period archiving (accepted: %s)", async (accepted) => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(accepted);
    archivePeriod.mockResolvedValue({ id: "2026" });
    const result = await periodOverviewAction({
      params: { periodId: "2025" },
      request: new Request("http://localhost/periodo/2025", { method: "POST", body: new URLSearchParams({ action: "archive" }) }),
    });
    expect(confirm).toHaveBeenCalledOnce();
    if (accepted) {
      expect(archivePeriod).toHaveBeenCalledWith("2025", true);
      expect(result.headers.get("Location")).toBe("/periodo/2026");
    } else {
      expect(archivePeriod).not.toHaveBeenCalled();
      expect(result).toBeNull();
    }
    confirm.mockRestore();
  });

  it("loads data for an explicit period", async () => {
    await expect(periodOverviewLoader({ params: { periodId: "2024" } })).resolves.toEqual({
      years,
      classesByYear,
    });

    expect(getClassesByYear).toHaveBeenCalledWith("2024");
  });

  it("resolves the actual period before loading its data", async () => {
    await periodOverviewLoader({ params: { periodId: "actual" } });

    expect(getPeriodList).toHaveBeenCalledOnce();
    expect(getYears).toHaveBeenCalledOnce();
    expect(getClassesByYear).toHaveBeenCalledWith("2025");
  });

  it("renders the period summary and progress indicators", async () => {
    renderOverview();

    expect(await screen.findByRole("heading", { name: "Período 2025" })).toBeInTheDocument();
    expect(screen.getByText(/30 de 40 estudiantes/)).toHaveTextContent("75.0%");
    expect(screen.getByText("75.0%")).toBeInTheDocument();
    expect(screen.getByText(/15 de 60 registros/)).toBeInTheDocument();
    expect(screen.getByText("25.0%")).toBeInTheDocument();

    const gradesCard = screen
      .getByRole("heading", { name: "Notas Cargadas" })
      .closest("article");
    expect(gradesCard.querySelector("[style]")).toHaveStyle({ width: "25%" });
  });

  it("uses zero values when parent statistics are absent", async () => {
    renderOverview({ stats: null });

    await screen.findByRole("heading", { name: "Período 2025" });
    expect(screen.getByText(/0 de 0 estudiantes/)).toHaveTextContent("0.0%");
    expect(screen.getByText(/0 de 0 registros/)).toBeInTheDocument();

    const gradesCard = screen
      .getByRole("heading", { name: "Notas Cargadas" })
      .closest("article");
    expect(gradesCard.querySelector("[style]")).toHaveStyle({ width: "0%" });
  });

  it("renders the all-period summary without period-specific controls", async () => {
    renderOverview({ entry: "/periodo/all" });

    expect(
      await screen.findByRole("heading", { name: "Todos los Períodos" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cerrar período" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Secciones por Año" })
    ).not.toBeInTheDocument();
  });

  it("expands years, renders empty states, and links classes to filtered grades", async () => {
    const user = userEvent.setup();
    renderOverview();

    const firstClass = await screen.findByRole("link", { name: "Sección A, estudiantes: 1" });
    expect(firstClass).toHaveAttribute(
      "href",
      "/periodo/2025/notas?year=1&class=A"
    );
    const dots = firstClass.querySelector('div[aria-hidden="true"]');
    expect(dots.children).toHaveLength(30);

    const emptyYear = screen.getByRole("button", { name: years[2].name });
    const emptyYearContent = emptyYear.parentElement.lastElementChild;
    expect(emptyYearContent).toHaveClass("max-h-0");

    await user.click(emptyYear);

    expect(
      within(emptyYearContent).getByText("Sin secciones registradas.")
    ).toBeInTheDocument();
  });
  it("hides period closure from users without a permitted role", async () => {
    renderOverview({ userLevel: "Docente" });

    await screen.findByRole("heading", { name: "Período 2025" });
    expect(
      screen.queryByRole("button", { name: "Cerrar período" })
    ).not.toBeInTheDocument();
  });

  it("renders button to archive period", async () => {
    renderOverview();

    expect(
      await screen.findByRole("button", { name: "Cerrar período" })
    ).toBeInTheDocument();
  })
});
