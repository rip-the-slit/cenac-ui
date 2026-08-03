import { describe, expect, it } from "vitest";

import {
  calculateAverage,
  createFilterSearchParams,
  formatGrade,
  getViewFilters,
  parseGradeEntries,
  pickClasses,
  safeNumber,
} from "../../../src/routes/root/grades/gradesUtils";

function formDataFrom(entries = []) {
  const formData = new FormData();
  for (const [name, value] of entries) formData.append(name, value);
  return formData;
}

function readGrade(payload, studentId, subjectId, term, slot) {
  const student = payload.find(({ id }) => id === studentId);
  return student?.subjects[subjectId]?.[term]?.[slot];
}

describe("safeNumber", () => {
  it("converts numbers and numeric strings", () => {
    const examples = [
      [0, 0],
      [-4, -4],
      [12.75, 12.75],
      ["0", 0],
      [" 12.75 ", 12.75],
      ["-3.5", -3.5],
      ["1e1", 10],
    ];

    for (const [input, expected] of examples) {
      expect(safeNumber(input)).toBe(expected);
    }
  });

  it("returns null for blank, non-numeric, and non-finite values", () => {
    const invalidValues = [
      "",
      "   ",
      "not-a-number",
      undefined,
      NaN,
      Infinity,
      -Infinity,
    ];

    for (const value of invalidValues) {
      expect(safeNumber(value)).toBeNull();
    }
  });
});

describe("formatGrade", () => {
  it("formats finite numbers with one decimal place", () => {
    expect(formatGrade(0)).toBe("0.0");
    expect(formatGrade(7)).toBe("7.0");
    expect(formatGrade(12.34)).toBe("12.3");
    expect(formatGrade(12.36)).toBe("12.4");
  });

  it("shows a missing-grade marker for other values", () => {
    for (const value of [undefined, null, "12", NaN, Infinity]) {
      expect(formatGrade(value)).toBe("—");
    }
  });
});

describe("calculateAverage", () => {
  it("averages finite values", () => {
    expect(calculateAverage([10, 15, 20])).toBe(15);
    expect(calculateAverage([-2, 3.5])).toBe(0.75);
  });

  it("ignores values that are not finite numbers", () => {
    expect(calculateAverage([10, NaN, Infinity, "15", 20])).toBe(15);
  });

  it("returns null when no finite values are supplied", () => {
    expect(calculateAverage([])).toBeNull();
    expect(calculateAverage([NaN, Infinity, undefined, "10"])).toBeNull();
  });
});

describe("pickClasses", () => {
  const classesByYear = {
    1: ["1-B", "1-A"],
    2: ["2-A", "1-A"],
    3: null,
  };

  it("returns the selected year's classes in their supplied order", () => {
    expect(pickClasses(classesByYear, "1")).toEqual(["1-B", "1-A"]);
    expect(pickClasses(classesByYear, 2)).toEqual(["2-A", "1-A"]);
  });

  it("combines, deduplicates, and sorts classes when no year is selected", () => {
    const snapshot = structuredClone(classesByYear);

    expect(pickClasses(classesByYear, "")).toEqual(["1-A", "1-B", "2-A"]);
    expect(classesByYear).toEqual(snapshot);
  });

  it("returns an empty list for unavailable data", () => {
    expect(pickClasses(classesByYear, "99")).toEqual([]);
    expect(pickClasses(undefined, "1")).toEqual([]);
    expect(pickClasses(null, "")).toEqual([]);
  });
});

