import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryRouter,
  Outlet,
  RouterProvider,
} from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { login, logout } from "../../src/auth";
import Login, { loginAction } from "../../src/routes/login/Login";
import { ErrorDialogProvider } from "../../src/context/ErrorDialogContext";
import App from "../../src/routes/root/App";

vi.mock("../../src/auth", () => ({
  login: vi.fn(),
  logout: vi.fn(),
}));

const users = [
  { id: "admin", name: "Administración", type: "Administrador" },
  { id: "teacher-7", name: "Docente", type: "Personal" },
];

function createAuthRouter(initialEntry) {
  return createMemoryRouter(
    [
      {
        id: "auth",
        path: "/",
        loader: () => ({ activeUser: users[0], users }),
        element: (
          <ErrorDialogProvider>
            <Outlet />
          </ErrorDialogProvider>
        ),
        children: [
          {
            path: "ingresar",
            element: <Login />,
            action: loginAction,
          },
          {
            path: "periodo/:periodId",
            element: <App />,
            loader: () => ({
              list: [{ id: "2025" }],
              data: { stats: {} },
              periodId: "2025",
              url: new URL("http://localhost/periodo/2025"),
            }),
          },
        ],
      },
    ],
    { initialEntries: [initialEntry] }
  );
}

describe("login flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    login.mockResolvedValue({});
    logout.mockResolvedValue({});
  });

  it("uses the usuario query parameter as the default login user", async () => {
    const user = userEvent.setup();
    const router = createAuthRouter("/ingresar?usuario=teacher-7");
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", {
        name: "Iniciar sesión como Docente",
      })
    ).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Ingrese su contraseña"), "secret");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(login).toHaveBeenCalledWith({ id: "teacher-7", password: "secret" });
  });

  it("logs out and opens login for the selected user", async () => {
    const user = userEvent.setup();
    const router = createAuthRouter("/periodo/2025");
    render(<RouterProvider router={router} />);

    await user.click(
      await screen.findByRole("button", { name: /Administración/ })
    );
    await user.click(screen.getByText("Docente"));

    expect(logout).toHaveBeenCalledOnce();
    await vi.waitFor(() => {
      expect(router.state.location.pathname).toBe("/ingresar");
      expect(router.state.location.search).toBe("?usuario=teacher-7");
    });
  });
});
