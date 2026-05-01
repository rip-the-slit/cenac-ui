const periods = [
  { id: "2026", stats: null, data_loaded: { subjects: false, classes: false } },
  {
    id: "2025",
    stats: {
      grades: { total: 1034, loaded: 600 },
      students: { total: 120, approved: 110 },
    },
  },
  {
    id: "2024",
    stats: {
      grades: { total: 1034, loaded: 600 },
      students: { total: 120, approved: 110 },
    },
  },
];

export async function getPeriodStats(periodId) {
    return periods.find((p) => p.id === periodId);
}

export async function getPeriodList() {
    return periods.map((p) => p.id);
}
