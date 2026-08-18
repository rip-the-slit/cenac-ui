import { describe, expect, it } from "vitest";

import {
  createFilterSearchParams,
  getViewFilters,
  pickClasses,
} from "../../../src/routes/root/students/studentsUtils";

function formDataFrom(entries = []) {
  const formData = new FormData();
  for (const [name, value] of entries) formData.append(name, value);
  return formData;
}

describe("student filter utilities", () => {
  it("selects classes for a year or combines all available classes", () => {
    const classesByYear = {
      1: ["1-B", "1-A"],
      2: ["2-A", "1-A"],
    };

    expect(pickClasses(classesByYear, "1")).toEqual(["1-B", "1-A"]);
    expect(pickClasses(classesByYear, "")).toEqual(["1-A", "1-B", "2-A"]);
  });

  it("uses pending filter values and loader fallbacks", () => {
    const filters = {
      id: "V-1",
      firstName: "Ana",
      lastName: "Pérez",
      birthDate: "2010-01-01",
      birthPlace: "Caracas",
      year: "1",
      classId: "1-A",
      status: "Activo",
      page: "2",
    };
    const pending = formDataFrom([
      ["firstName", "Luis"],
      ["year", ""],
      ["class", ""],
      ["status", "Retirado"],
      ["page", "1"],
    ]);

    expect(getViewFilters(filters, pending)).toEqual({
      ...filters,
      firstName: "Luis",
      year: "",
      classId: "",
      status: "Retirado",
      page: "1",
    });
  });

  it("creates encoded student search parameters without an orphaned class", () => {
    const params = createFilterSearchParams({
      id: "V 1",
      firstName: "José",
      lastName: "Pérez",
      birthDate: "2010-01-01",
      birthPlace: "Los Teques",
      year: "",
      classId: "1-A",
      status: "Retirado",
      page: "3",
    });

    expect(Object.fromEntries(params)).toEqual({
      id: "V 1",
      firstName: "José",
      lastName: "Pérez",
      birthDate: "2010-01-01",
      birthPlace: "Los Teques",
      status: "Retirado",
      page: "3",
    });
  });
});
