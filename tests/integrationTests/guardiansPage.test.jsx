import { fieldDefinitions } from "../fieldFixtures";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Guardians, { guardiansLoader } from "../../src/routes/root/guardians/Guardians";
import GuardianDetail, { guardianDetailLoader } from "../../src/routes/root/guardians/GuardianDetail";
import { editGuardian, getGuardianById, getGuardians } from "../../src/db";
import { ErrorDialogProvider } from "../../src/context/ErrorDialogContext";

vi.mock("../../src/db", () => ({
  getGuardianById: vi.fn(),
  getGuardians: vi.fn(),
  editGuardian: vi.fn(),
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
  render(<ErrorDialogProvider><RouterProvider router={router} /></ErrorDialogProvider>);
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

  it("shows an empty message across the guardian table", async () => {
    getGuardians.mockResolvedValue({ ...response, rows: [], recordsAmount: 0 });
    renderGuardians();
    const message = await screen.findByRole("cell", { name: "No hay registros para mostrar." });
    expect(message).toHaveAttribute("colspan", String(Object.keys(guardianFieldLabels).length + 2));
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
    expect(screen.getByText("V-9001")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ana Pérez" })).toHaveAttribute("href", "/periodo/2025/estudiantes/V-1001");
    expect(screen.queryByRole("button", { name: /guardar/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Volver a la lista de representantes" }));
    expect(await screen.findByRole("table")).toBeInTheDocument();
  });

  it("edits guardian fields with the cédula disabled and refreshes the displayed text", async () => {
    const user = userEvent.setup();
    editGuardian.mockImplementation(async () => {
      getGuardianById.mockResolvedValue({
        guardian: { ...guardian, phone: "04269999999" },
        fields: fieldDefinitions(guardianFieldLabels),
      });
    });
    renderGuardians("/periodo/2025/representantes/V-9001");
    await user.click(await screen.findByRole("button", { name: "Editar representante" }));
    const editor = within(screen.getByRole("dialog", { name: "Editar representante" }));
    expect(editor.getByRole("textbox", { name: "Cédula" })).toBeDisabled();
    expect(editor.getByRole("combobox", { name: "Cédula: tipo" })).toBeDisabled();
    const phone = editor.getByRole("textbox", { name: "Teléfono" });
    await user.clear(phone);
    await user.type(phone, "04269999999");
    await user.click(editor.getByRole("button", { name: "Aceptar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("04269999999")).toBeInTheDocument();
    expect(editGuardian).toHaveBeenCalledWith(guardian.id, {
      firstName: guardian.firstName, lastName: guardian.lastName,
      birthDate: guardian.birthDate, legalRole: guardian.legalRole,
      phone: "04269999999", address: guardian.address,
    });
    expect(screen.getByRole("link", { name: "Ana Pérez" })).toBeInTheDocument();
  });

  it("preserves guardian changes on failure and cancels without updating the detail", async () => {
    const user = userEvent.setup();
    editGuardian.mockRejectedValue(new Error("No se pudo guardar el representante"));
    renderGuardians("/periodo/2025/representantes/V-9001");
    await user.click(await screen.findByRole("button", { name: "Editar representante" }));
    const editor = within(screen.getByRole("dialog", { name: "Editar representante" }));
    const address = editor.getByRole("textbox", { name: "Dirección" });
    await user.clear(address);
    await user.type(address, "Maracay");
    await user.click(editor.getByRole("button", { name: "Aceptar" }));
    expect(await screen.findByText("No se pudo guardar el representante")).toBeInTheDocument();
    expect(address).toHaveValue("Maracay");
    await user.click(screen.getByRole("button", { name: "Cerrar error" }));
    await user.click(editor.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Caracas")).toBeInTheDocument();
  });
});
