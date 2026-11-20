import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import routes from "../../src/routes";
import { getPeriodStats } from "../../src/db";

vi.mock("../../src/auth", async (importOriginal) => {
  const user = { id: "teacher", name: "Docente", userLevel: "Profesor" };
  return {
    ...await importOriginal(),
    getActiveUser: () => user,
    getUsers: async () => [user],
  };
});

vi.mock("../../src/db", async (importOriginal) => ({
  ...await importOriginal(),
  getPeriodList: async () => [{ id: "2025", startYear: 2025, endYear: 2026 }],
  getPeriodStats: vi.fn(),
}));

beforeEach(() => {
  getPeriodStats.mockResolvedValue({ status: "active", stats: {} });
});

function renderHelp(path = "/periodo/2025/ayuda") {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
}

it("links to each PDF from the index and the tabs", async () => {
  const user = userEvent.setup();
  renderHelp();
  const tabs = within(await screen.findByRole("tablist", { name: "Manuales de ayuda" }));
  expect(screen.getByRole("link", { name: "Centro de Ayuda" })).toHaveAttribute("href", "/periodo/2025/ayuda");
  expect(tabs.getByRole("tab", { name: "Índice" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("link", { name: /Instalación y configuración/ })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Solución de problemas/ })).toBeInTheDocument();

  await user.click(screen.getByRole("link", { name: /Manual general/ }));
  expect(await screen.findByTitle("Manual general")).toHaveAttribute("src", expect.stringContaining("manual-general"));
  await user.click(tabs.getByRole("tab", { name: "Instalación y configuración" }));
  expect(await screen.findByTitle("Instalación y configuración")).toHaveAttribute("src", expect.stringContaining("manual-instalacion-y-configuracion"));
  await user.click(tabs.getByRole("tab", { name: "Solución de problemas" }));
  const viewer = await screen.findByTitle("Solución de problemas");
  expect(viewer).toHaveAttribute("src", expect.stringContaining("manual-solucion-de-problemas"));
  expect(screen.getByRole("link", { name: "Abrir PDF en otra pestaña" })).toHaveAttribute("href", viewer.getAttribute("src"));
  await user.click(tabs.getByRole("tab", { name: "Índice" }));
  expect(await screen.findByRole("link", { name: /Manual general/ })).toBeInTheDocument();
});

it("opens a manual directly even when the period has not been loaded", async () => {
  getPeriodStats.mockResolvedValue({ status: "active", stats: null });
  renderHelp("/periodo/2025/ayuda/instalacion-y-configuracion");
  expect(await screen.findByTitle("Instalación y configuración")).toBeInTheDocument();
});
