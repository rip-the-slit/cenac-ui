import { fieldDefinitions } from "../fieldFixtures";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorDialogProvider } from "../../src/context/ErrorDialogContext";
import { getActiveUser } from "../../src/auth";
import {
  clearCache,
  createGuardian,
  getCache,
  getClassSuggestions,
  getSubjectSuggestions,
  getGuardians,
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
  getCache: vi.fn(),
  getClassSuggestions: vi.fn(),
  getSubjectSuggestions: vi.fn(),
  getGuardians: vi.fn(),
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
  id: "V-900",
  firstName: "María",
  lastName: "Rojas",
  birthDate: "1980-01-02",
  legalRole: "Madre",
  phone: "04121234567",
  address: "Calle Principal",
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
    getGuardians.mockImplementation(({ id }) =>
      Promise.resolve({
        filters: { id },
        rows: [],
        recordsAmount: 0,
      })
    );
    createGuardian.mockImplementation((guardian) => Promise.resolve(guardian));
    getPeriodList.mockResolvedValue([{ id: "2025" }]);
    getStudents.mockResolvedValue({
      recordsAmount: 0,
      rows: [],
      fields: fieldDefinitions(studentFieldLabels),
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

  it("falls back to server suggestions when the subject cache is empty", async () => {
    cache.subjects = null;
    renderSubjectLoader();

    for (const subject of subjects) {
      expect(
        await screen.findByRole("checkbox", { name: subject.name })
      ).toBeChecked();
    }
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
      await user.type(screen.getByRole("combobox", { name }), place);
      await user.click(await screen.findByRole("option", { name: place }));
    }
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
    await user.type(documentInput, "100");
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Otra");
    await user.type(
      screen.getByRole("textbox", { name: "Apellido" }),
      "Persona"
    );
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
      filters: { id: "V-777" },
      rows: [
        {
          id: "V-777",
          firstName: "Sara",
          lastName: "Sol",
          _class: { year: 2, id: "Z" },
        },
      ],
    });
    getClassSuggestions.mockResolvedValue({
      students: [
        {
          id: "V-777",
          firstName: "Sara",
          lastName: "Sol",
          _class: { year: 2, id: "Z" },
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
        id: "V-10020",
        firstName: "Ana",
        lastName: "Pérez",
        _class: { year: 2, id: "A" },
      },
      {
        id: "V-10030",
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
    await user.type(documentInput, "777");

    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveValue(
        "Sara"
      )
    );
    expect(documentInput).not.toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Nombre" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Apellido" })).toBeDisabled();
    expect(
      screen.getByText(/únicamente puede cambiar su inscripción/i)
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Inscripción/ }));
    expect(screen.getByText(/Matemática/i)).toBeInTheDocument();
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

    await user.type(unlockedDocumentInput, "778");

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
            id: "V-778",
            firstName: "Sara",
            lastName: "Sol",
            _class: { year: 2, id: "B" },
          }),
        ])
      )
    );
    const saved = saveCache.mock.calls.find(
      ([key]) => key === "class_students"
    )[1];
    expect(
      saved.find((student) => student.id === "V-778")._locked
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
    await user.type(documentInput, "102");
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
            id: "V-102",
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
            id: "V-100",
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
          id: "V-103",
          firstName: "Luis",
          lastName: "Sol",
          _class: { year: 9, id: "z" },
        },
        {
          id: "V-104",
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
    await user.type(documentInput, "102");
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
            id: "V-102",
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
      id: "V-901",
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
    await user.type(guardianId, "901");
    await user.type(screen.getByRole("textbox", { name: "Nombres" }), "Mario");
    await user.type(screen.getByRole("textbox", { name: "Apellidos" }), "Mora");
    await user.type(screen.getByLabelText("Fecha de Nacimiento"), "1985-03-04");
    await user.type(
      screen.getByRole("textbox", { name: "Rol Legal" }),
      "Padre"
    );
    await user.type(
      screen.getByRole("textbox", { name: "Teléfono" }),
      "04141234567"
    );
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
            id: "V-100",
            assignedGuardians: [
              expect.objectContaining({
                id: "V-901",
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
    getGuardians.mockImplementation(({ id }) =>
      Promise.resolve({
        filters: { id },
        rows:
          id === guardian.id
            ? [
                {
                  ...guardian,
                  assignedStudents: [
                    { id: "V-7", firstName: "Sara", lastName: "Sol" },
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
    await user.type(guardianId, "900");

    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Nombres" })).toHaveValue(
        "María"
      )
    );
    expect(screen.getByRole("textbox", { name: "Nombres" })).toBeDisabled();
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
      await screen.findByRole("option", { name: /V-71/ })
    ).toBeInTheDocument();

    await user.type(documentInput, "2");
    await waitFor(() => expect(getStudents).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("option", { name: /V-71/ })).toBeInTheDocument();

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
