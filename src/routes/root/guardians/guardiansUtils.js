export const GUARDIAN_FIELDS = [
  "id",
  "firstName",
  "lastName",
  "birthDate",
  "legalRole",
  "phone",
  "address",
];

export function getViewFilters(filters, pendingFormData) {
  const pendingValue = (name) => {
    const value = pendingFormData?.get(name);
    return value == null ? filters[name] || "" : String(value);
  };
  return Object.fromEntries(
    [...GUARDIAN_FIELDS, "studentQ", "page"].map((field) => [
      field,
      pendingValue(field),
    ])
  );
}

export function createFilterSearchParams(filters) {
  const params = new URLSearchParams();
  for (const field of [...GUARDIAN_FIELDS, "studentQ", "page"]) {
    if (filters[field]) params.set(field, filters[field]);
  }
  return params;
}
