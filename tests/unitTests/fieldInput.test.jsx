import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FieldInput from "../../src/components/FieldInput";
import IdInput from "../../src/routes/root/load/class/IdInput";

describe("FieldInput validation", () => {
  it("shows custom messages on blur and clears them after correction", () => {
    render(<FieldInput aria-label="Nombre" definition={{ required: true, validationMessages: { valueMissing: "Ingrese su nombre" } }} />);
    const input = screen.getByRole("textbox");
    expect(screen.queryByText("Ingrese su nombre")).not.toBeInTheDocument();
    fireEvent.blur(input);
    expect(screen.getByText("Ingrese su nombre")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
    fireEvent.change(input, { target: { value: "Ana" } });
    expect(screen.queryByText("Ingrese su nombre")).not.toBeInTheDocument();
  });

  it("shows select errors when the form checks validity", () => {
    render(<form noValidate><FieldInput aria-label="Rol" definition={{ type: "select", required: true, validationMessages: { valueMissing: "Seleccione un rol" }, options: [{ value: "admin", label: "Administrador" }] }} /></form>);
    const select = screen.getByRole("combobox");
    fireEvent.invalid(select);
    expect(screen.getByText("Seleccione un rol")).toBeInTheDocument();
    fireEvent.change(select, { target: { value: "admin" } });
    expect(screen.queryByText("Seleccione un rol")).not.toBeInTheDocument();
  });

  it("allows replacing default styles and customizing error styles", () => {
    render(<FieldInput required replaceClassName className="custom-input" invalidClassName="custom-invalid" errorClassName="custom-error" validationMessages={{ valueMissing: "Requerido" }} />);
    const input = screen.getByRole("textbox");
    fireEvent.blur(input);
    expect(input).toHaveClass("custom-input", "custom-invalid");
    expect(input).not.toHaveClass("rounded-lg");
    expect(screen.getByText("Requerido")).toHaveClass("custom-error");
  });

  it("clears feedback after population without replacing the input", () => {
    const { rerender } = render(<FieldInput required validationKey={0} />);
    const input = screen.getByRole("textbox");
    fireEvent.blur(input);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    rerender(<FieldInput required validationKey={1} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBe(input);
  });

  it("uses the ID patterns supplied by the server for each prefix", () => {
    const definition = { pattern: { v: "[0-9]{3}", e: "[0-9]{4}" } };
    const { rerender } = render(<IdInput value="V-123" definition={definition} />);
    expect(screen.getByRole("textbox")).toBeValid();
    rerender(<IdInput value="E-1234" definition={definition} />);
    expect(screen.getByRole("textbox")).toBeValid();
  });

  it.each([
    ["V-30000000", true], ["V-80000000", false],
    ["E-80000000", true], ["E-30000000", false],
    ["V-300", false],
  ])("validates the new ID format %s", (value, valid) => {
    render(<IdInput value={value} definition={{ pattern: { v: "[1-7][0-9]{7}", e: "[89][0-9]{7}" } }} validationMessages={{ patternMismatch: "Cédula inválida" }} />);
    const input = screen.getByRole("textbox");
    fireEvent.blur(input);
    if (valid) expect(input).toBeValid();
    else expect(screen.getByText("Cédula inválida")).toBeInTheDocument();
  });
});
