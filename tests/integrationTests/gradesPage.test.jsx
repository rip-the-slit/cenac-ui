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
  years: [
    { id: "1", name: "Primer año" },
    { id: "2", name: "Segundo año" },
  ],
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
    getPeriodList.mockResolvedValue(["2025"]);
    getGrades.mockResolvedValue(gradesResponse);
    loadGrades.mockResolvedValue(undefined);
  });

  it("renders the grades table headers and the supplied records", async () => {
    renderGrades();

    const table = await screen.findByRole("table");
    const expectedHeaders = [
      "C.I.",
      "Nombre Completo",
      "Sección",
      "Estatus",
      "Areas de Formación",
      ...gradesResponse.subjects.map((subject) => subject.abbr || subject.name),
      "Nota Final"
    ];

    for (const header of expectedHeaders) {
      expect(
        within(table).getByRole("columnheader", { name: header })
      ).toBeInTheDocument();
    }

    for (const record of gradesResponse.rows) {
      const row = within(getRecordRow(record.id));
      const expectedGrades = Object.values(record.subjectAverages).map((grade) =>
        grade.toFixed(1)
      )
      const expectedValues = [
        record.id,
        record.fullName,
        record.class,
        record.status,
        ...expectedGrades,
        (expectedGrades.reduce((sum, grade) => sum + parseFloat(grade), 0) / expectedGrades.length).toFixed(1)
      ];

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
      screen.getByRole("columnheader", { name:
        "Nota Final"
       })
    ).toBeInTheDocument();

    const expectedGrades = record.subjectDetails[subject.id].terms
      .flat()
      .map((grade) => grade.toFixed(1));
    expectedGrades.push(record.subjectAverages[subject.id].toFixed(1))
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
    expect(classFilter).toHaveValue(selectedClass)

    await user.selectOptions(statusFilter, selectedStatus);
    await waitFor(() =>
      expect(latestLoaderUrl(loader)?.searchParams.get("status")).toBe(
        selectedStatus
      )
    );
    expect(statusFilter).toHaveValue(selectedStatus)

    await user.selectOptions(subjectFilter, selectedSubject);
    await waitFor(() => {
      expect(latestLoaderUrl(loader)?.searchParams?.get("expanded")).toBe(
        selectedSubject
      );
    });
    expect(subjectFilter).toHaveValue(selectedSubject)

    fireEvent.change(searchFilter, { target: { value: searchQuery } });
    await waitFor(() => {
      const params = latestLoaderUrl(loader)?.searchParams;
      expect(params?.get("q")).toBe(searchQuery);
      expect(params?.get("year")).toBe(selectedYear);
      expect(params?.get("class")).toBe(selectedClass);
      expect(params?.get("status")).toBe(selectedStatus);
      expect(params?.get("expanded")).toBe(selectedSubject);
    });
    expect(searchFilter).toHaveValue(searchQuery)
  });
});
