export function fieldDefinitions(labels) {
  return Object.fromEntries(Object.entries(labels).map(([name, label]) => [name, {
    label,
    type: name === "birthDate" ? "date" : name === "phone" ? "tel" : "text",
    required: true,
    ...(name === "id" ? { pattern: { v: "[1-7][0-9]{7}", e: "[89][0-9]{7}" } } : {}),
  }]));
}
