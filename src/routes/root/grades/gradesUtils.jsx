export function safeNumber(value) {
  if (typeof value === "string" && value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatGrade(value) {
  return Number.isFinite(value) ? value.toFixed(1) : "—";
}

export function calculateAverage(values) {
  const validValues = values.filter(Number.isFinite);
  if (validValues.length === 0) return null;

  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}

export function pickClasses(classesByYear, year) {
  if (year) return classesByYear?.[Number(year)] || [];

  const classes = new Set();
  Object.values(classesByYear || {}).forEach((list) =>
    (list || []).forEach((classId) => classes.add(classId))
  );
  return [...classes].sort();
}

export function parseGradeEntries(formData) {
  const students = new Map();

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("changed::grade::")) continue;

    const parts = key.split("::");
    if (parts.length !== 7) continue;
    const [, , yearId, studentId, subjectId, termIndexRaw, gradeIndexRaw] = parts;
    if (!yearId || !studentId || !subjectId) continue;

    const termIndex = Number(termIndexRaw);
    const gradeIndex = Number(gradeIndexRaw);
    if (!Number.isInteger(termIndex) || !Number.isInteger(gradeIndex)) continue;

    const numericValue = safeNumber(value);
    if (numericValue === null) continue;

    const studentKey = yearId + "\u0000" + studentId;
    if (!students.has(studentKey)) {
      students.set(studentKey, { id: studentId, yearId, subjects: {} });
    }

    const student = students.get(studentKey);
    if (!student.subjects[subjectId]) student.subjects[subjectId] = [];
    if (!student.subjects[subjectId][termIndex]) {
      student.subjects[subjectId][termIndex] = [];
    }
    student.subjects[subjectId][termIndex][gradeIndex] = numericValue;
  }

  return [...students.values()];
}

export function getViewFilters(filters, pendingFormData) {
  const pendingValue = (name, fallback = "") => {
    const value = pendingFormData?.get(name);
    return value == null ? fallback : String(value);
  };

  return {
    q: pendingValue("q", filters.q),
    year: pendingValue("year", filters.year),
    classId: pendingValue("class", filters.classId),
    status: pendingValue("status", filters.status),
    expanded: pendingValue("expanded", filters.expanded),
    page: pendingValue("page", filters.page),
  };
}

export function createFilterSearchParams({ q, year, classId, status, expanded, page }) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (year) params.set("year", year);
  if (year && classId) params.set("class", classId);
  if (status) params.set("status", status);
  if (expanded) params.set("expanded", expanded);
  if (page) params.set("page", page);
  return params;
}
