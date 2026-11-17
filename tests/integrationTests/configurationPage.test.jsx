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
  { id: "admin-1", name: "Ana", userLevel: "Administrador", phone: "04121234567" },
  { id: "teacher-1", name: "Luis", userLevel: "Profesor", phone: "04249876543" },
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
    renderConfiguration({ userLevel: "Profesor" });

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
    await user.type(screen.getByRole("textbox", { name: "Teléfono" }), "7654321");
    await user.selectOptions(screen.getByRole("combobox", { name: "Teléfono: prefijo" }), "0426");
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
        phone: "04121234567",
      });
      expect(register).toHaveBeenCalledWith({
        name: "Marta",
        password: "104Pj.245",
        userLevel: "Coordinador",
        phone: "04267654321",
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
        userLevel: "Profesor",
        phone: "04249876543",
      });
    });
  });

  it("displays phone numbers and saves a phone-only edit", async () => {
    const user = userEvent.setup();
    renderConfiguration({ initialEntry: "/periodo/2025/configuracion/usuarios" });
    expect(await screen.findByText(users[1].phone)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Editar usuario Luis" }));
    const phone = screen.getByRole("textbox", { name: "Teléfono" });
    expect(phone).toHaveValue("9876543");
    expect(screen.getByRole("combobox", { name: "Teléfono: prefijo" })).toHaveValue("0424");
    await user.clear(phone);
    await user.type(phone, "1234567");
    await user.selectOptions(screen.getByRole("combobox", { name: "Teléfono: prefijo" }), "0212");
    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    expect(screen.getByText("02121234567")).toBeInTheDocument();
    expect(editUser).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await vi.waitFor(() => expect(editUser).toHaveBeenCalledWith({ id: users[1].id, name: users[1].name, userLevel: users[1].userLevel, phone: "02121234567" }));
  });

  it("clears a phone without saving the prefix as a partial number", async () => {
    const user = userEvent.setup();
    renderConfiguration({ initialEntry: "/periodo/2025/configuracion/usuarios" });
    await user.click(await screen.findByRole("button", { name: "Editar usuario Luis" }));
    await user.clear(screen.getByRole("textbox", { name: "Teléfono" }));
    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    expect(screen.queryByText(users[1].phone)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await vi.waitFor(() => expect(editUser).toHaveBeenCalledWith(expect.objectContaining({ id: users[1].id, phone: "" })));
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
