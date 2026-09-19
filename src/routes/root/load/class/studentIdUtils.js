export function sanitizeIdNumber(value) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .replace(/^0+/, "")
    .slice(0, 8);
}

export function splitId(value) {
  const normalized = String(value ?? "").trim();
  const match = normalized.match(/^([VE])-(.*)$/i);

  return {
    prefix: match ? `${match[1].toUpperCase()}-` : "V-",
    number: sanitizeIdNumber(match ? match[2] : normalized),
  };
}

export function normalizeId(value) {
  const { prefix, number } = splitId(value);
  return `${prefix}${number}`;
}
