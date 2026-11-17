import { fieldDefinitions } from "../fieldFixtures";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, Link, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorDialogProvider } from "../../src/context/ErrorDialogContext";
import { getActiveUser } from "../../src/auth";
import {
  clearCache,
  createGuardian,
  editGuardian,
  getCache,
  getClassSuggestions,
  getSubjectSuggestions,
  getGuardians,
  getGuardianById,
  getStudentById,
  getPeriodList,
  getPlaces,
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
  guardianSuggestionsLoader,
} from "../../src/routes/root/load/class/ClassLoader";
import { studentsLoader } from "../../src/routes/root/students/Students";
import { placesLoader } from "../../src/routes/root/load/class/BirthPlaceInput";

vi.mock("../../src/db", () => ({
  clearCache: vi.fn(),
  createGuardian: vi.fn(),
  editGuardian: vi.fn(),
  getCache: vi.fn(),
  getClassSuggestions: vi.fn(),
  getSubjectSuggestions: vi.fn(),
  getGuardians: vi.fn(),
  getGuardianById: vi.fn(),
  getStudentById: vi.fn(),
  getPeriodList: vi.fn(),
  getPlaces: vi.fn(),
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
  { id: "math", name: "Matemática", abbr: "MAT" },
  { id: "language", name: "Lengua", abbr: "LEN" },
  { id: "science", name: "Ciencias", abbr: "CIE" },
];
const subjectsByYear = {
  1: subjects.map((s) => s.id),
};
const studentClass = { id: "", firstName: "", lastName: "", _class: {} };
const studentFieldLabels = {
  id: "Documento",
  firstName: "Nombre",
  lastName: "Apellido",
};
const guardianClass = {
  id: "",
  firstName: "",
  lastName: "",
  birthDate: "",
  legalRole: "",
  phone: "",
  address: "",
};
const guardianFieldLabels = {
  id: "Cédula",
  firstName: "Nombres",
  lastName: "Apellidos",
  birthDate: "Fecha de Nacimiento",
  legalRole: "Rol Legal",
  phone: "Teléfono",
  address: "Dirección",
};
const guardian = {
  id: "V-10000900",
  firstName: "María",
  lastName: "Rojas",
  birthDate: "1980-01-02",
  legalRole: "Madre",
  phone: "04121234567",
  address: "Calle Principal",
};

const students = [
  {
    id: "V-10000100",
    firstName: "Ana",
    lastName: "Pérez",
    _class: { year: 1, id: "A" },
  },
  {
    id: "E-80000101",
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
        path: "/periodo/:periodId/cargar",
        children: [
          { index: true, element: <p>Carga de datos</p> },
          {
            path: "materias",
            loader: subjectLoader,
            action: subjectAction,
            element: <><Link to="/periodo/actual/cargar">Salir de la carga</Link><SubjectLoader /></>,
          },
          { path: "secciones", element: <p>Materias guardadas</p> },
        ],
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
            <Link to="/periodo/actual/cargar">Salir de la carga</Link>
            <ClassLoader />
          </ErrorDialogProvider>
        ),
      },
      {
        path: "/api/guardians",
        loader: guardianSuggestionsLoader,
      },
      {
        path: "/api/periods/places",
        loader: placesLoader,
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
    getGuardianById.mockRejectedValue(new Error("No encontrado", { cause: { status: 404 } }));
    getStudentById.mockRejectedValue(new Error("No encontrado", { cause: { status: 404 } }));
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
      fields: {
        student: fieldDefinitions(studentFieldLabels),
        guardian: fieldDefinitions(guardianFieldLabels),
      },
      guardianClass,
    });
    getSubjectSuggestions.mockResolvedValue({ subjectsByYear });
    getGuardians.mockImplementation((_periodId, { id }) =>
      Promise.resolve({
        filters: { id },
        rows: [],
        recordsAmount: 0,
      })
    );
    createGuardian.mockImplementation((guardian) => Promise.resolve(guardian));
    editGuardian.mockResolvedValue(undefined);
    getPeriodList.mockResolvedValue([{ id: "2025" }]);
    getStudents.mockResolvedValue({
      recordsAmount: 0,
      rows: [],
      fields: fieldDefinitions(studentFieldLabels),
    });
    getActiveUser.mockReturnValue({ userLevel: "Administrador" });
    loadPeriodData.mockResolvedValue(undefined);
  });

  it.each([["subjects", renderSubjectLoader], ["classes", renderClassLoader]])("prompts before leaving the %s loader", async (_name, renderPage) => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const router = renderPage();
    await screen.findByRole("button", { name: "Continuar" });
    const originalPath = router.state.location.pathname;
    await userEvent.click(screen.getByRole("link", { name: "Salir de la carga" }));
    await waitFor(() => expect(confirm).toHaveBeenCalledOnce());
    expect(router.state.location.pathname).toBe(originalPath);
    confirm.mockRestore();
  });

  it("allows the subject save button to navigate without a prompt", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    cache.subjects = { 1: subjects.map((subject) => subject.id) };
    renderSubjectLoader();
    await userEvent.click(await screen.findByRole("button", { name: "Continuar" }));
    expect(await screen.findByText("Materias guardadas")).toBeInTheDocument();
    expect(confirm).not.toHaveBeenCalled();
    expect(saveCache).toHaveBeenCalledWith("subjects", expect.any(Object));
    confirm.mockRestore();
  });

  it.each([
    ["Padre", "Madre", false], ["Madre", "Padre", false],
    ["Padre", "Padre", true], ["Madre", "Representante Legal", true],
  ])("keeps a guardian's historical role consistent: %s to %s", async (previousRole, role, accepted) => {
    const user = userEvent.setup();
    getGuardians.mockImplementation((_periodId, { id }) => Promise.resolve({
      filters: { id }, rows: id === guardian.id ? [{ ...guardian, assignedStudents: [{ id: "V-40000000", legalRole: previousRole }] }] : [],
      recordsAmount: id === guardian.id ? 1 : 0,
    }));
    renderClassLoader();
    await user.click(await screen.findByRole("button", { name: "Editar representantes de Ana Pérez" }));
    await user.click(screen.getByRole("button", { name: "Agregar representante" }));
    await user.type(screen.getByRole("textbox", { name: "Cédula" }), guardian.id.slice(2));
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Nombres" })).toHaveValue("María"));
    const roleInput = screen.getByRole("textbox", { name: "Rol Legal" });
    await user.clear(roleInput);
    await user.type(roleInput, role);
    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    if (accepted) expect(await screen.findByText("María Rojas")).toBeInTheDocument();
    else expect(await screen.findByText(`El representante ha sido registrado como ${previousRole.toLowerCase()} anteriormente.`)).toBeInTheDocument();
    expect(createGuardian).not.toHaveBeenCalled();
  });

  it("rejects creating a guardian with the current student draft's ID", async () => {
    const user = userEvent.setup();
    renderClassLoader();
    await user.click(await screen.findByRole("button", { name: "Añadir Estudiante" }));
    await user.click(screen.getByRole("button", { name: /^Representantes/ }));
    await user.click(screen.getByRole("button", { name: "Agregar representante" }));
    await user.type(screen.getByRole("textbox", { name: "Cédula" }), "30000000");
    await user.type(screen.getByRole("textbox", { name: "Nombres" }), "Nueva");
    await user.type(screen.getByRole("textbox", { name: "Apellidos" }), "Persona");
    await user.type(screen.getByLabelText("Fecha de Nacimiento"), "1980-01-01");
    await user.type(screen.getByRole("textbox", { name: "Rol Legal" }), "Madre");
    await user.type(screen.getByRole("textbox", { name: "Teléfono" }), "1234567");
    await user.type(screen.getByRole("textbox", { name: "Dirección" }), "Caracas");
    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    expect(await screen.findByText("El representante no puede tener la misma cédula que el estudiante.")).toBeInTheDocument();
    expect(createGuardian).not.toHaveBeenCalled();
    expect(getStudentById).not.toHaveBeenCalled();
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
  });

  it("disable steps for users without a permitted role", async () => {
    getActiveUser.mockReturnValue({ userLevel: "Docente" });
    renderDataLoader();

    expect(
      await screen.findByRole("link", { name: /Materias/ })
    ).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("link", { name: /Secciones/ })).toHaveAttribute(
      "aria-disabled",
      "true"
    );

    expect(screen.getByRole("button", { name: /Confirmar/ })).toBeDisabled();
    expect(
      await screen.findByText(
        "No tiene permisos para cargar datos del período."
      )
    ).toBeInTheDocument();
  });

  it("shows action failures in the error dialog", async () => {
    const user = userEvent.setup();
    loadPeriodData.mockRejectedValueOnce(
      new Error("No se pudieron cargar los datos")
    );
    renderDataLoader();

    await user.click(await screen.findByRole("button", { name: /Confirmar/ }));

    expect(
      await screen.findByText("No se pudieron cargar los datos")
    ).toBeInTheDocument();
  });

  it("loads, changes, and saves subject selections", async () => {
    const user = userEvent.setup();
    renderSubjectLoader();

    expect(
      await screen.findByRole("checkbox", { name: "Matemática — Primer año" })
    ).toBeChecked();
    const language = screen.getByRole("checkbox", { name: "Lengua — Primer año" });
    expect(language).not.toBeChecked();

    await user.click(language);
    await user.click(screen.getByRole("checkbox", { name: "Ciencias — Primer año" }));
    const form = screen
      .getByRole("button", { name: "Continuar" })
      .closest("form");
    const request = new Request("http://localhost/materias", {
      method: "POST",
      body: new FormData(form),
    });
    const response = await subjectAction({ request });

    expect(saveCache).toHaveBeenCalledWith("subjects", {
      1: ["math", "language", "science"],
    });
    expect(response.headers.get("Location")).toBe("../secciones");
  });

  it("falls back to server suggestions when the subject cache is empty", async () => {
    cache.subjects = null;
    renderSubjectLoader();

    for (const subject of subjects) {
      expect(
        await screen.findByRole("checkbox", { name: `${subject.name} — Primer año` })
      ).toBeChecked();
    }
  });

  it("lays out subjects as rows and years as columns, preventing fewer than three per year", async () => {
    const user = userEvent.setup();
    const options = [...subjects, { id: "history", name: "Historia" }];
    getSubjects.mockResolvedValue(options);
    getYears.mockResolvedValue([...years, { id: 2, name: "Segundo año" }]);
    cache.subjects = { 1: options.map((subject) => subject.id), 2: options.map((subject) => subject.id) };
    renderSubjectLoader();
    const table = await screen.findByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Primer año" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Segundo año" })).toBeInTheDocument();
    expect(within(table).getAllByRole("rowheader")).toHaveLength(options.length);
    await user.click(screen.getByRole("checkbox", { name: "Historia — Primer año" }));
    expect(screen.getByRole("checkbox", { name: "Historia — Primer año" })).not.toBeChecked();
    await user.click(screen.getByRole("checkbox", { name: "Matemática — Primer año" }));
    expect(screen.getByText("Debe seleccionar al menos 3 materias por año.")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Matemática — Primer año" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Historia — Segundo año" })).toBeChecked();
  });

  it("does not save or navigate when a year starts with fewer than three subjects", async () => {
    renderSubjectLoader();
    await userEvent.click(await screen.findByRole("button", { name: "Continuar" }));
    expect(screen.getByText("Debe seleccionar al menos 3 materias por año.")).toBeInTheDocument();
    expect(saveCache).not.toHaveBeenCalled();
    expect(screen.queryByText("Materias guardadas")).not.toBeInTheDocument();
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

  it("keeps an explicitly empty student cache empty", async () => {
    cache.class_students = [];
    const data = await classLoader({ params: { periodId: "actual" } });
    expect(data.studentsById).toEqual({});
    expect(Object.values(data.classesByYear).every((classes) => Object.keys(classes).length === 0)).toBe(true);
    expect(await dataLoader({})).toMatchObject({ classesLoaded: true, canConfirm: true });
  });

  it.each([true, false])("only locks students supplied by the server (cached: %s)", async (cached) => {
    cache.class_students = cached ? students : null;
    const data = await classLoader({ params: { periodId: "actual" } });
    for (const student of Object.values(data.studentsById)) {
      if (cached) expect(student).not.toHaveProperty("_locked");
      else expect(student._locked).toBe(true);
    }
  });

  it("edits an assigned guardian through the API without changing their ID", async () => {
    const user = userEvent.setup();
    cache.class_students = [{ ...students[0], assignedGuardians: [guardian] }];
    renderClassLoader();
    await user.click(await screen.findByRole("button", { name: "Editar representantes de Ana Pérez" }));
    await user.click(screen.getByRole("button", { name: "Editar representante María Rojas" }));
    expect(screen.getByRole("textbox", { name: "Cédula" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Cédula: tipo" })).toBeDisabled();
    const name = screen.getByRole("textbox", { name: "Nombres" });
    await user.clear(name);
    await user.type(name, "Mariana");
    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    expect(await screen.findByText("Mariana Rojas")).toBeInTheDocument();
    expect(editGuardian).toHaveBeenCalledWith(guardian.id, expect.objectContaining({ firstName: "Mariana" }));
    expect(createGuardian).not.toHaveBeenCalled();
  });

  it.each([
    [["Madre", "Padre", "Tutor"], "Tutora", "Solo puede asignar un máximo de tres representantes."],
    [["Madre", "Madre"], "Madre", "No puede asignar más de dos representantes con el rol de padre o madre."],
    [["Padre", "Padre"], "Padre", "No puede asignar más de dos representantes con el rol de padre o madre."],
    [["Padre", "Madre"], "Padre", "No puede asignar más de dos representantes con el rol de padre o madre."],
  ])("validates guardian limits before creation: %j + %s", async (roles, role, message) => {
    const user = userEvent.setup();
    cache.class_students = [{ ...students[0], assignedGuardians: roles.map((legalRole, index) => ({ ...guardian, id: `V-4000000${index}`, legalRole })) }];
    renderClassLoader();
    await user.click(await screen.findByRole("button", { name: "Editar representantes de Ana Pérez" }));
    await user.click(screen.getByRole("button", { name: "Agregar representante" }));
    await user.type(screen.getByRole("textbox", { name: "Cédula" }), "30000000");
    await user.type(screen.getByRole("textbox", { name: "Nombres" }), "Nueva");
    await user.type(screen.getByRole("textbox", { name: "Apellidos" }), "Persona");
    await user.type(screen.getByLabelText("Fecha de Nacimiento"), "1980-01-01");
    await user.type(screen.getByRole("textbox", { name: "Rol Legal" }), role);
    await user.type(screen.getByRole("textbox", { name: "Teléfono" }), "1234567");
    await user.type(screen.getByRole("textbox", { name: "Dirección" }), "Caracas");
    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(createGuardian).not.toHaveBeenCalled();
    expect(getStudentById).not.toHaveBeenCalled();
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
    expect(
      screen.getByRole("combobox", { name: "Documento: tipo" })
    ).toHaveValue("V-");
    expect(screen.getByRole("textbox", { name: "Documento" })).toHaveValue(
      "30000000"
    );

    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Luis");
    await user.type(screen.getByRole("textbox", { name: "Apellido" }), "León");

    await user.click(screen.getByRole("button", { name: /^Inscripción/ }));
    const enrollmentSelect = screen.getByRole("combobox", {
      name: "Sección de inscripción",
    });
    await user.selectOptions(enrollmentSelect, "1:B");
    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    await user.click(screen.getByRole("button", { name: "Aceptar" }));

    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() =>
      expect(saveCache).toHaveBeenCalledWith(
        "class_students",
        expect.arrayContaining([
          expect.objectContaining({
            id: "V-30000000",
            firstName: "Luis",
            lastName: "León",
            _class: { year: 1, id: "B" },
          }),
        ])
      )
    );
  });

  it("locks historical birthplaces and saves a new birthplace selected by country, state and municipality", async () => {
    const user = userEvent.setup();
    cache.class_students = null;
    getClassSuggestions.mockResolvedValue({
      students: [{ ...students[0], birthPlace: "Venezuela, Miranda, Sucre" }],
      studentClass,
      fields: {
        student: fieldDefinitions({
          ...studentFieldLabels,
          birthPlace: "Lugar de nacimiento",
        }),
        guardian: fieldDefinitions(guardianFieldLabels),
      },
      guardianClass,
    });
    const places = {
      country: { id: 1, iso2: "VE", name: "Venezuela" },
      state: { id: 10, country: "VE", name: "Miranda" },
      municipality: { id: 20, country: "VE", state: 10, name: "Sucre" },
    };
    getPlaces.mockImplementation(async ({ type }) => ({
      rows: [places[type]],
    }));
    renderClassLoader();

    await user.click(
      await screen.findByRole("button", { name: "Editar estudiante Ana Pérez" })
    );
    for (const name of ["País", "Estado", "Municipio"]) {
      expect(screen.getByRole("combobox", { name })).toBeDisabled();
    }
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await user.click(screen.getByRole("button", { name: "Añadir Estudiante" }));
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Luis");
    await user.type(screen.getByRole("textbox", { name: "Apellido" }), "Sol");
    for (const [name, place] of [
      ["País", "Venezuela"],
      ["Estado", "Miranda"],
      ["Municipio", "Sucre"],
    ]) {
      fireEvent.blur(screen.getByRole("combobox", { name }));
      expect(screen.getByRole("combobox", { name })).toHaveAttribute("aria-invalid", "true");
      await user.type(screen.getByRole("combobox", { name }), place);
      await user.click(await screen.findByRole("option", { name: place }));
    }
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    expect(screen.getByText("Luis")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() =>
      expect(saveCache).toHaveBeenCalledWith(
        "class_students",
        expect.arrayContaining([
          expect.objectContaining({
            id: "V-30000000",
            firstName: "Luis",
            birthPlace: "Venezuela, Miranda, Sucre",
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
    await user.type(documentInput, "10000100");
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Otra");
    await user.type(
      screen.getByRole("textbox", { name: "Apellido" }),
      "Persona"
    );
    await user.click(screen.getByRole("button", { name: "Aceptar" }));

    expect(
      screen.getByText("Ya está inscrito en este periodo un estudiante con esta cédula.")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Añadir estudiante" })
    ).toBeInTheDocument();
  });

  it("rejects a student ID already registered as a guardian", async () => {
    const user = userEvent.setup();
    getGuardianById.mockResolvedValue({ guardian: { id: "V-30000000" } });
    cache.class_students = null;
    renderClassLoader();
    await user.click(await screen.findByRole("button", { name: "Añadir Estudiante" }));
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Nueva");
    await user.type(screen.getByRole("textbox", { name: "Apellido" }), "Persona");
    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    expect(await screen.findByText("Esta cédula ya está registrada como representante.")).toBeInTheDocument();
    expect(getGuardianById).toHaveBeenCalledWith("V-30000000");
    expect(screen.getByRole("heading", { name: "Añadir estudiante" })).toBeInTheDocument();
  });

  it("rejects a guardian ID already registered as a student", async () => {
    const user = userEvent.setup();
    getStudentById.mockResolvedValue({ student: { id: "V-30000000" } });
    renderClassLoader();
    await user.click(await screen.findByRole("button", { name: "Editar estudiante Ana Pérez" }));
    await user.click(screen.getByRole("button", { name: /^Representantes/ }));
    await user.click(screen.getByRole("button", { name: "Agregar representante" }));
    await user.type(screen.getByRole("textbox", { name: "Cédula" }), "30000000");
    await user.type(screen.getByRole("textbox", { name: "Nombres" }), "Nueva");
    await user.type(screen.getByRole("textbox", { name: "Apellidos" }), "Persona");
    await user.type(screen.getByLabelText("Fecha de Nacimiento"), "1985-03-04");
    await user.type(screen.getByLabelText("Rol Legal"), "Madre");
    await user.type(screen.getByRole("textbox", { name: "Teléfono" }), "1234567");
    await user.type(screen.getByLabelText("Dirección"), "Caracas");
    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    expect(await screen.findByText("Esta cédula ya está registrada como estudiante.")).toBeInTheDocument();
    expect(getStudentById).toHaveBeenCalledWith("all", "V-30000000");
    expect(createGuardian).not.toHaveBeenCalled();
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
    await user.click(screen.getByRole("button", { name: /^Inscripción/ }));
    expect(
      screen.getByRole("combobox", { name: "Sección de inscripción" })
    ).toBeEnabled();
  });

  it("auto-selects an exact historical match and locks identity data while the ids still match", async () => {
    const user = userEvent.setup();
    const twoYears = [
      { id: 1, name: "Primer año" },
      { id: 2, name: "Segundo año" },
    ];
    getYears.mockResolvedValue(twoYears);
    getStudents.mockResolvedValue({
      recordsAmount: 1,
      filters: { id: "V-10000777" },
      rows: [
        {
          id: "V-10000777",
          firstName: "Sara",
          lastName: "Sol",
          _class: { year: 2, id: "Z" },
        },
      ],
    });
    getClassSuggestions.mockResolvedValue({
      students: [
        {
          id: "V-10000777",
          firstName: "Sara",
          lastName: "Sol",
          _class: { year: 2, id: "Z", originalYear: 1 },
          pendingSubjects: ["math"],
        },
      ],
      recordsAmount: 1,
      studentClass,
      fields: {
        student: fieldDefinitions(studentFieldLabels),
        guardian: fieldDefinitions(guardianFieldLabels),
      },
      guardianClass,
    });
    cache.class_students = [
      {
        id: "V-10010020",
        firstName: "Ana",
        lastName: "Pérez",
        _class: { year: 2, id: "A" },
      },
      {
        id: "V-10010030",
        firstName: "Carlos",
        lastName: "Ignacio",
        _class: { year: 2, id: "B" },
      },
    ];
    renderClassLoader();
    await screen.findByText("Ana");
    await user.click(screen.getByRole("button", { name: "Añadir Estudiante" }));
    const documentInput = screen.getByRole("textbox", { name: "Documento" });
    await user.clear(documentInput);
    fireEvent.blur(screen.getByRole("textbox", { name: "Nombre" }));
    expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveAttribute("aria-invalid", "true");
    await user.type(documentInput, "10000777");

    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveValue(
        "Sara"
      )
    );
    expect(documentInput).not.toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Nombre" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Apellido" })).toBeDisabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.getByText(/únicamente puede cambiar su inscripción/i)
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Inscripción/ }));
    expect(screen.getByText(/Matemática/i)).toBeInTheDocument();
    expect(screen.getByText("Este estudiante pasó de Primer año.")).toBeInTheDocument();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Sección de inscripción" }),
      "2:B"
    );
    await user.click(screen.getByRole("button", { name: "Aceptar" }));

    const unlockedDocumentInput = screen.getByRole("textbox", {
      name: "Documento",
    });
    await user.clear(unlockedDocumentInput);

    expect(screen.getByRole("textbox", { name: "Nombre" })).not.toBeDisabled();
    expect(
      screen.getByRole("textbox", { name: "Apellido" })
    ).not.toBeDisabled();

    await user.type(unlockedDocumentInput, "10000778");

    await user.click(screen.getByRole("button", { name: /^Inscripción/ }));
    expect(
      screen.getByText(/Puede inscribir un máximo de 2 materias/)
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Aceptar" }));

    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    await user.click(screen.getByRole("tab", { name: "Sección B" }));

    expect(screen.getByText("Sara")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() =>
      expect(saveCache).toHaveBeenCalledWith(
        "class_students",
        expect.arrayContaining([
          expect.objectContaining({
            id: "V-10000778",
            firstName: "Sara",
            lastName: "Sol",
            _class: { year: 2, id: "B", originalYear: 1 },
          }),
        ])
      )
    );
    const saved = saveCache.mock.calls.find(
      ([key]) => key === "class_students"
    )[1];
    expect(
      saved.find((student) => student.id === "V-10000778")._locked
    ).toBeUndefined();
  });

  it("lets new students select up to two pending subjects from the previous year", async () => {
    const user = userEvent.setup();
    const twoYears = [
      { id: 1, name: "Primer año" },
      { id: 2, name: "Segundo año" },
    ];
    const enrolledStudent = {
      ...students[0],
      _class: { year: 2, id: "A" },
      pendingSubjects: ["math"],
    };
    cache.class_students = null;
    cache.subjects = {
      1: ["math", "language", "science"],
      2: [],
    };
    getYears.mockResolvedValue(twoYears);
    getClassSuggestions.mockResolvedValue({
      students: [enrolledStudent],
      studentClass,
      fields: {
        student: fieldDefinitions(studentFieldLabels),
        guardian: fieldDefinitions(guardianFieldLabels),
      },
      guardianClass,
    });
    renderClassLoader();

    expect(
      await screen.findByRole("columnheader", {
        name: "Materias pendientes",
      })
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Añadir Estudiante" }));
    const documentInput = screen.getByRole("textbox", { name: "Documento" });
    await user.clear(documentInput);
    await user.type(documentInput, "10000102");
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Luis");
    await user.type(screen.getByRole("textbox", { name: "Apellido" }), "Sol");
    await user.click(screen.getByRole("button", { name: /^Inscripción/ }));

    const mathematics = screen.getByRole("checkbox", {
      name: "Matemática",
    });
    const language = screen.getByRole("checkbox", { name: "Lengua" });
    const science = screen.getByRole("checkbox", { name: "Ciencias" });
    expect(mathematics).not.toBeChecked();

    await user.click(mathematics);
    await user.click(language);
    expect(science).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    await user.click(screen.getByRole("button", { name: "Aceptar" }));

    expect(screen.getByText("MAT, LEN")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() =>
      expect(saveCache).toHaveBeenCalledWith(
        "class_students",
        expect.arrayContaining([
          expect.objectContaining({
            id: "V-10000102",
            pendingSubjects: ["math", "language"],
          }),
        ])
      )
    );
  });

  it("only displays pending subjects available in the student's previous year", async () => {
    const user = userEvent.setup();
    cache.class_students = null;
    cache.subjects = { 1: ["math"], 2: ["language"] };
    getYears.mockResolvedValue([
      { id: 1, name: "Primer año" },
      { id: 2, name: "Segundo año" },
    ]);
    getClassSuggestions.mockResolvedValue({
      students: [
        {
          ...students[0],
          _class: { year: 2, id: "A" },
          pendingSubjects: ["math", "language"],
        },
      ],
      studentClass,
      fields: {
        student: fieldDefinitions(studentFieldLabels),
        guardian: fieldDefinitions(guardianFieldLabels),
      },
      guardianClass,
    });

    renderClassLoader();

    const pendingSubjects = await screen.findByRole("button", {
      name: "Editar materias pendientes de Ana Pérez",
    });
    expect(pendingSubjects).toHaveTextContent("MAT");
    expect(pendingSubjects).not.toHaveTextContent("LEN");
    await user.click(pendingSubjects);
    expect(
      within(screen.getByRole("dialog")).queryByRole("checkbox")
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Este estudiante lleva pendiente Matemática.")
    ).toBeInTheDocument();
  });

  it("matches floating enrollment to its assigned subjects", async () => {
    const yearId = 2;
    const user = userEvent.setup();
    cache.class_students = null;
    cache.subjects = { 1: ["science"], 2: ["math", "language"] };
    getYears.mockResolvedValue([
      { id: 1, name: "Primer año" },
      { id: 2, name: "Segundo año" },
    ]);
    getClassSuggestions.mockResolvedValue({
      students: [
        {
          ...students[0],
          _class: { year: yearId, id: "z" },
          pendingSubjects: ["math", "language", "science"],
        },
      ],
      studentClass,
      fields: {
        student: fieldDefinitions(studentFieldLabels),
        guardian: fieldDefinitions(guardianFieldLabels),
      },
      guardianClass,
    });

    renderClassLoader();

    const pendingSubjects = await screen.findByRole("button", {
      name: "Editar materias pendientes de Ana Pérez",
    });
    expect(pendingSubjects).toHaveTextContent("MAT");
    expect(pendingSubjects).toHaveTextContent("LEN");
    expect(pendingSubjects).not.toHaveTextContent("CIE");
    await user.click(pendingSubjects);
    expect(
      screen.getByText("Este estudiante lleva pendiente Matemática, Lengua.")
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() =>
      expect(saveCache).toHaveBeenCalledWith(
        "class_students",
        expect.arrayContaining([
          expect.objectContaining({
            id: "V-10000100",
            pendingSubjects: cache.subjects[yearId],
            _class: { year: yearId, id: "z" },
          }),
        ])
      )
    );
  });

  it("disables enrollment selects for floating enrollments", async () => {
    const user = userEvent.setup();
    cache.class_students = null;
    getYears.mockResolvedValue([
      { id: 9, name: "Primer año" },
      { id: 2, name: "Último año" },
    ]);
    getClassSuggestions.mockResolvedValue({
      students: [
        { ...students[0], _class: { year: 9, id: "A" } },
        { ...students[1], _class: { year: 2, id: "A" } },
        {
          id: "V-10000103",
          firstName: "Luis",
          lastName: "Sol",
          _class: { year: 9, id: "z" },
        },
        {
          id: "V-10000104",
          firstName: "Sara",
          lastName: "Sol",
          _class: { year: 2, id: "z" },
        },
      ],
      studentClass,
      fields: {
        student: fieldDefinitions(studentFieldLabels),
        guardian: fieldDefinitions(guardianFieldLabels),
      },
      guardianClass,
    });
    renderClassLoader();

    const earlySelect = await screen.findByRole("combobox", {
      name: "Cambiar sección de Ana Pérez",
    });
    expect(earlySelect).toBeEnabled();
    expect(
      within(earlySelect).getByRole("option", { name: "Sección Flotante" })
    ).toBeDisabled();
    const finalSelect = screen.getByRole("combobox", {
      name: "Cambiar sección de Eva Díaz",
    });
    expect(
      within(finalSelect).getByRole("option", { name: "Sección Flotante" })
    ).toBeDisabled();

    await user.click(
      screen.getByRole("button", {
        name: "Editar materias pendientes de Ana Pérez",
      })
    );
    const enrollmentSelect = screen.getByRole("combobox", {
      name: "Sección de inscripción",
    });
    expect(within(enrollmentSelect).getByRole("option", {
      name: "Sección Flotante",
    })).toBeDisabled()
    await user.selectOptions(enrollmentSelect, "9:z");
    expect(enrollmentSelect).toHaveValue("9:A");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    for (const [index, name, yearId] of [
      [0, "Luis Sol", 9],
      [1, "Sara Sol", 2],
    ]) {
      await user.click(
        screen.getAllByRole("tab", { name: "Sección Flotante" })[index]
      );
      expect(
        screen.getByRole("combobox", { name: `Cambiar sección de ${name}` })
      ).toBeDisabled();
      await user.click(
        screen.getByRole("button", {
          name: `Editar materias pendientes de ${name}`,
        })
      );
      const floatingSelect = screen.getByRole("combobox", {
        name: "Sección de inscripción",
      });
      expect(floatingSelect).toBeDisabled();
      expect(floatingSelect).toHaveValue(`${yearId}:z`);
      await user.click(screen.getByRole("button", { name: "Aceptar" }));
    }
  });

  it("creates a floating enrollment from the editor launched in that section", async () => {
    const user = userEvent.setup();
    cache.class_students = null;
    cache.subjects = { 1: ["math"], 2: ["language"] };
    getYears.mockResolvedValue([
      { id: 1, name: "Primer año" },
      { id: 2, name: "Último año" },
    ]);
    getClassSuggestions.mockResolvedValue({
      students: [{ ...students[0], _class: { year: 2, id: "z" } }],
      recordsAmount: 1,
      studentClass,
      fields: {
        student: fieldDefinitions(studentFieldLabels),
        guardian: fieldDefinitions(guardianFieldLabels),
      },
      guardianClass,
    });
    renderClassLoader();
    await user.click(
      await screen.findByRole("button", { name: "Añadir Estudiante" })
    );
    const documentInput = screen.getByRole("textbox", { name: "Documento" });
    await user.clear(documentInput);
    await user.type(documentInput, "10000102");
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Luis");
    await user.type(screen.getByRole("textbox", { name: "Apellido" }), "Sol");
    await user.click(screen.getByRole("button", { name: /^Inscripción/ }));
    const enrollmentSelect = screen.getByRole("combobox", {
      name: "Sección de inscripción",
    });
    expect(enrollmentSelect).toBeDisabled();
    expect(enrollmentSelect).toHaveValue("2:z");
    expect(
      screen.queryByRole("checkbox", { name: "Matemática" })
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Lengua" }));
    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    expect(
      screen.getByRole("combobox", { name: "Cambiar sección de Luis Sol" })
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() =>
      expect(saveCache).toHaveBeenCalledWith(
        "class_students",
        expect.arrayContaining([
          expect.objectContaining({
            id: "V-10000102",
            _class: { year: 2, id: "z" },
            pendingSubjects: ["language"],
          }),
        ])
      )
    );
  });

  it("manages assigned guardians and registers new guardian records", async () => {
    const user = userEvent.setup();
    cache.class_students = null;
    getClassSuggestions.mockResolvedValue({
      students: [
        {
          ...students[0],
          assignedGuardians: [guardian],
        },
      ],
      studentClass,
      fields: {
        student: fieldDefinitions(studentFieldLabels),
        guardian: fieldDefinitions(guardianFieldLabels),
      },
      guardianClass,
    });
    createGuardian.mockImplementation(async (record) => ({
      ...record,
      id: "V-10000901",
    }));
    renderClassLoader();

    expect(
      await screen.findByRole("columnheader", { name: "Representantes" })
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: "Editar representantes de Ana Pérez",
      })
    );
    expect(screen.getByText("María Rojas")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: "Quitar representante María Rojas",
      })
    );
    await user.click(
      screen.getByRole("button", { name: "Agregar representante" })
    );

    const guardianId = screen.getByRole("textbox", { name: "Cédula" });
    await user.clear(guardianId);
    await user.type(guardianId, "10000901");
    await user.type(screen.getByRole("textbox", { name: "Nombres" }), "Mario");
    await user.type(screen.getByRole("textbox", { name: "Apellidos" }), "Mora");
    await user.type(screen.getByLabelText("Fecha de Nacimiento"), "1985-03-04");
    await user.type(
      screen.getByRole("textbox", { name: "Rol Legal" }),
      "Padre"
    );
    await user.type(
      screen.getByRole("textbox", { name: "Teléfono" }),
      "1234567"
    );
    await user.selectOptions(screen.getByRole("combobox", { name: "Teléfono: prefijo" }), "0414");
    await user.type(
      screen.getByRole("textbox", { name: "Dirección" }),
      "Avenida Central"
    );
    await user.click(screen.getByRole("button", { name: "Aceptar" }));

    await waitFor(() => expect(createGuardian).toHaveBeenCalledOnce());
    expect(await screen.findByText("Mario Mora")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Aceptar" }));

    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() =>
      expect(saveCache).toHaveBeenCalledWith(
        "class_students",
        expect.arrayContaining([
          expect.objectContaining({
            id: "V-10000100",
            assignedGuardians: [
              expect.objectContaining({
                id: "V-10000901",
                firstName: "Mario",
                lastName: "Mora",
              }),
            ],
          }),
        ])
      )
    );
    const savedStudents = saveCache.mock.calls.find(
      ([key]) => key === "class_students"
    )[1];
    expect(savedStudents[0].assignedGuardians[0]._locked).toBeUndefined();
  });

  it("uses an exact guardian match without registering a duplicate record", async () => {
    const user = userEvent.setup();
    cache.class_students = null;
    getGuardians.mockImplementation((_periodId, { id }) =>
      Promise.resolve({
        filters: { id },
        rows:
          id === guardian.id
            ? [
                {
                  ...guardian,
                  assignedStudents: [
                    { id: "V-10000007", firstName: "Sara", lastName: "Sol" },
                  ],
                },
              ]
            : [],
        recordsAmount: id === guardian.id ? 1 : 0,
      })
    );
    renderClassLoader();

    await user.click(
      await screen.findByRole("button", {
        name: "Editar representantes de Ana Pérez",
      })
    );
    await user.click(
      screen.getByRole("button", { name: "Agregar representante" })
    );
    const guardianId = screen.getByRole("textbox", { name: "Cédula" });
    await user.clear(guardianId);
    fireEvent.blur(screen.getByRole("textbox", { name: "Nombres" }));
    expect(screen.getByRole("textbox", { name: "Nombres" })).toHaveAttribute("aria-invalid", "true");
    await user.type(guardianId, "10000900");

    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Nombres" })).toHaveValue(
        "María"
      )
    );
    expect(screen.getByRole("textbox", { name: "Nombres" })).toBeDisabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Aceptar" }));

    expect(await screen.findByText("María Rojas")).toBeInTheDocument();
    expect(createGuardian).not.toHaveBeenCalled();
  });

  it("keeps stale suggestions visible until the current query resolves", async () => {
    const user = userEvent.setup();
    let resolveCurrentRequest;
    getStudents
      .mockResolvedValueOnce({
        recordsAmount: 2,
        filters: { id: "V-7" },
        rows: [
          { id: "V-10000070", firstName: "Sara", lastName: "Sol" },
          { id: "V-10000071", firstName: "Sofía", lastName: "Salas" },
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
      await screen.findByRole("option", { name: /V-10000071/ })
    ).toBeInTheDocument();

    await user.type(documentInput, "2");
    await waitFor(() => expect(getStudents).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("option", { name: /V-10000071/ })).toBeInTheDocument();

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
      fields: {
        student: fieldDefinitions(studentFieldLabels),
        guardian: fieldDefinitions(guardianFieldLabels),
      },
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
      fields: {
        student: fieldDefinitions(studentFieldLabels),
        guardian: fieldDefinitions(guardianFieldLabels),
      },
    });
    renderClassLoader();

    expect(
      await screen.findByRole("button", { name: "Crear sección" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Crear sección" }));
    expect(screen.getByRole("tab", { name: "Sección A" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(
      screen.getByRole("cell", { name: "No hay registros para mostrar." })
    ).toHaveAttribute(
      "colspan",
      String(Object.keys(studentFieldLabels).length + 5)
    );

    await user.click(
      screen.getByRole("button", { name: "Eliminar sección a" })
    );
    expect(
      screen.getByRole("button", { name: "Crear sección" })
    ).toBeInTheDocument();
  });
});
