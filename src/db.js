const BASE_URL = "/api";

export async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || err.error || res.statusText, { cause: res });
  }
  return res.json();
}

export async function getPeriodList() {
  return request("/periods");
}

export async function getClassSuggestions(studentId) {
  const params = new URLSearchParams();
  if (studentId) params.set("studentId", studentId);
  const qs = params.toString();
  return request(`/periods/suggestions${qs ? `?${qs}` : ""}`);
}

export async function getSubjectSuggestions() {
  return request("/subjects/suggestions");
}

export async function getStudentById(periodId, studentId) {
  return request(`/periods/${periodId}/students/${studentId}`);
}

export async function editStudent(studentId, changes) {
  return request(
    `/periods/all/students/${encodeURIComponent(studentId)}/edit`,
    {
      method: "POST",
      body: JSON.stringify(changes),
    }
  );
}

export async function getStudents(periodId, filters = {}) {
  const params = new URLSearchParams();
  if (filters.id) params.set("id", filters.id);
  if (filters.firstName) params.set("firstName", filters.firstName);
  if (filters.lastName) params.set("lastName", filters.lastName);
  if (filters.birthDate) params.set("dateOfBirth", filters.birthDate);
  if (filters.birthPlace) params.set("birthPlace", filters.birthPlace);
  if (filters.guardianQ) params.set("guardianQ", filters.guardianQ);
  if (filters.year) params.set("year", filters.year);
  if (filters.classId) params.set("class", filters.classId);
  if (filters.status) params.set("status", filters.status);
  if (filters.page) params.set("page", filters.page);
  if (filters.limit) params.set("limit", filters.limit);
  const qs = params.toString();
  return request(`/periods/${periodId}/students${qs ? `?${qs}` : ""}`);
}

export async function getPeriodStats(periodId) {
  return request(`/periods/${periodId}`);
}

export async function getClassesByYear(periodId) {
  return request(`/periods/${periodId}/classes`);
}

export async function getClass(periodId) {
  return request(`/periods/${periodId}/students`);
}

export async function loadPeriodData(periodId, students, subjects) {
  return request(`/periods/${periodId}/load`, {
    method: "POST",
    body: JSON.stringify({ students, subjects }),
  });
}

export async function getGrades(
  periodId,
  yearId,
  classId,
  status,
  q,
  page,
  limit
) {
  const params = new URLSearchParams({ periodId });
  if (yearId) params.set("yearId", yearId);
  if (classId) params.set("classId", classId);
  if (status) params.set("status", status);
  if (q) params.set("q", q);
  if (page) params.set("page", page);
  if (limit) params.set("limit", limit);
  return request(`/grades?${params.toString()}`);
}

export async function loadGrades(periodId, grades) {
  return request("/grades/load", {
    method: "POST",
    body: JSON.stringify({ periodId, grades }),
  });
}

export async function getYears() {
  return request("/years");
}

export async function getPlaces(filters = {}, options = {}) {
  const params = new URLSearchParams(filters);
  return request(`/periods/places?${params}`, options);
}

export async function archivePeriod(periodId, supersede) {
  return request(`/periods/${periodId}/archive`, {
    method: "POST",
    body: JSON.stringify({ supersede }),
  });
}

export async function getSubjects() {
  return request("/subjects");
}

export async function getReportOptionData() {
  return request("/reports/");
}

export function getReportUrl(periodId, reportType, filters = {}) {
  const params = new URLSearchParams({ periodId });
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  return BASE_URL + "/reports/" + reportType + "?" + params.toString();
}

export async function generateReport(periodId, reportType, filters) {
  const res = await fetch(getReportUrl(periodId, reportType, filters), {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.blob();
}

export function saveCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(e);
  }
}

export function getCache(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export function clearCache(key) {
  try {
    key ? localStorage.removeItem(key) : localStorage.clear();
  } catch (e) {
    console.error(e);
  }
}

export async function getGuardians(periodId = "all", filters = {}) {
  const params = new URLSearchParams();
  params.set("periodId", periodId);
  for (const field of [
    "id",
    "firstName",
    "lastName",
    "birthDate",
    "legalRole",
    "phone",
    "address",
    "studentQ",
  ]) {
    if (filters[field]) params.set(field, filters[field]);
  }
  if (filters.page) params.set("page", filters.page);
  if (filters.limit) params.set("limit", filters.limit);
  const qs = params.toString();
  return request(`/guardians${qs ? `?${qs}` : ""}`);
}

export async function createGuardian(guardian) {
  return request("/guardians", {
    method: "POST",
    body: JSON.stringify(guardian),
  });
}

export async function getGuardianById(periodId = "all", guardianId) {
  const params = new URLSearchParams();
  params.set("periodId", periodId);
  const qs = params.toString();
  return request(`/guardians/${guardianId}${qs ? `?${qs}` : ""}`);
}

export async function editGuardian(guardianId, changes) {
  return request(`/guardians/${encodeURIComponent(guardianId)}/edit`, {
    method: "POST",
    body: JSON.stringify(changes),
  });
}
