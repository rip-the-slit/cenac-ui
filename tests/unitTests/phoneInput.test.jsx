import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import PhoneInput from "../../src/routes/root/load/class/PhoneInput";

function PhoneField({ initialValue = "", definition = {} }) {
  const [value, setValue] = useState(initialValue);
  return <><PhoneInput definition={definition} value={value} onChange={setValue} /><output aria-label="Valor completo">{value}</output></>;
}

describe("PhoneInput", () => {
  it("splits a saved phone and serializes prefix and number changes", () => {
    render(<PhoneField initialValue="04121234567" />);
    expect(screen.getByRole("textbox")).toHaveValue("1234567");
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "0212" } });
    expect(screen.getByLabelText("Valor completo")).toHaveTextContent("02121234567");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "98a7654321" } });
    expect(screen.getByLabelText("Valor completo")).toHaveTextContent("02129876543");
  });

  it("groups mobile, fixed and satellite prefixes and includes regional codes", () => {
    render(<PhoneField />);
    expect(screen.getByRole("group", { name: "Telefonía móvil" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Telefonía fija" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "0422 — Digitel" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "0295 — Nueva Esparta" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "0415 — Globalstar / Tesan" })).toBeInTheDocument();
  });

  it("validates the seven-digit number with the server's messages", () => {
    render(<PhoneField definition={{ required: true, validationMessages: { valueMissing: "Ingrese un teléfono", patternMismatch: "Ingrese siete dígitos" } }} />);
    const input = screen.getByRole("textbox");
    fireEvent.blur(input);
    expect(screen.getByText("Ingrese un teléfono")).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "123" } });
    expect(screen.getByText("Ingrese siete dígitos")).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "1234567" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
