import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { expect, it, vi } from "vitest";
import UserSelector from "../../src/routes/login/UserSelector";
import { PeriodSelector } from "../../src/routes/root/PeriodSelector";

it("shows at most five period choices per batch, including all periods", async () => {
  const user = userEvent.setup();
  const list = Array.from({ length: 6 }, (_, index) => ({
    id: index + 1, startYear: 2025 - index, endYear: 2026 - index,
  }));
  render(<MemoryRouter><PeriodSelector currentId={1} list={list} /></MemoryRouter>);
  await user.click(screen.getByRole("button", { name: "2025 - 2026" }));
  expect(screen.getAllByRole("link")).toHaveLength(5);
  expect(screen.getByRole("link", { name: "Todos los períodos" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Ver anteriores" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Ver siguientes" }));
  expect(screen.getAllByRole("link")).toHaveLength(2);
  expect(screen.getByRole("button", { name: "Ver siguientes" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Ver anteriores" }));
  expect(screen.getAllByRole("link")).toHaveLength(5);
});

it("pages users locally in batches of three and allows selecting a later user", async () => {
  const user = userEvent.setup();
  const users = Array.from({ length: 4 }, (_, index) => ({
    id: index + 1, name: `Usuario ${index + 1}`,
  }));
  const setUserId = vi.fn();
  render(<UserSelector users={users} userId={1} setUserId={setUserId} />);
  await user.click(screen.getByRole("button", { name: /Usuario 1/ }));
  expect(screen.getAllByRole("listitem")).toHaveLength(3);
  await user.click(screen.getByRole("button", { name: "Ver siguientes" }));
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
  await user.click(screen.getByText("Usuario 4"));
  expect(setUserId).toHaveBeenCalledWith(4);
  expect(screen.queryByRole("list")).not.toBeInTheDocument();
});
