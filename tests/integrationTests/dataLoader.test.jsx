import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorDialogProvider } from "../../src/context/ErrorDialogContext";
import { getActiveUser } from "../../src/auth";
import {
  clearCache,
  getCache,
  getClassSuggestions,
  getPeriodList,
  getStudents,
  getSubjects,
  getYears,
  loadPeriodData,
  saveCache,
} from "../../src/db";
import DataLoader, {
  dataAction,
  dataLoader,
} from "../../src/routes/root/load/DataLoader";
import SubjectLoader, {
  subjectAction,
  subjectLoader,
} from "../../src/routes/root/load/subject/SubjectLoader";
import ClassLoader, {
  classAction,
  classLoader,
} from "../../src/routes/root/load/class/ClassLoader";
import { studentsLoader } from "../../src/routes/root/students/Students";

vi.mock("../../src/db", () => ({
  clearCache: vi.fn(),
  getCache: vi.fn(),
  getClassSuggestions: vi.fn(),
  getPeriodList: vi.fn(),
  getStudents: vi.fn(),
  getSubjects: vi.fn(),
  getYears: vi.fn(),
  loadPeriodData: vi.fn(),
  saveCache: vi.fn(),
}));

vi.mock("../../src/auth", () => ({
  getActiveUser: vi.fn(),
}));

const years = [{ id: 1, name: "Primer año" }];
const subjects = [
  { id: "math", name: "Matemática" },
  { id: "language", name: "Lengua" },
];
const studentClass = { id: "", firstName: "", lastName: "", _class: {} };
const studentFieldLabels = {
  id: "Documento",
  firstName: "Nombre",
  lastName: "Apellido",
};
const students = [
  {
    id: "V-100",
    firstName: "Ana",
    lastName: "Pérez",
    _class: { year: 1, id: "A" },
  },
  {
    id: "E-101",
    firstName: "Eva",
    lastName: "Díaz",
    _class: { year: 1, id: "B" },
  },
];

let cache;

function renderDataLoader() {
  const router = createMemoryRouter(
    [
      {
        path: "/periodo/:periodId/cargar",
        loader: dataLoader,
        element: <DataLoader />,
        action: dataAction,
      },
    ],
    { initialEntries: ["/periodo/actual/cargar"] }
  );
  render(
    <ErrorDialogProvider>
      <RouterProvider router={router} />
    </ErrorDialogProvider>
  );
  return router;
}

function renderSubjectLoader() {
  const router = createMemoryRouter(
    [
      {
        path: "/periodo/:periodId/cargar/materias",
        loader: subjectLoader,
        element: <SubjectLoader />,
      },
    ],
    { initialEntries: ["/periodo/actual/cargar/materias"] }
  );
  render(
    <ErrorDialogProvider>
      <RouterProvider router={router} />
    </ErrorDialogProvider>
  );
  return router;
}

