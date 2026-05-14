const periods = [
  { id: "2026", stats: null },
  {
    id: "2025",
    stats: {
      grades: { total: 1034, loaded: 600 },
      students: { total: 120, approved: 50 },
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

const years = [
  { id: 1, name: "1er Año" },
  { id: 2, name: "2do Año" },
  { id: 3, name: "3er Año" },
  { id: 4, name: "4to Año" },
  { id: 5, name: "5to Año" },
];

const subjects = [
  { id: 1, name: "Castellano", abbr: "CA" },
  { id: 2, name: "Inglés", abbr: "IN" },
  { id: 3, name: "Matemáticas", abbr: "MA" },
  { id: 4, name: "Educación Física", abbr: "EF" },
  { id: 5, name: "Arte y Patrimonio", abbr: "AP" },
  { id: 6, name: "Ciencias Naturales", abbr: "CN" },
  { id: 7, name: "Física", abbr: "FI" },
  { id: 8, name: "Química", abbr: "QU" },
  { id: 9, name: "Biología", abbr: "BI" },
  { id: 10, name: "Ciencias de la Tierra", abbr: "CT" },
  { id: 11, name: "Geografía, Historia y Ciudadanía", abbr: "GH" },
  { id: 12, name: "Formación para la Soberanía Nacional", abbr: "FS" },
  { id: 13, name: "Orientación y Convivencia", abbr: "OC" },
  {
    id: 14,
    name: "Participación en Grupos de Creación, Recreación y Producción",
    abbr: "PG",
  },
];

const teachers = [
  { id: 1, name: "Juan Pérez" },
  { id: 2, name: "María García" },
  { id: 3, name: "Carlos Rodríguez" },
  { id: 4, name: "Ana Martínez" },
  { id: 5, name: "Luis Hernández" },
];

const studentClass = {
  id: "",
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  birthPlace: "",
  _locked: false,
  _class: {
    id: "",
    year: null,
  },
};

const studentFieldLabels = {
  id: "Cédula",
  firstName: "Nombres",
  lastName: "Apellidos",
  dateOfBirth: "Fecha de Nacimiento",
  birthPlace: "Lugar de Nacimiento",
};

const studentGradesFieldLabels = {
  id: "Cédula",
  fullName: "Nombre Completo",
  class: "Sección",
  grades: "Notas",
};

const sampleStudents = {
  2025: [
    {
      id: "12345678",
      firstName: "Juan",
      lastName: "Perez",
      dateOfBirth: "2008-05-10",
      birthPlace: "Caracas",
      _class: {
        id: "A",
        year: 1,
      },
    },
    {
      id: "23456789",
      firstName: "Maria",
      lastName: "Gomez",
      dateOfBirth: "2009-02-15",
      birthPlace: "Valencia",
      _class: {
        id: "A",
        year: 1,
      },
    },
  ],
};

const gradesClass = [
  [20, 20, 20, 20],
  [20, 20, 20, 20],
  [20, 20, 20, 20],
];

const sampleGrades = {
  2025: [
    { id: "23456789", subjects: { 3: gradesClass, 4: gradesClass } },
    { id: "12345678", subjects: { 1: gradesClass, 3: gradesClass } },
  ],
};

const sampleSubjects = {
  2025: {
    1: ["1", "2", "3", "4"],
  },
};

export async function getGrades(periodId, yearId, classId, subjectId, q) {
  const students = sampleGrades[periodId] || [];
  const studentsById = new Map((sampleStudents[periodId] || []).map((s) => [s.id, s]));
  const subjectsById = new Map(subjects.map((s) => [String(s.id), s]));
  const normalize = (v) => String(v ?? "").toLowerCase().trim();
  const query = normalize(q);
  const rows = [];

  for (const student of students) {
    const row = {};
    const s = studentsById.get(student.id);
    if (!s) continue;
    const studentYear = s?._class?.year;
    const studentClass = s?._class?.id;
    const allowedSubjects = new Set(
      (sampleSubjects?.[periodId]?.[studentYear] || []).map(String)
    );

    const bySubject = {};
    for (const [rawSubjectId, lapsos] of Object.entries(student.subjects || {})) {
      const key = String(rawSubjectId);
      if (!allowedSubjects.has(key) || !Array.isArray(lapsos)) continue;
      const lapsoAverages = lapsos.map((grades = []) => {
        const safeGrades = grades.filter((grade) => Number.isFinite(grade));
        const sum = safeGrades.reduce((acc, grade) => acc + grade, 0);
        return safeGrades.length ? sum / safeGrades.length : null;
      });
      const flat = lapsos.flat().filter((grade) => Number.isFinite(grade));
      const avg = flat.length
        ? flat.reduce((acc, grade) => acc + grade, 0) / flat.length
        : null;
      bySubject[key] = { avg, lapsos, lapsoAverages };
    }

    if (
      (yearId && studentYear !== Number(yearId)) ||
      (classId && studentClass !== classId) ||
      (subjectId && !bySubject[String(subjectId)]) ||
      (query &&
        !(
          normalize(`${s.firstName} ${s.lastName}`).includes(query) ||
          String(s.id).includes(query)
        ))
    ) {
      continue;
    }

    row["id"] = s.id;
    row["fullName"] = `${s.firstName} ${s.lastName}`;
    row["class"] = `${years.find((y) => y.id === studentYear)?.name || studentYear} ${studentClass}`;
    row["grades"] = bySubject;
    row["subjectAverages"] = Object.fromEntries(
      Object.entries(bySubject).map(([key, value]) => [key, value.avg])
    );
    row["subjectDetails"] = bySubject;
    rows.push(row);
  }

  return {
    rows,
    studentGradesFieldLabels,
    subjects: subjects.filter((subject) =>
      Object.values(sampleSubjects?.[periodId] || {}).some((ids) =>
        ids?.includes(String(subject.id))
      )
    ),
    subjectsPerYear: sampleSubjects[periodId] || {},
    years,
    classesByYear: await getClassesByYear(periodId),
    subjectsById: Object.fromEntries(subjectsById),
  };
}

export async function loadGrades(periodId, grades) {
  if (!Array.isArray(grades) || !sampleStudents[periodId] || !sampleSubjects[periodId]) {
    return { loaded: 0, skipped: 0 };
  }

  const studentsById = new Map((sampleStudents[periodId] || []).map((student) => [student.id, student]));
  const normalized = [];
  let skipped = 0;

  for (const entry of grades) {
    const student = studentsById.get(entry?.id);
    if (!student || !entry?.subjects || typeof entry.subjects !== "object") {
      skipped += 1;
      continue;
    }
    const allowed = new Set(
      (sampleSubjects[periodId][student._class.year] || []).map(String)
    );
    const subjectsForStudent = {};
    for (const [subjectId, lapsos] of Object.entries(entry.subjects)) {
      if (!allowed.has(String(subjectId)) || !Array.isArray(lapsos)) {
        continue;
      }
      subjectsForStudent[String(subjectId)] = lapsos;
    }
    normalized.push({ id: student.id, subjects: subjectsForStudent });
  }

  sampleGrades[periodId] = normalized;
  return { loaded: normalized.length, skipped };
}

export async function getYears() {
  return years;
}

export async function getSubjects() {
  return subjects;
}

export async function getTeachers() {
  return teachers;
}

export async function getPeriodStats(periodId) {
  return periods.find((p) => p.id === periodId);
}

export async function getPeriodList() {
  return periods.map((p) => p.id);
}

export async function getClass(periodId) {
  return sampleStudents[periodId];
}

export async function getClassSuggestions() {
  const students = sampleStudents["2025"];
  return { students, studentClass, studentFieldLabels };
}

export async function getClassesByYear(periodId) {
  const students = sampleStudents[periodId] || [];
  const classesByYear = years.reduce((acc, year) => {
    acc[year.id] = [];
    return acc;
  }, {});
  for (const student of students) {
    const yearId = student?._class?.year;
    const classId = student?._class?.id;
    if (!yearId || !classId) {
      continue;
    }
    if (!classesByYear[yearId].includes(classId)) {
      classesByYear[yearId].push(classId);
    }
  }
  Object.values(classesByYear).forEach((classList) => classList.sort());
  return classesByYear;
}

export async function loadPeriodData(periodId, students, subjects) {
  if (sampleStudents[periodId]) return;
  sampleStudents[periodId] = students;
  sampleSubjects[periodId] = subjects;
  periods.find((p) => p.id === periodId).stats = {
    grades: { total: 0, loaded: 0 },
    students: { total: students.length, approved: 0 },
  };
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
