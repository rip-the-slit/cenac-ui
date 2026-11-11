import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  deleteUser,
  editUser,
  getActiveUser,
  getUsers,
  register,
} from "../../src/auth";
import { ErrorDialogProvider } from "../../src/context/ErrorDialogContext";
import Configuration, {
  ConfigurationIndex,
} from "../../src/routes/root/configuration/Configuration";
import Users, {
  usersAction,
  usersLoader,
} from "../../src/routes/root/configuration/Users";

vi.mock("../../src/auth", () => ({
  deleteUser: vi.fn(),
  editUser: vi.fn(),
  getActiveUser: vi.fn(),
  getUsers: vi.fn(),
  register: vi.fn(),
}));

const users = [
  { id: "admin-1", name: "Ana", userLevel: "Administrador" },
  { id: "teacher-1", name: "Luis", userLevel: "Docente" },
];

function renderConfiguration({
  initialEntry = "/periodo/2025/configuracion",
  userLevel = "Administrador",
} = {}) {
  getActiveUser.mockReturnValue({ id: "admin-1", userLevel });
  getUsers.mockResolvedValue(users);

  const router = createMemoryRouter(
    [
      {
        id: "auth",
        path: "/",
        loader: () => ({
          activeUser: { id: "admin-1", userLevel },
          users,
        }),
        element: (
          <ErrorDialogProvider>
            <Outlet />
          </ErrorDialogProvider>
        ),
        children: [
          {
            id: "period",
            path: "periodo/:periodId",
            loader: () => ({ data: { status: "active" } }),
            element: <Outlet />,
            children: [
              {
                path: "configuracion",
                element: <Configuration />,
                children: [
                  { index: true, element: <ConfigurationIndex /> },
                  {
                    path: "usuarios",
                    element: <Users />,
                    loader: usersLoader,
                    action: usersAction,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    { initialEntries: [initialEntry] }
  );

  render(<RouterProvider router={router} />);
  return router;
}

describe("configuration page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteUser.mockResolvedValue({});
    editUser.mockResolvedValue({});
    register.mockResolvedValue({});
  });

  it("keeps configuration public while hiding the restricted users links", async () => {
    renderConfiguration({ userLevel: "Docente" });

    expect(
      await screen.findByRole("heading", { name: "Configuración" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Usuarios" })
    ).not.toBeInTheDocument();
  });

  it("shows the users section links to administrators", async () => {
    renderConfiguration();

    expect(
      await screen.findByRole("tab", { name: "Usuarios" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /Usuarios Agregue, edite o elimine las cuentas/,
      })
    ).toHaveAttribute("href", "/periodo/2025/configuracion/usuarios");
  });

  it("stages edits, additions and deletions until saving", async () => {
    const user = userEvent.setup();
    renderConfiguration({
      initialEntry: "/periodo/2025/configuracion/usuarios",
    });

    expect(
      await screen.findByRole("button", { name: "Eliminar usuario Ana" })
    ).toBeDisabled();
    await user.click(
      await screen.findByRole("button", { name: "Editar usuario Ana" })
    );
    expect(screen.queryByText("Luis")).not.toBeInTheDocument();

    const nameInput = screen.getByRole("textbox", { name: "Nombre" });
    await user.clear(nameInput);
    await user.type(nameInput, "Ana Editada");
    expect(
      screen.getByRole("combobox", { name: "Nivel de usuario" })
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Aceptar" }));

    await user.click(screen.getByRole("button", { name: "Agregar usuario" }));
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Marta");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Nivel de usuario" }),
      "Coordinador"
    );
    await user.type(screen.getByLabelText("Contraseña"), "104Pj.245");
    await user.click(screen.getByRole("button", { name: "Aceptar" }));

    await user.click(
      screen.getByRole("button", { name: "Eliminar usuario Luis" })
    );

    expect(editUser).not.toHaveBeenCalled();
    expect(register).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await vi.waitFor(() => {
      expect(editUser).toHaveBeenCalledWith({
        id: "admin-1",
        name: "Ana Editada",
        userLevel: "Administrador",
      });
      expect(register).toHaveBeenCalledWith({
        name: "Marta",
        password: "104Pj.245",
        userLevel: "Coordinador",
      });
      expect(deleteUser).toHaveBeenCalledWith("teacher-1");
    });
  });

  it("sends an existing user's password only when it is changed", async () => {
    const user = userEvent.setup();
    renderConfiguration({
      initialEntry: "/periodo/2025/configuracion/usuarios",
    });

    await user.click(
      await screen.findByRole("button", { name: "Editar usuario Luis" })
    );
    await user.type(screen.getByLabelText("Contraseña"), "aB.1947");
    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await vi.waitFor(() => {
      expect(editUser).toHaveBeenCalledWith({
        id: "teacher-1",
        name: "Luis",
        password: "aB.1947",
        userLevel: "Docente",
      });
    });
  });

  it("validate password creation", async () => {
    const user = userEvent.setup();
    const requirements = ["Mayúsculas", "Minúsculas", "Números", "Símbolos"];

    renderConfiguration({
      initialEntry: "/periodo/2025/configuracion/usuarios",
    });

    await user.click(await screen.findByRole("button", { name: "Agregar usuario" }));
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Mateo");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Nivel de usuario" }),
      "Coordinador"
    );
    await user.type(screen.getByLabelText("Contraseña"), "1234");
    await user.click(screen.getByRole("button", { name: "Aceptar" }));

    expect(screen.getByRole("textbox", { name: "Nombre" })).toBeInTheDocument();

    for (const r of requirements)
      expect(screen.getByText(r)).toHaveAttribute(
        "aria-checked",
        ["Números"].includes(r) ? "true" : "false"
      );

    await user.type(screen.getByLabelText("Contraseña"), "1234A");
    for (const r of requirements)
      expect(screen.getByText(r)).toHaveAttribute(
        "aria-checked",
        ["Números", "Mayúsculas"].includes(r) ? "true" : "false"
      );

    await user.type(screen.getByLabelText("Contraseña"), "1234Aa");
    for (const r of requirements)
      expect(screen.getByText(r)).toHaveAttribute(
        "aria-checked",
        ["Números", "Mayúsculas", "Minúsculas"].includes(r) ? "true" : "false"
      );

    await user.type(screen.getByLabelText("Contraseña"), "1234Aa.");
    for (const r of requirements)
      expect(screen.getByText(r)).toHaveAttribute(
        "aria-checked",
        "true"
      );
  });
});
