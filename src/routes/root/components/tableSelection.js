export function togglePageSelection(
  current,
  id,
  rows,
  getId = (row) => row.id
) {
  if (current.all) {
    return {
      ...Object.fromEntries(
        rows
          .map(getId)
          .filter((rowId) => rowId !== id)
          .map((rowId) => [rowId, true])
      ),
      all: false,
    };
  }
  const next = { ...current };
  if (next[id]) delete next[id];
  else next[id] = true;
  return next;
}
