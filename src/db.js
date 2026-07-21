export async function request(path, options = {}) {
  const BASE_URL = "/api";
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export async function getPeriodList() {
  return request("/periods");
}

export async function getClassSuggestions() {
  return request("/periods/suggestions");
}

export async function getStudentById(periodId, studentId) {
  return request(`/periods/${periodId}/students/${studentId}`);
}

export async function updateStudent(periodId, studentId, data) {
}

export async function getStudents(periodId, filters = {}) {
  const params = new URLSearchParams();
  if (filters.id)          params.set("id",          filters.id);
  if (filters.firstName)   params.set("firstName",   filters.firstName);
  if (filters.lastName)    params.set("lastName",     filters.lastName);
  if (filters.dateOfBirth) params.set("dateOfBirth",  filters.dateOfBirth);
  if (filters.birthPlace)  params.set("birthPlace",   filters.birthPlace);
  if (filters.year)        params.set("year",         filters.year);
  if (filters.classId)     params.set("class",        filters.classId);
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

export async function getGrades(periodId, yearId, classId, status, q) {
  const params = new URLSearchParams({ periodId });
  if (yearId)    params.set("yearId",    yearId);
  if (classId)   params.set("classId",   classId);
  if (status)    params.set("status", status);
  if (q)         params.set("q",         q);
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

export async function getSubjects() {
  return request("/subjects");
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