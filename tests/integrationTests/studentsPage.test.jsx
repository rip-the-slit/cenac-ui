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

import Students, {
  studentsLoader,
} from "../../src/routes/root/students/Students";
import StudentDetail, {
  studentDetailAction,
  studentDetailLoader,
} from "../../src/routes/root/students/StudentDetail";
import {
  getPeriodList,
  getStudentById,
  getStudents,
  updateStudent,
} from "../../src/db";

vi.mock("../../src/db", () => ({
  getPeriodList: vi.fn(),
  getStudentById: vi.fn(),
  getStudents: vi.fn(),
  updateStudent: vi.fn(),
}));

const studentFieldLabels = {
  id: "C.I.",
  firstName: "Nombres",
  lastName: "Apellidos",
  birthDate: "Fecha de nacimiento",
  birthPlace: "Lugar de nacimiento",
};

const studentsResponse = {
  recordsAmount: 40,
  years: [
    { id: "1", name: "Primer año" },
    { id: "2", name: "Segundo año" },
  ],
  classesByYear: { 1: ["1-A", "1-B"], 2: ["2-A"] },
  studentFieldLabels,
  rows: [
    {
      id: "V-1001",
      firstName: "Ana",
      lastName: "Pérez",
      birthDate: "2010-01-01",
      birthPlace: "Caracas",
      _class: { year: "1", id: "1-A" },
    },
    {
      id: "V-1002",
      firstName: "Luis",
      lastName: "Gómez",
      birthDate: "2010-02-02",
      birthPlace: "Valencia",
      _class: { year: "2", id: "2-A" },
    },
  ],
};

function renderStudents(initialEntry = "/periodo/2025/estudiantes") {
  const loader = vi.fn(studentsLoader);
  const detailLoader = vi.fn(studentDetailLoader);
  const router = createMemoryRouter(
    [
      {
        path: "/periodo/:periodId/estudiantes",
        element: <Students />,
        loader,
        children: [
          {
            path: ":studentId",
            element: <StudentDetail />,
            loader: detailLoader,
            action: studentDetailAction,
          },
        ],
      },
    ],
    { initialEntries: [initialEntry] }
  );

  render(<RouterProvider router={router} />);
  return { detailLoader, loader, router };
}

function latestLoaderUrl(loader) {
  const lastCall = loader.mock.calls.at(-1);
  return lastCall ? new URL(lastCall[0].request.url) : null;
}

function getSelectByOption(optionName) {
  return screen.getByRole("option", { name: optionName }).closest("select");
}

