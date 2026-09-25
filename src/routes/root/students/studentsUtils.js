export function pickClasses(classesByYear, year) {
  if (year) return classesByYear?.[Number(year)] || [];

  const classes = new Set();
  Object.values(classesByYear || {}).forEach((list) =>
    (list || []).forEach((classId) => classes.add(classId))
  );
  return [...classes].sort();
}

export function getViewFilters(filters, pendingFormData) {
  const pendingValue = (name, fallback = "") => {
    const value = pendingFormData?.get(name);
    return value == null ? fallback : String(value);
  };

  return {
    id: pendingValue("id", filters.id),
    firstName: pendingValue("firstName", filters.firstName),
    lastName: pendingValue("lastName", filters.lastName),
    birthDate: pendingValue("birthDate", filters.birthDate),
    birthPlace: pendingValue("birthPlace", filters.birthPlace),
    guardianQ: pendingValue("guardianQ", filters.guardianQ),
    year: pendingValue("year", filters.year),
    classId: pendingValue("class", filters.classId),
    status: pendingValue("status", filters.status),
    page: pendingValue("page", filters.page),
  };
}

export function createFilterSearchParams({
  id,
  firstName,
  lastName,
  birthDate,
  birthPlace,
  guardianQ,
  year,
  classId,
  status,
  page,
}) {
  const params = new URLSearchParams();
  if (id) params.set("id", id);
  if (firstName) params.set("firstName", firstName);
  if (lastName) params.set("lastName", lastName);
  if (birthDate) params.set("birthDate", birthDate);
  if (birthPlace) params.set("birthPlace", birthPlace);
  if (guardianQ) params.set("guardianQ", guardianQ);
  if (year) params.set("year", year);
  if (year && classId) params.set("class", classId);
  if (status) params.set("status", status);
  if (page) params.set("page", page);
  return params;
}