function renderClassLoader() {
  const router = createMemoryRouter(
    [
      {
        path: "/periodo/:periodId/cargar/secciones",
        loader: classLoader,
        action: async (args) => {
          await classAction(args);
          return null;
        },
        element: (
          <ErrorDialogProvider>
            <ClassLoader />
          </ErrorDialogProvider>
        ),
      },
      {
        path: "/periodo/:periodId/estudiantes",
        loader: studentsLoader,
        element: <div />,
      },
      {
        path: "/periodo/:periodId/cargar",
        element: <div />,
      },
    ],
    { initialEntries: ["/periodo/actual/cargar/secciones"] }
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe("Data loading pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cache = {
      subjects: { 1: ["math"] },
      class_students: students,
    };
    getCache.mockImplementation((key) => cache[key] ?? null);
    getYears.mockResolvedValue(years);
    getSubjects.mockResolvedValue(subjects);
    getClassSuggestions.mockResolvedValue({
      students,
      studentClass,
      studentFieldLabels,
    });
    getPeriodList.mockResolvedValue([{ id: "2025" }]);
    getStudents.mockResolvedValue({
      recordsAmount: 0,
      rows: [],
      studentFieldLabels,
    });
    getActiveUser.mockReturnValue({ userLevel: "Administrador" });
    loadPeriodData.mockResolvedValue(undefined);
  });

  it("renders completed data steps and submits the cached payload", async () => {
    renderDataLoader();

    expect(
      await screen.findByRole("link", { name: /Materias/ })
    ).toHaveAttribute("href", "/periodo/actual/cargar/materias");
    expect(screen.getByRole("link", { name: /Secciones/ })).toHaveAttribute(
      "href",
      "/periodo/actual/cargar/secciones"
    );

    expect(screen.getByRole("button", { name: /Confirmar/ })).toBeEnabled();

    const response = await dataAction({ params: { periodId: "actual" } });

    expect(loadPeriodData).toHaveBeenCalledWith(
      "2025",
      cache.class_students,
      cache.subjects
    );
    expect(clearCache).toHaveBeenCalledWith("subjects");
    expect(clearCache).toHaveBeenCalledWith("class_students");
    expect(response.headers.get("Location")).toBe("..");
  });

  it("rejects data loading for users without a permitted role", async () => {
    getActiveUser.mockReturnValue({ userLevel: "Docente" });

    await expect(dataLoader()).rejects.toThrow(
      "No tiene permisos para cargar datos del período."
    );
  });

  it("shows action failures in the error dialog", async () => {
    const user = userEvent.setup();
    loadPeriodData.mockRejectedValueOnce(new Error("No se pudieron cargar los datos"));
    renderDataLoader();

    await user.click(await screen.findByRole("button", { name: /Confirmar/ }));

    expect(await screen.findByText("No se pudieron cargar los datos")).toBeInTheDocument();
  });

  it("loads, changes, and saves subject selections", async () => {
    const user = userEvent.setup();
    renderSubjectLoader();

    expect(
      await screen.findByRole("checkbox", { name: "Matemática" })
    ).toBeChecked();
    const language = screen.getByRole("checkbox", { name: "Lengua" });
    expect(language).not.toBeChecked();

    await user.click(language);
    const form = screen
      .getByRole("button", { name: "Continuar" })
      .closest("form");
    const request = new Request("http://localhost/materias", {
      method: "POST",
      body: new FormData(form),
    });
    const response = await subjectAction({ request });

    expect(saveCache).toHaveBeenCalledWith("subjects", {
      1: ["math", "language"],
    });
    expect(response.headers.get("Location")).toBe("../secciones");
  });

  it("groups students by section without adding row-only identity fields", async () => {
    cache.class_students = null;

    const result = await classLoader();

    expect(result).toMatchObject({
      years,
      studentSchema: {
        template: studentClass,
        attributes: ["id", "firstName", "lastName"],
        labels: studentFieldLabels,
      },
    });
    expect(result.classesByYear[1].A.students[0]).toMatchObject({
      ...students[0],
      _locked: true,
    });
    expect(result.classesByYear[1].B.students[0]).toMatchObject({
      ...students[1],
      _locked: true,
    });
    expect(result.classesByYear[1].A.students[0]._rowId).toBeUndefined();
    expect(result.studentsById).toMatchObject({
      "V-100": { ...students[0], _locked: true },
      "E-101": { ...students[1], _locked: true },
    });
  });

  it("renders static student rows and switches class tabs", async () => {
    const user = userEvent.setup();
    cache.class_students = null;
    renderClassLoader();

    const tabA = await screen.findByRole("tab", { name: "Sección A" });
    expect(tabA).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Ana")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Sección B" }));

    expect(screen.getByText("Eva")).toBeInTheDocument();
    expect(screen.queryByText("Ana")).not.toBeInTheDocument();
  });

  it("adds a student through the modal and saves the completed record", async () => {
    const user = userEvent.setup();
    cache.class_students = null;
    renderClassLoader();

    await screen.findByText("Ana");
    await user.click(screen.getByRole("button", { name: "Añadir Estudiante" }));

    expect(
      screen.getByRole("heading", { name: "Añadir estudiante" })
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Documento: tipo" })).toHaveValue(
      "V-"
    );
    expect(screen.getByRole("textbox", { name: "Documento" })).toHaveValue(
      "30000000"
    );

    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Luis");
    await user.type(screen.getByRole("textbox", { name: "Apellido" }), "León");
    await user.click(screen.getByRole("button", { name: "Aceptar" }));

    expect(screen.getByText("Luis")).toBeInTheDocument();
    expect(screen.getByText("V-30000000")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() =>
      expect(saveCache).toHaveBeenCalledWith(
        "class_students",
        expect.arrayContaining([
          expect.objectContaining({
            id: "V-30000000",
            firstName: "Luis",
            lastName: "León",
            _class: { year: 1, id: "A" },
          }),
        ])
      )
    );
  });

  it("validates cédula uniqueness locally before committing the modal", async () => {
    const user = userEvent.setup();
    cache.class_students = null;
    renderClassLoader();

    await screen.findByText("Ana");
    await user.click(screen.getByRole("button", { name: "Añadir Estudiante" }));
    const documentInput = screen.getByRole("textbox", { name: "Documento" });
    await user.clear(documentInput);
    await user.type(documentInput, "100");
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Otra");
    await user.type(screen.getByRole("textbox", { name: "Apellido" }), "Persona");
    await user.click(screen.getByRole("button", { name: "Aceptar" }));

    expect(
      screen.getByText("Ya existe un estudiante con esta cédula.")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Añadir estudiante" })
    ).toBeInTheDocument();
  });

  it("opens loader students as locked from either edit control", async () => {
    const user = userEvent.setup();
    cache.class_students = null;
    renderClassLoader();

    await user.click(
      await screen.findByRole("button", { name: "Editar cédula de Ana Pérez" })
    );
    expect(screen.getByRole("textbox", { name: "Nombre" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    await user.click(
      screen.getByRole("button", { name: "Editar estudiante Ana Pérez" })
    );
    expect(screen.getByRole("textbox", { name: "Nombre" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Sección de inscripción" })).toBeEnabled();
  });

  it("auto-selects an exact historical match and locks identity data while the ids still match", async () => {
    const user = userEvent.setup();
    getStudents.mockResolvedValue({
      recordsAmount: 1,
      filters: { id: "V-777" },
      rows: [
        {
          id: "V-777",
          firstName: "Sara",
          lastName: "Sol",
          _class: { year: 9, id: "Z" },
        },
      ],
    });
    cache.class_students = null;
    renderClassLoader();

    await screen.findByText("Ana");
    await user.click(screen.getByRole("button", { name: "Añadir Estudiante" }));
    const documentInput = screen.getByRole("textbox", { name: "Documento" });
    await user.clear(documentInput);
    await user.type(documentInput, "777");

    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveValue("Sara")
    );
    expect(documentInput).not.toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Nombre" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Apellido" })).toBeDisabled();
    expect(
      screen.getByText(/únicamente puede cambiar su inscripción/i)
    ).toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "Sección de inscripción" }), "1:B");

    await user.clear(documentInput);

    expect(screen.getByRole("textbox", { name: "Nombre" })).not.toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Apellido" })).not.toBeDisabled();

    await user.type(documentInput, "778");

    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    await user.click(screen.getByRole("tab", { name: "Sección B" }));

    expect(screen.getByText("Sara")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() =>
      expect(saveCache).toHaveBeenCalledWith(
        "class_students",
        expect.arrayContaining([
          expect.objectContaining({
            id: "V-778",
            firstName: "Sara",
            lastName: "Sol",
            _class: { year: 1, id: "B" },
          }),
        ])
      )
    );
    const saved = saveCache.mock.calls.find(
      ([key]) => key === "class_students"
    )[1];
    expect(saved.find((student) => student.id === "V-778")._locked).toBeUndefined();
  });

  it("keeps stale suggestions visible until the current query resolves", async () => {
    const user = userEvent.setup();
    let resolveCurrentRequest;
    getStudents
      .mockResolvedValueOnce({
        recordsAmount: 2,
        filters: { id: "V-7" },
        rows: [
          { id: "V-70", firstName: "Sara", lastName: "Sol" },
          { id: "V-71", firstName: "Sofía", lastName: "Salas" },
        ],
      })
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveCurrentRequest = resolve;
        })
      );
    cache.class_students = null;
    renderClassLoader();

    await screen.findByText("Ana");
    await user.click(screen.getByRole("button", { name: "Añadir Estudiante" }));
    const documentInput = screen.getByRole("textbox", { name: "Documento" });
    await user.clear(documentInput);
    await user.type(documentInput, "7");

    expect(
      await screen.findByRole("option", { name: /Sara Sol/ })
    ).toBeInTheDocument();

    await user.type(documentInput, "2");
    await waitFor(() => expect(getStudents).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("option", { name: /Sara Sol/ })).toBeInTheDocument();

    resolveCurrentRequest({
      recordsAmount: 0,
      filters: { id: "V-72" },
      rows: [],
    });
    await waitFor(() =>
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    );
  });

  it("paginates locally and bulk deletes selected students", async () => {
    const user = userEvent.setup();
    const manyStudents = Array.from({ length: 11 }, (_, index) => ({
      id: String(1000 + index),
      firstName: `Nombre ${index + 1}`,
      lastName: `Apellido ${index + 1}`,
      _class: { year: 1, id: "A" },
    }));
    cache.class_students = null;
    getClassSuggestions.mockResolvedValue({
      students: manyStudents,
      studentClass,
      studentFieldLabels,
    });
    renderClassLoader();

    expect(await screen.findByLabelText("Página")).toHaveValue("1");
    expect(screen.queryByText("Nombre 11")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByLabelText("Página")).toHaveValue("2");
    expect(screen.getByText("Nombre 11")).toBeInTheDocument();

    await user.click(
      screen.getByRole("checkbox", {
        name: "Seleccionar Nombre 11 Apellido 11",
      })
    );
    await user.selectOptions(
      screen.getByLabelText("Acciones de estudiantes"),
      "delete"
    );
    await user.click(screen.getByRole("button", { name: /Aplicar/ }));

    expect(screen.getByLabelText("Página")).toHaveValue("1");
    expect(screen.queryByText("Nombre 11")).not.toBeInTheDocument();
    expect(screen.getByLabelText("10 estudiantes en la sección A")).toHaveClass(
      "animate-class-student-count"
    );
  });

  it("reassigns students only among sections in their current year", async () => {
    const user = userEvent.setup();
    cache.class_students = null;
    renderClassLoader();

    const anaRow = (await screen.findByText("Ana")).closest("tr");
    const sectionSelect = within(anaRow).getByRole("combobox", {
      name: "Cambiar sección de Ana Pérez",
    });
    expect(within(sectionSelect).getAllByRole("option")).toHaveLength(2);

    await user.selectOptions(sectionSelect, "B");

    expect(screen.getByLabelText("0 estudiantes en la sección A")).toHaveClass(
      "animate-class-student-count"
    );
    expect(screen.getByLabelText("2 estudiantes en la sección B")).toHaveClass(
      "animate-class-student-count"
    );
  });
  it("creates and removes a class from the inline empty state", async () => {
    const user = userEvent.setup();
    cache.class_students = null;
    getClassSuggestions.mockResolvedValue({
      students: [],
      studentClass,
      studentFieldLabels,
    });
    renderClassLoader();

    expect(
      await screen.findByRole("button", { name: "Crear sección" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Crear sección" })
    );
    expect(screen.getByRole("tab", { name: "Sección A" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("table")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Eliminar sección A" })
    );
    expect(
      screen.getByRole("button", { name: "Crear sección" })
    ).toBeInTheDocument();
  });
});