describe("Students page", () => {
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
    getStudents.mockResolvedValue(studentsResponse);
    getStudentById.mockImplementation(async (_periodId, studentId) => ({
      student:
        studentsResponse.rows.find((student) => student.id === studentId) ||
        studentsResponse.rows[0],
      studentFieldLabels,
    }));
    updateStudent.mockResolvedValue(undefined);
  });

  it("renders student headers, records, class names, and detail links", async () => {
    renderStudents();
    const table = await screen.findByRole("table");

    for (const header of [
      "Seleccionar todos",
      ...Object.values(studentFieldLabels),
      "Sección",
    ]) {
      expect(
        within(table).getByRole("columnheader", { name: header })
      ).toBeInTheDocument();
    }

    for (const student of studentsResponse.rows) {
      expect(
        within(table).getByRole("link", { name: student.id })
      ).toHaveAttribute(
        "href",
        "/periodo/2025/estudiantes/" + student.id
      );
      expect(within(table).getByText(student.firstName)).toBeInTheDocument();
      expect(within(table).getByText(student.lastName)).toBeInTheDocument();
    }
    expect(within(table).getByText("Primer año 1-A")).toBeInTheDocument();
    expect(within(table).getByText("Segundo año 2-A")).toBeInTheDocument();
  });

  it("submits all filters, resets pagination, and limits classes by year", async () => {
    const user = userEvent.setup();
    const { loader } = renderStudents(
      "/periodo/2025/estudiantes?page=2"
    );
    const idFilter = await screen.findByLabelText(studentFieldLabels.id);
    const firstNameFilter = screen.getByLabelText(studentFieldLabels.firstName);
    const lastNameFilter = screen.getByLabelText(studentFieldLabels.lastName);
    const birthDateFilter = screen.getByLabelText(studentFieldLabels.birthDate);
    const birthPlaceFilter = screen.getByLabelText(studentFieldLabels.birthPlace);
    const yearFilter = getSelectByOption("Todos los años");
    const classFilter = getSelectByOption("Todas las secciones");

    await user.selectOptions(yearFilter, "1");
    await waitFor(() => {
      const params = latestLoaderUrl(loader)?.searchParams;
      expect(params?.get("year")).toBe("1");
      expect(params?.get("page")).toBe("1");
    });
    expect(within(classFilter).queryByRole("option", { name: "2-A" })).toBeNull();

    await user.selectOptions(classFilter, "1-A");
    fireEvent.change(idFilter, { target: { value: "V-1001" } });
    fireEvent.change(firstNameFilter, { target: { value: "Ana" } });
    fireEvent.change(lastNameFilter, { target: { value: "Pérez" } });
    fireEvent.change(birthDateFilter, { target: { value: "2010-01-01" } });
    fireEvent.change(birthPlaceFilter, { target: { value: "Caracas" } });

    await waitFor(() => {
      const params = latestLoaderUrl(loader)?.searchParams;
      expect(Object.fromEntries(params)).toEqual({
        id: "V-1001",
        firstName: "Ana",
        lastName: "Pérez",
        birthDate: "2010-01-01",
        birthPlace: "Caracas",
        year: "1",
        class: "1-A",
        page: "1",
      });
    });
    expect(getStudents).toHaveBeenLastCalledWith(
      "2025",
      expect.objectContaining({
        birthDate: "2010-01-01",
        page: 1,
        limit: 20,
      })
    );
  });

  it("paginates, preserves filters, and clamps page input", async () => {
    const user = userEvent.setup();
    const { loader } = renderStudents(
      "/periodo/2025/estudiantes?firstName=Ana&page=1"
    );
    const pageInput = await screen.findByRole("textbox", { name: "Página" });
    const previous = screen.getByRole("button", { name: "Anterior" });
    const next = screen.getByRole("button", { name: "Siguiente" });

    expect(pageInput).toHaveValue("1");
    expect(previous).toBeDisabled();
    await user.click(next);
    await waitFor(() => {
      const params = latestLoaderUrl(loader)?.searchParams;
      expect(params?.get("firstName")).toBe("Ana");
      expect(params?.get("page")).toBe("2");
    });
    expect(pageInput).toHaveValue("2");
    expect(next).toBeDisabled();

    fireEvent.change(pageInput, { target: { value: "999" } });
    await waitFor(() =>
      expect(latestLoaderUrl(loader)?.searchParams.get("page")).toBe("2")
    );
    await user.click(previous);
    await waitFor(() =>
      expect(latestLoaderUrl(loader)?.searchParams.get("page")).toBe("1")
    );
  });

  it("selects records and renders caller-owned bulk action metadata", async () => {
    const user = userEvent.setup();
    renderStudents();
    const selectAll = await screen.findByRole("checkbox", {
      name: "Seleccionar todos",
    });
    const rowCheckboxes = within(screen.getAllByRole("rowgroup").at(-1))
      .getAllByRole("checkbox");
    const bulkActions = screen.getByRole("combobox", {
      name: "Acciones masivas",
    });
    const apply = screen.getByRole("button", { name: "Aplicar" });

    expect(bulkActions).toHaveAttribute("id", "students-bulk-action");
    expect(bulkActions).toHaveAttribute("name", "students-bulk-action");
    expect(within(bulkActions).getAllByRole("option")).toHaveLength(2);

    await user.click(rowCheckboxes[0]);
    expect(within(apply).getByText("1")).toBeInTheDocument();
    await user.click(selectAll);
    expect(rowCheckboxes.every((checkbox) => checkbox.checked)).toBe(true);
    expect(within(apply).getByText("Todos")).toBeInTheDocument();
    await user.click(selectAll);
    expect(rowCheckboxes.every((checkbox) => !checkbox.checked)).toBe(true);
    expect(within(apply).getByText("Ninguno")).toBeInTheDocument();
  });

  it("navigates through and back from the nested student detail outlet", async () => {
    const user = userEvent.setup();
    renderStudents();
    const studentLink = await screen.findByRole("link", { name: "V-1001" });

    await user.click(studentLink);
    expect(
      await screen.findByRole("heading", { name: "Detalle del Estudiante" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aplicar" })).toBeNull();

    await user.click(screen.getByRole("link", { name: "Regresar" }));
    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aplicar" })).toBeInTheDocument();
  });

  it("renders the detail outlet from a direct nested URL", async () => {
    renderStudents("/periodo/2025/estudiantes/V-1002");

    expect(
      await screen.findByRole("heading", { name: "Detalle del Estudiante" })
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("Luis")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
