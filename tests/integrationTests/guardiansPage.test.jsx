import { fieldDefinitions } from "../fieldFixtures";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Guardians, { guardiansLoader } from "../../src/routes/root/guardians/Guardians";
import GuardianDetail, { guardianDetailLoader } from "../../src/routes/root/guardians/GuardianDetail";
import { getGuardianById, getGuardians } from "../../src/db";

vi.mock("../../src/db", () => ({
  getGuardianById: vi.fn(),
  getGuardians: vi.fn(),
}));

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
  id: "V-9001",
  firstName: "María",
  lastName: "Rojas",
  birthDate: "1980-01-01",
  legalRole: "Madre",
  phone: "04120000000",
  address: "Caracas",
  assignedStudents: [
    { id: "V-1001", firstName: "Ana", lastName: "Pérez" },
  ],
};
const response = {
  recordsAmount: 40,
  fields: fieldDefinitions(guardianFieldLabels),
  rows: [guardian],
};

function renderGuardians(initialEntry = "/periodo/2025/representantes") {
  const loader = vi.fn(guardiansLoader);
  const router = createMemoryRouter(
    [
      {
        path: "/periodo/:periodId/representantes",
        element: <Guardians />,
        loader,
        children: [
          {
            path: ":guardianId",
            element: <GuardianDetail />,
            loader: guardianDetailLoader,
          },
        ],
      },
      {
        path: "/periodo/:periodId/estudiantes/:studentId",
        element: <div>Detalle estudiante</div>,
      },
    ],
    { initialEntries: [initialEntry] }
  );
  render(<RouterProvider router={router} />);
  return { loader, router };
}

function latestLoaderUrl(loader) {
  return new URL(loader.mock.calls.at(-1)[0].request.url);
}

describe("Representantes page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getGuardians.mockResolvedValue(response);
    getGuardianById.mockResolvedValue({ guardian, fields: fieldDefinitions(guardianFieldLabels) });
  });

  it("renders guardian records and links represented students", async () => {
    renderGuardians();
    const table = await screen.findByRole("table");
    for (const header of [
      "Seleccionar todos",
      ...Object.values(guardianFieldLabels),
      "Estudiantes representados",
    ]) {
      expect(within(table).getByRole("columnheader", { name: header })).toBeInTheDocument();
    }
    expect(within(table).getByRole("link", { name: "María" })).toHaveAttribute(
      "href",
      "/periodo/2025/representantes/V-9001"
    );
    expect(within(table).getByRole("link", { name: "Ana Pérez" })).toHaveAttribute(
      "href",
      "/periodo/2025/estudiantes/V-1001"
    );
  });

  it("auto-applies guardian and represented-student filters", async () => {
    const { loader } = renderGuardians();
    const firstName = await screen.findByLabelText("Nombres");
    const studentQ = screen.getByLabelText("Estudiante representado");

    fireEvent.change(firstName, { target: { value: "María" } });
    fireEvent.change(studentQ, { target: { value: "Ana" } });

    await waitFor(() => {
      expect(Object.fromEntries(latestLoaderUrl(loader).searchParams)).toEqual({
        firstName: "María",
        studentQ: "Ana",
        page: "1",
      });
    });
    expect(getGuardians).toHaveBeenLastCalledWith(
      expect.objectContaining({ firstName: "María", studentQ: "Ana", limit: 20 })
    );
  });

  it("opens and returns from a read-only guardian detail", async () => {
    const user = userEvent.setup();
    renderGuardians();
    await user.click(await screen.findByRole("link", { name: "María" }));

    expect(await screen.findByRole("heading", { name: "Detalle del Representante" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("V-9001")).toHaveAttribute("readonly");
    expect(screen.getByRole("link", { name: "Ana Pérez" })).toHaveAttribute("href", "/periodo/2025/estudiantes/V-1001");
    expect(screen.queryByRole("button", { name: /guardar/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Volver a la lista de representantes" }));
    expect(await screen.findByRole("table")).toBeInTheDocument();
  });
});
