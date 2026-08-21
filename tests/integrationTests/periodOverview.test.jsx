import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PeriodOverview, {
  periodOverviewLoader,
} from "../../src/routes/root/PeriodOverview";
import { getClassesByYear, getPeriodList, getYears } from "../../src/db";

vi.mock("../../src/db", () => ({
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
  1: ["1-A", "1-B"],
  2: ["2-A"],
  3: [],
};
const populatedStats = {
  students: { total: 40, passed: 30 },
  grades: { total: 60, loaded: 15 },
};

function renderOverview({
  entry = "/periodo/2025",
  stats = populatedStats,
} = {}) {
  const router = createMemoryRouter(
    [
      {
        id: "period",
        path: "/periodo/:periodId",
        element: <Outlet />,
        loader: ({ params }) => ({
          periodId: params.periodId === "actual" ? periods[0].id : params.periodId,
          data: { stats },
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
    { initialEntries: [entry] }
  );

  render(<RouterProvider router={router} />);
}

describe("PeriodOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPeriodList.mockResolvedValue(periods);
    getYears.mockResolvedValue(years);
    getClassesByYear.mockResolvedValue(classesByYear);
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

    const firstClass = await screen.findByText("1-A");
    expect(firstClass.closest("a")).toHaveAttribute(
      "href",
      "/periodo/2025/notas?year=1&class=1-A"
    );

    const emptyYear = screen.getByRole("button", { name: years[2].name });
    const emptyYearContent = emptyYear.parentElement.lastElementChild;
    expect(emptyYearContent).toHaveClass("max-h-0");

    await user.click(emptyYear);

    expect(emptyYearContent).toHaveClass("max-h-[2000px]");
    expect(
      within(emptyYearContent).getByText("Sin secciones registradas.")
    ).toBeInTheDocument();
  });
  it("renders button to archive period", async () => {
    renderOverview();

    expect(
      await screen.findByRole("button", { name: "Cerrar período" })
    ).toBeInTheDocument();
  })
});
