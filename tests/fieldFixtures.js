export function fieldDefinitions(labels) {
  return Object.fromEntries(Object.entries(labels).map(([name, label]) => [name, {
    label,
    type: name === "birthDate" ? "date" : name === "phone" ? "tel" : "text",
    required: true,
  }]));
}
