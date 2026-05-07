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

const years = [
  { id: 1, name: '1er Año'},
  { id: 2, name: '2do Año'},
  { id: 3, name: '3er Año'},
  { id: 4, name: '4to Año'},
  { id: 5, name: '5to Año'},
]

const subjects = [
  { id: 1, name: "Castellano" },
  { id: 2, name: "Inglés" },
  { id: 3, name: "Matemáticas" },
  { id: 4, name: "Educación Física" },
  { id: 5, name: "Arte y Patrimonio" },
  { id: 6, name: "Ciencias Naturales" },
  { id: 7, name: "Física" },
  { id: 8, name: "Química" },
  { id: 9, name: "Biología" },
  { id: 10, name: "Ciencias de la Tierra" },
  { id: 11, name: "Geografía, Historia y Ciudadanía" },
  { id: 12, name: "Formación para la Soberanía Nacional" },
  { id: 13, name: "Orientación y Convivencia" },
  { id: 14, name: "Participación en Grupos de Creación, Recreación y Producción" }
];

const teachers = [
  { id: 1, name: "Juan Pérez" },
  { id: 2, name: "María García" },
  { id: 3, name: "Carlos Rodríguez" },
  { id: 4, name: "Ana Martínez" },
  { id: 5, name: "Luis Hernández" }
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

const sampleStudents = [
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
];

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

export async function getClassSuggestions() {
  const students = sampleStudents;
  return { students, studentClass, studentFieldLabels };
}

export function saveCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(e)
  }
}

export function getCache(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error(e);
    return null
  }
}

export function clearCache(key) {
  try {
    key ? localStorage.removeItem(key) : localStorage.clear();
  } catch (e) {
    console.error(e);
  }
}
