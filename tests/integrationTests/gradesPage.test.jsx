import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Grades, {
  gradesAction,
  gradesLoader,
} from "../../src/routes/root/grades/Grades";
import { getGrades, getPeriodList, loadGrades } from "../../src/db";

const TERM_COUNT = 3;
const GRADE_SLOTS_PER_TERM = 4;

vi.mock("../../src/db", () => ({
  getGrades: vi.fn(),
  getPeriodList: vi.fn(),
  loadGrades: vi.fn(),
}));

const gradesResponse = {
  recordsAmount: 40,
  years: [
    { id: "1", name: "Primer año" },
    { id: "2", name: "Segundo año" },
  ],
  subjectsByYear: { 1: ["math"], 2: ["math", "language"] },
  classesByYear: { 1: ["1-A", "1-B"], 2: ["2-A"] },
  statuses: ["Activo", "Retirado"],
  subjects: [
    { id: "math", name: "Matemática", abbr: "MAT" },
    { id: "language", name: "Castellano", abbr: "CAS" },
  ],
  rows: [
    {
      id: "V-1001",
      fullName: "Ana Pérez",
      class: "1-A",
      status: "Activo",
      subjectAverages: { math: 15.5, language: 17 },
      subjectDetails: {
        math: {
          terms: [
            [10, 11, 12, 13],
            [14, 15, 16, 17],
            [18, 19, 20, 9],
          ],
        },
        language: {
          terms: [
            [11, 12, 13, 14],
            [15, 16, 17, 18],
            [19, 20, 10, 11],
          ],
        },
      },
    },
    {
      id: "V-1002",
      fullName: "Luis Gómez",
      class: "1-B",
      status: "Retirado",
      subjectAverages: { math: 12, language: 13.5 },
      subjectDetails: {
        math: {
          terms: [
            [8, 9, 10, 11],
            [12, 13, 14, 15],
            [16, 17, 18, 19],
          ],
        },
      },
    },
  ],
};

function renderGrades(initialEntry = "/periodo/2025/notas") {
  const loader = vi.fn(gradesLoader);
  const router = createMemoryRouter(
    [
      {
        path: "/periodo/:periodId/notas",
        element: <Grades />,
        loader,
        action: gradesAction,
      },
    ],
    { initialEntries: [initialEntry] }
  );

  render(<RouterProvider router={router} />);
  return { loader };
}

function latestLoaderUrl(loader) {
  const lastCall = loader.mock.calls.at(-1);
  return lastCall ? new URL(lastCall[0].request.url) : null;
}

function getRecordRow(id) {
  return screen.getByText(id, { selector: "td" }).closest("tr");
}

function getSelectByOption(optionName) {
  return screen.getByRole("option", { name: optionName }).closest("select");
}

async function expandSubject(id) {
  const subject = gradesResponse.subjects.find(
    (candidate) => candidate.id === id
  );
  if (!subject) throw new Error(`Unknown subject: ${id}`);

  const collapsedName = subject.abbr || subject.name;
  await screen.findByRole("button", { name: collapsedName });
  await userEvent.click(screen.getByRole("button", { name: collapsedName }));
  await screen.findByRole("button", { name: subject.name });
}

