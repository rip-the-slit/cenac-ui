import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import StatusIcon from "../../src/components/StatusIcon";

describe("StatusIcon", () => {
  it.each([
    ["pending", "Pendiente"],
    ["passed", "Aprobado"],
    ["failed", "Reprobado"],
    ["unknown", "unknown"],
  ])("provides an accessible label for %s", (status, label) => {
    render(<StatusIcon status={status} />);
    expect(screen.getByRole("img", { name: label })).toHaveAttribute("title", label);
  });

  it("does not render an icon when no status is supplied", () => {
    render(<StatusIcon />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
