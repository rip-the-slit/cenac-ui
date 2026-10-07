export function formatClassName(className) {
  const result =
    className === "z" ? "Sección Flotante" : `Sección ${className}`;
  return result;
}