describe("Grades page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPeriodList.mockResolvedValue([
      {
        id: "2025",
        status: "loaded",
        startYear: 2024,
        endYear: 2025,
        openingDate: "2024-09-01",
        closingDate: "2025-07-31",
      },
    ]);
    getGrades.mockResolvedValue(gradesResponse);
    loadGrades.mockResolvedValue(undefined);
  });

  it("renders the grades table headers and the supplied records", async () => {
    renderGrades();

    const table = await screen.findByRole("table");
    const expectedHeaders = [
      "Seleccionar todos",
      "C.I.",
      "Nombre Completo",
      "Sección",
      "Estatus",
      "Areas de Formación",
      ...gradesResponse.subjects.map((subject) => subject.abbr || subject.name),
      "Nota Final",
    ];

    for (const header of expectedHeaders) {
      expect(
        within(table).getByRole("columnheader", { name: header })
      ).toBeInTheDocument();
    }

    for (const record of gradesResponse.rows) {
      const row = within(getRecordRow(record.id));
      const expectedGrades = Object.values(record.subjectAverages).map(
        (grade) => grade.toFixed(1)
      );
      const expectedValues = [
        record.id,
        record.fullName,
        record.class,
        record.status,
        ...expectedGrades,
        (
          expectedGrades.reduce((sum, grade) => sum + parseFloat(grade), 0) /
          expectedGrades.length
        ).toFixed(1),
      ];

      expect(row.getByRole("checkbox")).toBeInTheDocument();

      for (const value of expectedValues) {
        expect(row.getByText(value, { exact: true })).toBeInTheDocument();
      }
    }
  });

  it("opens a subject detail view and shows its grades for every term", async () => {
    renderGrades();
    const subject = gradesResponse.subjects[0];
    const record = gradesResponse.rows[0];
    await expandSubject(subject.id);

    for (let term = 1; term <= TERM_COUNT; term++) {
      expect(
        screen.getByRole("columnheader", { name: `L${term}` })
      ).toBeInTheDocument();
    }
    for (const collapsedSubject of gradesResponse.subjects.filter(
      (candidate) => candidate.id !== subject.id
    )) {
      expect(
        screen.queryByRole("button", {
          name: collapsedSubject.abbr || collapsedSubject.name,
        })
      ).not.toBeInTheDocument();
    }

    expect(
      screen.getByRole("columnheader", { name: "Nota Final" })
    ).toBeInTheDocument();

    const expectedGrades = record.subjectDetails[subject.id].terms
      .flat()
      .map((grade) => grade.toFixed(1));
    expectedGrades.push(record.subjectAverages[subject.id].toFixed(1));
    const cells = within(getRecordRow(record.id))
      .getAllByRole("cell")
      .map((cell) => cell.textContent);

    expect(cells.slice(-expectedGrades.length)).toEqual(expectedGrades);
  });

  it("closes subject detail view", async () => {
    renderGrades();
    const subject = gradesResponse.subjects[0];
    await expandSubject(subject.id);

    const table = screen.getByRole("table");
    const backButton = screen.getByRole("button", { name: "Volver" });
    await userEvent.click(backButton);

    await waitFor(() => {
      expect(
        within(table).queryByRole("button", {
          name: subject.name,
        })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Editar" })
      ).not.toBeInTheDocument();
    });
  });

  it("offers editing only in a subject detail view and turns grades into inputs", async () => {
    renderGrades();
    const subject = gradesResponse.subjects[0];
    const record = gradesResponse.rows[0];

    await screen.findByRole("button", {
      name: subject.abbr || subject.name,
    });
    expect(
      screen.queryByRole("button", { name: "Editar" })
    ).not.toBeInTheDocument();

    await expandSubject(subject.id);
    await userEvent.click(screen.getByRole("button", { name: "Editar" }));

    expect(
      screen.getByRole("button", { name: "Guardar edición" })
    ).toBeInTheDocument();
    expect(screen.getAllByRole("spinbutton")).toHaveLength(
      gradesResponse.rows.length * TERM_COUNT * GRADE_SLOTS_PER_TERM
    );

    const gradeInputs = within(getRecordRow(record.id)).getAllByRole(
      "spinbutton"
    );
    expect(gradeInputs[0]).toHaveAttribute(
      "name",
      `grade::${record.id}::${subject.id}::0::0`
    );
  });

  it("renders the filter controls and includes their values in loader URL params", async () => {
    const user = userEvent.setup();
    const { loader } = renderGrades();

    const searchFilter = await screen.findByPlaceholderText(
      "Buscar cédula o nombre"
    );
    const yearFilter = getSelectByOption("Todos los años");
    const classFilter = getSelectByOption("Todas las secciones");
    const statusFilter = getSelectByOption("Todos los estatus");
    const subjectFilter = getSelectByOption("Todas las materias");

    const selectedYear = gradesResponse.years[0].id;
    const selectedClass = gradesResponse.classesByYear[selectedYear][0];
    const selectedStatus = gradesResponse.statuses[0];
    const selectedSubject = gradesResponse.subjects[0].id;
    const searchQuery = gradesResponse.rows[0].fullName.split(" ")[0];

    expect(searchFilter).toBeInTheDocument();
    expect(yearFilter).toBeInTheDocument();
    expect(classFilter).toBeInTheDocument();
    expect(statusFilter).toBeInTheDocument();
    expect(subjectFilter).toBeInTheDocument();

    await user.selectOptions(yearFilter, selectedYear);
    await waitFor(() =>
      expect(latestLoaderUrl(loader)?.searchParams.get("year")).toBe(
        selectedYear
      )
    );
    expect(yearFilter).toHaveValue(selectedYear);

    await user.selectOptions(classFilter, selectedClass);
    await waitFor(() => {
      expect(latestLoaderUrl(loader)?.searchParams?.get("class")).toBe(
        selectedClass
      );
    });
    expect(classFilter).toHaveValue(selectedClass);

    await user.selectOptions(statusFilter, selectedStatus);
    await waitFor(() =>
      expect(latestLoaderUrl(loader)?.searchParams.get("status")).toBe(
        selectedStatus
      )
    );
    expect(statusFilter).toHaveValue(selectedStatus);

    await user.selectOptions(subjectFilter, selectedSubject);
    await waitFor(() => {
      expect(latestLoaderUrl(loader)?.searchParams?.get("expanded")).toBe(
        selectedSubject
      );
    });
    expect(subjectFilter).toHaveValue(selectedSubject);

    fireEvent.change(searchFilter, { target: { value: searchQuery } });
    await waitFor(() => {
      const params = latestLoaderUrl(loader)?.searchParams;
      expect(params?.get("q")).toBe(searchQuery);
      expect(params?.get("year")).toBe(selectedYear);
      expect(params?.get("class")).toBe(selectedClass);
      expect(params?.get("status")).toBe(selectedStatus);
      expect(params?.get("expanded")).toBe(selectedSubject);
    });
    expect(searchFilter).toHaveValue(searchQuery);
  });
  it("only displays subjects taught in selected year filter", async () => {
    const user = userEvent.setup();
    renderGrades();

    const yearFilter = (
      await screen.findByRole("option", { name: "Todos los años" })
    ).closest("select");
    const selectedYear = gradesResponse.years[0].id;
    const taughtSubjectIds = gradesResponse.subjectsByYear[selectedYear];

    await user.selectOptions(yearFilter, selectedYear);

    await waitFor(() => {
      for (const subject of gradesResponse.subjects) {
        const header = screen.queryByRole("columnheader", {
          name: subject.abbr,
        });

        if (taughtSubjectIds.includes(subject.id)) {
          expect(header).toBeInTheDocument();
        } else {
          expect(header).not.toBeInTheDocument();
        }
      }
    });
  });

  it("disables grade inputs for subjects not taught in the student year", async () => {
    const user = userEvent.setup();
    renderGrades();
    const subject = gradesResponse.subjects[1];

    await expandSubject(subject.id);
    await user.click(screen.getByRole("button", { name: "Editar" }));

    const gradeInputs = screen.getAllByRole("spinbutton");
    expect(
      gradeInputs.length
    ).toBe(
      gradesResponse.rows.reduce(
        (total, r) => total + (r.subjectDetails[subject.id] ? 1 : 0),
        0
      ) * TERM_COUNT * GRADE_SLOTS_PER_TERM
    );
  });
  it("renders pagination input", async () => {
    const user = userEvent.setup();
    const { loader } = renderGrades();

    const paginationInput = await screen.findByRole("textbox", {
      name: "Página",
    });
    const previousPageButton = screen.getByRole("button", { name: "Anterior" });
    const nextPageButton = screen.getByRole("button", { name: "Siguiente" });

    expect(paginationInput).toBeInTheDocument();
    expect(paginationInput).toHaveValue("1");
    expect(previousPageButton).toBeDisabled();
    expect(nextPageButton).toBeInTheDocument();

    expect(latestLoaderUrl(loader)?.searchParams.get("page") || "1").toBe("1");

    await user.click(nextPageButton);
    await waitFor(() => {
      expect(latestLoaderUrl(loader)?.searchParams.get("page")).toBe("2");
    });
    expect(paginationInput).toHaveValue("2");

    await user.click(previousPageButton);
    await waitFor(() => {
      expect(latestLoaderUrl(loader)?.searchParams.get("page")).toBe("1");
    });
    expect(paginationInput).toHaveValue("1");

    await user.click(previousPageButton);
    await waitFor(() => {
      expect(latestLoaderUrl(loader)?.searchParams.get("page")).toBe("1");
    });
    expect(paginationInput).toHaveValue("1");

    fireEvent.change(paginationInput, { target: { value: "999" } });
    await waitFor(() => {
      expect(latestLoaderUrl(loader)?.searchParams.get("page")).toBe("2");
    });
    expect(paginationInput).toHaveValue("2");
    expect(nextPageButton).toBeDisabled();
  });
  it("selects and deselects records", async () => {
    const user = userEvent.setup();
    renderGrades();
    const selectAllInput = await screen.findByRole("checkbox", {
      name: "Seleccionar todos",
    });
    const rowGroups = screen.getAllByRole("rowgroup");
    const selectInputs = within(rowGroups.at(-1)).getAllByRole("checkbox");
    const bulkActionCombobox = screen.getByRole("combobox", {
      name: "Acciones masivas",
    });
    const applyButton = screen.getByRole("button", { name: "Aplicar" });

    expect(selectAllInput).toBeInTheDocument();
    expect(selectInputs).toHaveLength(gradesResponse.rows.length);
    expect(bulkActionCombobox).toBeInTheDocument();
    expect(applyButton).toBeInTheDocument();

    await user.click(selectInputs[0]);
    await user.click(selectInputs[1]);
    await waitFor(() => {
      expect(selectInputs[0].checked).toBe(true);
      expect(selectInputs[1].checked).toBe(true);
      expect(within(applyButton).getByText("2")).toBeInTheDocument();
    });

    await user.click(selectAllInput);
    await waitFor(() => {
      expect(selectInputs.every((input) => input.checked)).toBe(true);
      expect(within(applyButton).getByText("Todos")).toBeInTheDocument();
    });

    await user.click(selectAllInput);
    await waitFor(() => {
      expect(selectInputs.every((input) => !input.checked)).toBe(true);
      expect(within(applyButton).getByText("Ninguno")).toBeInTheDocument();
    });
  });
});
