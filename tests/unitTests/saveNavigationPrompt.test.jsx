import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Form, Link, RouterProvider, createMemoryRouter, redirect } from "react-router";
import useSaveNavigationPrompt from "../../src/routes/root/load/useSaveNavigationPrompt";

afterEach(() => vi.restoreAllMocks());

function Editor({ enabled }) {
  const allowSaveNavigation = useSaveNavigationPrompt(enabled);
  return <><Link to="/other">Salir</Link><Form method="post" onSubmit={allowSaveNavigation}><button>Guardar</button></Form></>;
}

function renderEditor(enabled = true, action = () => redirect("/other")) {
  const router = createMemoryRouter([
    { path: "/", element: <Editor enabled={enabled} />, action },
    { path: "/other", element: <p>Destino</p> },
  ]);
  render(<RouterProvider router={router} />);
  return router;
}

describe("save navigation prompt", () => {
  it.each([true, false])("confirms leaving and respects the answer (%s)", async (accepted) => {
    vi.spyOn(window, "confirm").mockReturnValue(accepted);
    const router = renderEditor();
    await userEvent.click(screen.getByRole("link", { name: "Salir" }));
    await waitFor(() => expect(window.confirm).toHaveBeenCalledOnce());
    await waitFor(() => expect(router.state.location.pathname).toBe(accepted ? "/other" : "/"));
  });

  it("allows navigation when protection is disabled", async () => {
    vi.spyOn(window, "confirm");
    renderEditor(false);
    await userEvent.click(screen.getByRole("link", { name: "Salir" }));
    expect(await screen.findByText("Destino")).toBeInTheDocument();
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it("lets a saving submission redirect without prompting", async () => {
    vi.spyOn(window, "confirm");
    renderEditor();
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Destino")).toBeInTheDocument();
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it("protects subsequent navigation after a failed save", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const router = renderEditor(true, () => new Error("No se pudo guardar"));
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(router.state.navigation.state).toBe("idle"));
    await userEvent.click(screen.getByRole("link", { name: "Salir" }));
    await waitFor(() => expect(window.confirm).toHaveBeenCalledOnce());
    expect(router.state.location.pathname).toBe("/");
  });
});
