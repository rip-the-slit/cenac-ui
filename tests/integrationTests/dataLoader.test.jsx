import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorDialogProvider } from "../../src/context/ErrorDialogContext";
import {
  clearCache,
  getCache,
  getClassSuggestions,
  getPeriodList,
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
} from "../../src/routes/root/load/SubjectLoader";
import ClassLoader, {
  classAction,
  classLoader,
} from "../../src/routes/root/load/ClassLoader";

vi.mock("../../src/db", () => ({
  clearCache: vi.fn(),
  getCache: vi.fn(),
  getClassSuggestions: vi.fn(),
  getPeriodList: vi.fn(),
  getSubjects: vi.fn(),
  getYears: vi.fn(),
  loadPeriodData: vi.fn(),
  saveCache: vi.fn(),
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
      },
    ],
    { initialEntries: ["/periodo/actual/cargar"] }
  );
  render(<RouterProvider router={router} />);
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
  render(<RouterProvider router={router} />);
  return router;
}

function renderClassLoader() {
  const router = createMemoryRouter(
    [
      {
        path: "/periodo/:periodId/cargar/secciones",
        loader: classLoader,
        action: classAction,
        element: (
          <ErrorDialogProvider>
            <ClassLoader />
          </ErrorDialogProvider>
        ),
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

  it("groups class students once in the loader", async () => {
    cache.class_students = null;

    const result = await classLoader();
    const firstStudent = result.classesByYear[1].A.students[0];
    const secondStudent = result.classesByYear[1].B.students[0];

    expect(result).toMatchObject({
      years,
      studentClass,
      studentAttributes: ["id", "firstName", "lastName"],
      studentFieldLabels,
      nextRowSequence: 2,
    });
    expect(firstStudent).toMatchObject(students[0]);
    expect(secondStudent).toMatchObject(students[1]);
    expect(firstStudent._rowId).toEqual(expect.any(String));
    expect(secondStudent._rowId).toEqual(expect.any(String));
    expect(firstStudent._rowId).not.toBe(secondStudent._rowId);
    expect(students.every((student) => student._rowId === undefined)).toBe(
      true
    );
  });

  it("renders class tabs and switches their student table", async () => {
    const user = userEvent.setup();
    cache.class_students = null;
    renderClassLoader();

    const tabA = await screen.findByRole("tab", { name: "Sección A" });
    expect(tabA).toHaveAttribute("aria-selected", "true");
    expect(screen.getByDisplayValue("Ana")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Sección B" }));

    expect(screen.getByDisplayValue("Eva")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Ana")).not.toBeInTheDocument();
  });

  it("edits and saves a unified id without remounting its numeric input", async () => {
    const user = userEvent.setup();
    cache.class_students = null;
    renderClassLoader();

    const typeInput = await screen.findByRole("combobox", {
      name: "Documento: tipo",
    });
    const numberInput = screen.getByRole("textbox", { name: "Documento" });

    expect(typeInput).toHaveValue("V-");
    expect(numberInput).toHaveValue("100");

    await user.selectOptions(typeInput, "E-");
    await user.clear(numberInput);
    await user.type(numberInput, "0a123456789");

    expect(numberInput).toHaveValue("12345678");
    expect(document.activeElement).toBe(numberInput);
    expect(screen.getByRole("textbox", { name: "Documento" })).toBe(numberInput);

    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() =>
      expect(saveCache).toHaveBeenCalledWith(
        "class_students",
        expect.any(Array)
      )
    );

    const savedStudents = saveCache.mock.calls.find(
      ([key]) => key === "class_students"
    )[1];
    expect(savedStudents[0]).toMatchObject({
      id: "E-12345678",
      firstName: "Ana",
      lastName: "Pérez",
      _class: { year: 1, id: "A" },
    });
    expect(savedStudents.every((student) => student._rowId === undefined)).toBe(
      true
    );
  });
  it("treats a legacy numeric id as Venezuelan", async () => {
    cache.class_students = null;
    getClassSuggestions.mockResolvedValue({
      students: [{ ...students[0], id: "321" }],
      studentClass,
      studentFieldLabels,
    });
    renderClassLoader();

    expect(
      await screen.findByRole("combobox", { name: "Documento: tipo" })
    ).toHaveValue("V-");
    expect(screen.getByRole("textbox", { name: "Documento" })).toHaveValue(
      "321"
    );
  });

  it("creates students with a canonical Venezuelan id", async () => {
    const user = userEvent.setup();
    cache.class_students = null;
    renderClassLoader();

    await screen.findByDisplayValue("Ana");
    await user.click(screen.getByRole("button", { name: "Añadir Estudiante" }));

    const typeInputs = screen.getAllByRole("combobox", {
      name: "Documento: tipo",
    });
    const numberInputs = screen.getAllByRole("textbox", { name: "Documento" });
    expect(typeInputs.at(-1)).toHaveValue("V-");
    expect(numberInputs.at(-1)).toHaveValue("30000000");
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
    expect(screen.queryByDisplayValue("Nombre 11")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByLabelText("Página")).toHaveValue("2");
    expect(screen.getByDisplayValue("Nombre 11")).toBeInTheDocument();

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
    expect(screen.queryByDisplayValue("Nombre 11")).not.toBeInTheDocument();
    expect(screen.getByLabelText("10 estudiantes en la sección A")).toHaveClass(
      "animate-class-student-count"
    );
  });

  it("updates class counts when a student is reassigned", async () => {
    const user = userEvent.setup();
    cache.class_students = null;
    renderClassLoader();

    const anaRow = (await screen.findByDisplayValue("Ana")).closest("tr");
    await user.click(
      within(anaRow).getByRole("button", {
        name: "Cambiar sección de Ana Pérez",
      })
    );
    await user.selectOptions(
      within(anaRow).getByRole("combobox", {
        name: "Cambiar sección de Ana Pérez",
      }),
      "1-B"
    );

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
