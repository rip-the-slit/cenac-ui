import { act, render, screen, waitFor } from "@testing-library/react";
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

function createAuthRouter(initialEntry, gradesLoader = () => null) {
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
            children: [
              { index: true, element: <p>Resumen del período</p> },
              {
                path: "notas",
                loader: gradesLoader,
                element: <p>Notas del período</p>,
              },
            ],
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
        name: "Ingresar como Docente",
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

  it("disables the login button while the submission is pending", async () => {
    const user = userEvent.setup();
    let finishLogin;
    login.mockReturnValue(new Promise((resolve) => { finishLogin = resolve; }));
    render(<RouterProvider router={createAuthRouter("/ingresar")} />);

    await user.type(await screen.findByPlaceholderText("Ingrese su contraseña"), "secret");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));
    expect(await screen.findByRole("button", { name: "Ingresando…" })).toBeDisabled();
    await act(async () => finishLogin({}));
    expect(await screen.findByRole("button", { name: "Ingresar" })).toBeEnabled();
  });

  it("shows a loading indicator while navigating and keeps the current page visible", async () => {
    const user = userEvent.setup();
    let finishLoading;
    const pendingPage = new Promise((resolve) => {
      finishLoading = resolve;
    });
    const router = createAuthRouter("/periodo/2025", () => pendingPage);
    render(<RouterProvider router={router} />);

    await screen.findByText("Resumen del período");
    expect(
      screen.queryByRole("status", { name: "Cargando página" })
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Notas" }));

    expect(
      await screen.findByRole("status", { name: "Cargando página" })
    ).toBeInTheDocument();
    expect(screen.getByText("Resumen del período")).toBeInTheDocument();

    await act(async () => finishLoading(null));
    expect(await screen.findByText("Notas del período")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByRole("status", { name: "Cargando página" })
      ).not.toBeInTheDocument()
    );
  });
});
