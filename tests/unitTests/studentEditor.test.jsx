import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { StudentEditorModal } from "../../src/routes/root/load/class/StudentEditor";

const bounds = {
  min: { 1: "2010-01-01", 3: "2008-01-01" },
  max: { 1: "2015-12-31", 3: "2013-12-31" },
  validationMessages: {
    1: { rangeUnderflow: "Fecha demasiado temprana para primer año." },
    3: { rangeOverflow: "Fecha demasiado reciente para tercer año." },
  },
};

function renderEditor(year, birthDate, definition = bounds) {
  const onCommit = vi.fn().mockReturnValue(false);
  render(
    <StudentEditorModal
      editor={{
        mode: "create",
        student: { id: "V-30000000", birthDate, _class: { id: "A", year }, assignedGuardians: [{ id: "V-20000000" }] },
      }}
      config={{
        onCommit,
        studentSchema: {
          attributes: ["birthDate"],
          fields: { birthDate: { type: "date", label: "Fecha de nacimiento", ...definition } },
        },
      }}
      onClose={vi.fn()}
    />
  );
  return { onCommit, input: screen.getByLabelText("Fecha de nacimiento") };
}

it.each([
  [1, "2009-12-31", bounds.validationMessages[1].rangeUnderflow],
  ["3", "2014-01-01", bounds.validationMessages[3].rangeOverflow],
])("uses the birth date bounds and messages for enrollment year %s", async (year, date, message) => {
  const { onCommit, input } = renderEditor(year, date);
  expect(input).toHaveAttribute("min", bounds.min[year]);
  expect(input).toHaveAttribute("max", bounds.max[year]);
  await userEvent.click(screen.getByRole("button", { name: "Aceptar" }));
  expect(screen.getByRole("alert")).toHaveTextContent(message);
  expect(onCommit).not.toHaveBeenCalled();

  fireEvent.change(input, { target: { value: bounds.min[year] } });
  await userEvent.click(screen.getByRole("button", { name: "Aceptar" }));
  expect(onCommit).toHaveBeenCalledOnce();
});

it("does not borrow date bounds from another year when none are supplied", () => {
  const { input } = renderEditor(2, "2014-01-01");
  expect(input).not.toHaveAttribute("min");
  expect(input).not.toHaveAttribute("max");
});

it("retains a flat date definition when bounds are not keyed by year", () => {
  const { input } = renderEditor(1, "2009-12-31", {
    min: "2010-01-01", validationMessages: { rangeUnderflow: "Fecha demasiado temprana." },
  });
  fireEvent.blur(input);
  expect(screen.getByRole("alert")).toHaveTextContent("Fecha demasiado temprana.");
});
