import { fieldDefinitions } from "../fieldFixtures";
import {
  fireEvent,
  act,
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
  studentDetailLoader,
} from "../../src/routes/root/students/StudentDetail";
import {
  getGrades,
  getPlaces,
  editStudent,
  getPeriodList,
  getStudentById,
  getStudents,
} from "../../src/db";
import { ErrorDialogProvider } from "../../src/context/ErrorDialogContext";

vi.mock("../../src/db", () => ({
  getGrades: vi.fn(),
  getPlaces: vi.fn(),
  editStudent: vi.fn(),
  getPeriodList: vi.fn(),
  getStudentById: vi.fn(),
  getStudents: vi.fn(),
}));

const studentFieldLabels = {
  id: "C.I.",
  firstName: "Nombres",
  lastName: "Apellidos",
  birthDate: "Fecha de nacimiento",
  birthPlace: "Lugar de nacimiento",
  status: "Estatus del Periodo",
  class: "Sección",
  guardians: "Representantes",
};

const studentsResponse = {
  recordsAmount: 40,
  statuses: [
    { value: "pending", name: "Pendiente" },
    { value: "passed", name: "Aprobado" },
    { value: "failed", name: "Reprobado" },
  ],
  years: [
    { id: "1", name: "Primer año" },
    { id: "2", name: "Segundo año" },
  ],
  classesByYear: { 1: ["1-A", "1-B"], 2: ["2-A"] },
  fields: fieldDefinitions(studentFieldLabels),
  rows: [
    {
      id: "V-1001",
      firstName: "Ana",
      lastName: "Pérez",
      birthDate: "2010-01-01",
      birthPlace: "Caracas",
      status: "pending",
      _class: { year: "1", id: "1-A" },
      assignedGuardians: [
        { id: "V-9001", firstName: "María", lastName: "Rojas" },
      ],
    },
    {
      id: "V-1002",
      firstName: "Luis",
      lastName: "Gómez",
      birthDate: "2010-02-02",
      birthPlace: "Valencia",
      status: "passed",
      _class: { year: "2", id: "2-A" },
      assignedGuardians: [],
    },
  ],
};
const editorFields = fieldDefinitions({
  id: studentFieldLabels.id,
  firstName: studentFieldLabels.firstName,
  lastName: studentFieldLabels.lastName,
  birthDate: studentFieldLabels.birthDate,
  birthPlace: studentFieldLabels.birthPlace,
});
const detailFields = { student: editorFields, guardian: fieldDefinitions({
  id: "Cédula", firstName: "Nombres", lastName: "Apellidos", legalRole: "Rol Legal",
}) };

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
          },
        ],
      },
    ],
    { initialEntries: [initialEntry] }
  );

  render(
    <ErrorDialogProvider>
      <RouterProvider router={router} />
    </ErrorDialogProvider>
  );
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
    getGrades.mockResolvedValue({ recordsAmount: 0, rows: [], subjects: [] });
    getPlaces.mockResolvedValue({ rows: [] });
    getStudentById.mockImplementation(async (_periodId, studentId) => ({
      student:
        studentsResponse.rows.find((student) => student.id === studentId) ||
        studentsResponse.rows[0],
      fields: detailFields,
    }));
  });

  it("renders student headers, records, class names, and detail links", async () => {
    renderStudents();
    const table = await screen.findByRole("table");

    for (const header of [
      "Seleccionar todos",
      ...Object.values(studentFieldLabels),
    ]) {
      expect(
        within(table).getByRole("columnheader", { name: header })
      ).toBeInTheDocument();
    }

    for (const student of studentsResponse.rows) {
      expect(
        within(table).getByRole("link", { name: student.id })
      ).toHaveAttribute("href", "/periodo/2025/estudiantes/" + student.id);
      expect(within(table).getByText(student.firstName)).toBeInTheDocument();
      expect(within(table).getByText(student.lastName)).toBeInTheDocument();
      expect(
        within(table).getByText(
          studentsResponse.statuses.find(
            (status) => status.value === student.status
          ).name
        )
      ).toBeInTheDocument();
    }
    expect(within(table).getByText("Primer año Sección 1-A")).toBeInTheDocument();
    expect(within(table).getByText("Segundo año Sección 2-A")).toBeInTheDocument();
    expect(within(table).getByRole("link", { name: "María Rojas" })).toHaveAttribute(
      "href",
      "/periodo/2025/representantes/V-9001"
    );
  });

  it("shows an empty message across the student table", async () => {
    getStudents.mockResolvedValue({ ...studentsResponse, rows: [], recordsAmount: 0 });
    renderStudents();
    const message = await screen.findByRole("cell", { name: "No hay registros para mostrar." });
    expect(message).toHaveAttribute("colspan", "9");
  });

  it("submits all filters, resets pagination, and limits classes by year", async () => {
    const user = userEvent.setup();
    const { loader } = renderStudents("/periodo/2025/estudiantes?page=2");
    const idFilter = await screen.findByLabelText(studentFieldLabels.id);
    const firstNameFilter = screen.getByLabelText(studentFieldLabels.firstName);
    const lastNameFilter = screen.getByLabelText(studentFieldLabels.lastName);
    const birthDateFilter = screen.getByLabelText(studentFieldLabels.birthDate);
    const birthPlaceFilter = screen.getByLabelText(
      studentFieldLabels.birthPlace
    );
    const guardianFilter = screen.getByLabelText("Representantes");
    const yearFilter = getSelectByOption("Todos los años");
    const classFilter = getSelectByOption("Todas las secciones");
    const statusFilter = getSelectByOption("Todos los estatus");

    await user.selectOptions(yearFilter, "1");
    await waitFor(() => {
      const params = latestLoaderUrl(loader)?.searchParams;
      expect(params?.get("year")).toBe("1");
      expect(params?.get("page")).toBe("1");
    });
    expect(
      within(classFilter).queryByRole("option", { name: "2-A" })
    ).toBeNull();

    await user.selectOptions(classFilter, "1-A");
    fireEvent.change(idFilter, { target: { value: "V-1001" } });
    fireEvent.change(firstNameFilter, { target: { value: "Ana" } });
    fireEvent.change(lastNameFilter, { target: { value: "Pérez" } });
    fireEvent.change(birthDateFilter, { target: { value: "2010-01-01" } });
    fireEvent.change(birthPlaceFilter, { target: { value: "Caracas" } });
    fireEvent.change(guardianFilter, { target: { value: "María" } });
    const selectedStatus = studentsResponse.statuses[1];
    expect(
      within(statusFilter).getByRole("option", { name: selectedStatus.name })
    ).toHaveValue(selectedStatus.value);
    fireEvent.change(statusFilter, { target: { value: selectedStatus.value } });

    await waitFor(() => {
      const params = latestLoaderUrl(loader)?.searchParams;
      expect(Object.fromEntries(params)).toEqual({
        id: "V-1001",
        firstName: "Ana",
        lastName: "Pérez",
        birthDate: "2010-01-01",
        birthPlace: "Caracas",
        guardianQ: "María",
        year: "1",
        class: "1-A",
        status: selectedStatus.value,
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
    const rowCheckboxes = within(
      screen.getAllByRole("rowgroup").at(-1)
    ).getAllByRole("checkbox");
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

    await user.click(screen.getByRole("link", { name: "Volver a la lista de estudiantes" }));
    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aplicar" })).toBeInTheDocument();
  });

  it("shows relationship links and paginated, expandable all-period academic history", async () => {
    const user = userEvent.setup();
    const row = {
      id: "V-1001", fullName: "Ana Pérez", yearId: "1", className: "A",
      status: "passed", subjectAverages: { math: 15 },
      subjectDetails: { math: { terms: [[10], [15], [20], [16]] } },
    };
    getGrades.mockResolvedValue({
      recordsAmount: 40, years: studentsResponse.years, statuses: studentsResponse.statuses,
      fields: fieldDefinitions({ id: "Documento", fullName: "Estudiante", class: "Sección", period: "Periodo", status: "Estatus" }),
      subjects: [{ id: "math", name: "Matemática", abbr: "MAT" }],
      rows: [{ ...row, period: "2023 - 2024" }, { ...row, period: "2024 - 2025" }],
    });
    renderStudents("/periodo/2025/estudiantes/V-1001");
    await screen.findByRole("heading", { name: "Record Académico" });
    expect(getGrades).toHaveBeenCalledWith("all", "", "", "", "V-1001", 1, 20);
    expect(screen.getByRole("link", { name: "María Rojas" })).toHaveAttribute("href", "/periodo/2025/representantes/V-9001");
    expect(screen.getByText("2023 - 2024")).toBeInTheDocument();
    expect(screen.getByText("2024 - 2025")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "MAT" }));
    await screen.findByText("L1");
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await waitFor(() => expect(getGrades).toHaveBeenLastCalledWith("all", "", "", "", "V-1001", 2, 20));
    expect(screen.getByText("L1")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Volver" }));
    await screen.findByRole("button", { name: "MAT" });
    expect(screen.queryByText("L1")).not.toBeInTheDocument();
  });

  it("renders the detail outlet from a direct nested URL", async () => {
    renderStudents("/periodo/2025/estudiantes/V-1002");

    expect(
      await screen.findByRole("heading", { name: "Detalle del Estudiante" })
    ).toBeInTheDocument();
    expect(screen.getByText("Luis")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("edits student information with cédula and enrollment disabled and refreshes the detail", async () => {
    const user = userEvent.setup();
    const original = studentsResponse.rows[0];
    getStudentById.mockResolvedValue({ student: { ...original, _locked: true }, fields: detailFields });
    let finishSaving;
    editStudent.mockImplementation(() => new Promise((resolve) => {
      finishSaving = () => {
        getStudentById.mockResolvedValue({ student: { ...original, firstName: "Ana María" }, fields: detailFields });
        resolve();
      };
    }));
    renderStudents("/periodo/2025/estudiantes/V-1001");
    await user.click(await screen.findByRole("button", { name: "Editar estudiante" }));
    const editor = within(await screen.findByRole("dialog", { name: "Editar estudiante Ana Pérez" }));
    expect(editor.getByRole("textbox", { name: "C.I." })).toBeDisabled();
    expect(editor.getByRole("combobox", { name: "C.I.: tipo" })).toBeDisabled();
    expect(editor.getByRole("button", { name: /^Inscripción/ })).toBeDisabled();
    const name = editor.getByRole("textbox", { name: "Nombres" });
    expect(name).toBeEnabled();
    await user.clear(name);
    await user.type(name, "Ana María");
    await user.click(editor.getByRole("button", { name: "Aceptar" }));
    expect(editor.getByRole("button", { name: "Guardando..." })).toBeDisabled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await act(async () => finishSaving());
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("Ana María")).toBeInTheDocument();
    expect(editStudent).toHaveBeenCalledWith(original.id, {
      firstName: "Ana María", lastName: original.lastName,
      birthDate: original.birthDate, birthPlace: original.birthPlace,
      assignedGuardians: [{ id: "V-9001" }],
    });
  });

  it("keeps unsaved student changes in the editor when saving fails and supports canceling", async () => {
    const user = userEvent.setup();
    editStudent.mockRejectedValue(new Error("No se pudo guardar el estudiante"));
    renderStudents("/periodo/2025/estudiantes/V-1001");
    await user.click(await screen.findByRole("button", { name: "Editar estudiante" }));
    const editor = within(await screen.findByRole("dialog", { name: "Editar estudiante Ana Pérez" }));
    const name = editor.getByRole("textbox", { name: "Nombres" });
    await user.clear(name);
    await user.type(name, "Cambio pendiente");
    await user.click(editor.getByRole("button", { name: "Aceptar" }));
    expect(await screen.findByText("No se pudo guardar el estudiante")).toBeInTheDocument();
    expect(name).toHaveValue("Cambio pendiente");
    await user.click(screen.getByRole("button", { name: "Cerrar error" }));
    await user.click(editor.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
  });

  it("cancels student editing without submitting changes", async () => {
    const user = userEvent.setup();
    renderStudents("/periodo/2025/estudiantes/V-1001");
    await user.click(await screen.findByRole("button", { name: "Editar estudiante" }));
    const editor = within(await screen.findByRole("dialog"));
    await user.type(editor.getByRole("textbox", { name: "Nombres" }), " provisional");
    await user.click(editor.getByRole("button", { name: "Cancelar" }));
    expect(editStudent).not.toHaveBeenCalled();
    expect(screen.getByText("Ana")).toBeInTheDocument();
  });

  it("uses the detail response's guardian fields when adding a representative", async () => {
    const user = userEvent.setup();
    renderStudents("/periodo/2025/estudiantes/V-1001");
    await user.click(await screen.findByRole("button", { name: "Editar estudiante" }));
    const editor = within(await screen.findByRole("dialog"));
    await user.click(editor.getByRole("button", { name: /^Representantes/ }));
    await user.click(editor.getByRole("button", { name: "Agregar representante" }));
    expect(editor.getByRole("textbox", { name: "Cédula" })).toBeInTheDocument();
    expect(editor.getByRole("textbox", { name: "Rol Legal" })).toBeInTheDocument();
  });
});
