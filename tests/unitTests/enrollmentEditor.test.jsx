import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import EnrollmentEditor from "../../src/routes/root/load/class/EnrollmentEditor";

const years = [
  { id: 1, name: "Primer año" }, { id: 2, name: "Segundo año" },
  { id: 5, name: "Quinto año" },
];
const enrollment = {
  years,
  classesByYear: { 1: { A: { className: "A" }, B: { className: "B" } }, 2: { A: { className: "A" } }, 5: { z: { className: "z" } } },
  subjectsByYear: {},
};

describe("enrollment year history", () => {
  it.each([
    [2, 2, "Este estudiante repitió Segundo año."],
    [2, 1, "Este estudiante pasó de Primer año."],
  ])("describes target year %s and original year %s", (year, originalYear, message) => {
    render(<EnrollmentEditor enrollment={enrollment} student={{ _class: { id: "A", year, originalYear } }} locked onBack={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it("does not display progression for a final-year floating enrollment", () => {
    render(<EnrollmentEditor enrollment={enrollment} student={{ _class: { id: "z", year: 5, originalYear: 5 } }} locked onBack={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByText(/Este estudiante (repitió|pasó de)/)).not.toBeInTheDocument();
  });

  it("does not invent history for a new enrollment", () => {
    render(<EnrollmentEditor enrollment={enrollment} student={{ _class: { id: "A", year: 1 } }} onBack={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByText(/Este estudiante (repitió|pasó de)/)).not.toBeInTheDocument();
  });

  it("preserves the original year after changing section and confirming", async () => {
    const onConfirm = vi.fn();
    render(<EnrollmentEditor enrollment={enrollment} student={{ _class: { id: "A", year: 1, originalYear: 1 } }} onBack={vi.fn()} onConfirm={onConfirm} />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Sección de inscripción" }), "1:B");
    expect(screen.getByText("Este estudiante repitió Primer año.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Aceptar" }));
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ _class: { id: "B", year: 1, originalYear: 1 } }));
  });
});