describe("parseGradeEntries", () => {
  const entries = [
    ["grade::student-b::science::2::3", "19.5"],
    ["grade::student-a::math::1::2", "14"],
    ["grade::student-a::language::0::1", "16.25"],
    ["grade::student-a::math::0::0", "10"],
    ["grade::student-b::science::0::0", "8"],
  ];

  const expectedGrades = [
    ["student-a", "math", 0, 0, 10],
    ["student-a", "math", 1, 2, 14],
    ["student-a", "language", 0, 1, 16.25],
    ["student-b", "science", 0, 0, 8],
    ["student-b", "science", 2, 3, 19.5],
  ];

  it("returns an empty payload when there are no grade fields", () => {
    expect(parseGradeEntries(formDataFrom())).toEqual([]);
    expect(
      parseGradeEntries(
        formDataFrom([
          ["return_search", "year=1"],
          ["notes", "not a grade"],
        ])
      )
    ).toEqual([]);
  });

  it("groups grades by student, subject, term, and slot regardless of input order", () => {
    for (const orderedEntries of [entries, [...entries].reverse()]) {
      const payload = parseGradeEntries(formDataFrom(orderedEntries));

      expect(payload).toHaveLength(2);
      expect(payload.map(({ id }) => id)).toEqual(
        expect.arrayContaining(["student-a", "student-b"])
      );

      for (const [student, subject, term, slot, value] of expectedGrades) {
        expect(readGrade(payload, student, subject, term, slot)).toBe(value);
      }
    }
  });

  it("keeps grades in their indexed slots, including gaps", () => {
    const payload = parseGradeEntries(
      formDataFrom([
        ["grade::student::subject::1::3", "13"],
        ["grade::student::subject::1::0", "10"],
        ["grade::student::subject::1::2", "12"],
        ["grade::student::subject::1::1", "11"],
        ["grade::student::subject::0::2", "7"],
      ])
    );
    const terms = payload[0].subjects.subject;

    expect(terms[0]).toHaveLength(3);
    expect(0 in terms[0]).toBe(false);
    expect(1 in terms[0]).toBe(false);
    expect(terms[0][2]).toBe(7);
    expect(terms[1]).toEqual([10, 11, 12, 13]);
  });

  it("accepts the numeric formats supported by safeNumber", () => {
    const payload = parseGradeEntries(
      formDataFrom([
        ["grade::student::subject::0::0", "0"],
        ["grade::student::subject::0::1", "-2.5"],
        ["grade::student::subject::0::2", " 12.5 "],
        ["grade::student::subject::0::3", "1e1"],
        ["grade::student::subject::0::4", ".5"],
      ])
    );

    expect(payload[0].subjects.subject[0]).toEqual([0, -2.5, 12.5, 10, 0.5]);
  });

  it("ignores unrelated fields, including future form controls", () => {
    const payload = parseGradeEntries(
      formDataFrom([
        ["q", "search"],
        ["grade::student::subject::0::0", "17"],
        ["year", "1"],
        ["class", "1-A"],
        ["future_control", "future value"],
        ["metadata::student::subject", "metadata value"],
        ["return_search", "year=1&class=1-A"],
      ])
    );

    expect(payload).toEqual([
      { id: "student", subjects: { subject: [[17]] } },
    ]);
  });

  it("ignores malformed fields and invalid grade values", () => {
    const invalidEntries = [
      ["grade::::subject::0::0", "10"],
      ["grade::student::::0::0", "10"],
      ["grade::student::subject", "10"],
      ["grade::student::subject::term::0", "10"],
      ["grade::student::subject::1.5::0", "10"],
      ["grade::student::subject::0::slot", "10"],
      ["grade::student::subject::0::1.5", "10"],
      ["grade::student::subject::0::0", ""],
      ["grade::student::subject::0::1", "invalid"],
      ["grade::student::subject::0::2", "Infinity"],
    ];

    const payload = parseGradeEntries(
      formDataFrom([
        ...invalidEntries,
        ["grade::accepted::math::0::0", "15"],
      ])
    );

    expect(payload).toEqual([
      { id: "accepted", subjects: { math: [[15]] } },
    ]);
  });

  it("uses the last value for duplicate grade fields", () => {
    const field = "grade::student::subject::0::0";
    const payload = parseGradeEntries(
      formDataFrom([
        [field, "11"],
        [field, "18"],
      ])
    );

    expect(readGrade(payload, "student", "subject", 0, 0)).toBe(18);
  });

  it("does not mutate the FormData", () => {
    const formData = formDataFrom(entries);
    const snapshot = [...formData.entries()];

    parseGradeEntries(formData);

    expect([...formData.entries()]).toEqual(snapshot);
  });
});

describe("getViewFilters", () => {
  const filters = {
    q: "existing search",
    year: "1",
    classId: "1-A",
    status: "active",
    expanded: "math",
  };

  it("returns loader filters when there is no pending data", () => {
    expect(getViewFilters(filters)).toEqual(filters);
  });

  it("uses pending values while falling back for absent fields", () => {
    const pending = formDataFrom([
      ["q", "pending search"],
      ["year", "2"],
      ["class", "2-B"],
    ]);

    expect(getViewFilters(filters, pending)).toEqual({
      ...filters,
      q: "pending search",
      year: "2",
      classId: "2-B",
    });
  });

  it("keeps pending empty values instead of falling back", () => {
    const pending = formDataFrom([
      ["year", ""],
      ["class", ""],
      ["expanded", ""],
    ]);

    expect(getViewFilters(filters, pending)).toEqual({
      ...filters,
      year: "",
      classId: "",
      expanded: "",
    });
  });
});

describe("createFilterSearchParams", () => {
  it("creates every supported parameter without mutating the filters", () => {
    const filters = {
      q: "student name",
      year: "2",
      classId: "2-B",
      status: "active",
      expanded: "math",
    };
    const snapshot = { ...filters };

    const params = createFilterSearchParams(filters);

    expect(Object.fromEntries(params)).toEqual({
      q: "student name",
      year: "2",
      class: "2-B",
      status: "active",
      expanded: "math",
    });
    expect(filters).toEqual(snapshot);
  });

  it("omits empty values and a class without a selected year", () => {
    const params = createFilterSearchParams({
      q: "",
      year: "",
      classId: "1-A",
      status: "active",
      expanded: "",
    });

    expect(Object.fromEntries(params)).toEqual({ status: "active" });
  });

  it("returns correctly encoded URLSearchParams", () => {
    const params = createFilterSearchParams({
      q: "José Pérez & familia",
      year: "1",
      classId: "1/A",
      status: "",
      expanded: "",
    });

    expect(params).toBeInstanceOf(URLSearchParams);
    expect(params.toString()).toBe(
      "q=Jos%C3%A9+P%C3%A9rez+%26+familia&year=1&class=1%2FA"
    );
  });
});
