import { normalizeId } from "./classLoaderUtils";

const STUDENT_ID_BASE = 30000000;

export function getNextStudentId(studentsById) {
  const occupiedNumbers = new Set(
    Object.keys(studentsById).map((id) => id.replace(/\D/g, ""))
  );
  let next = STUDENT_ID_BASE;

  while (occupiedNumbers.has(String(next))) {
    next += 1;
  }

  return `V-${next}`;
}

export function getNextClassId(classIds) {
  const existing = new Set(classIds);
  let index = 0;
  let classId = "A";

  while (existing.has(classId)) {
    index += 1;
    classId = String.fromCharCode(65 + index);
  }

  return classId;
}

function updateClassStudents(state, yearId, classId, update) {
  const yearClasses = state.classesByYear[yearId];
  const classGroup = yearClasses?.[classId];

  if (!classGroup) {
    return state;
  }

  return {
    ...state,
    classesByYear: {
      ...state.classesByYear,
      [yearId]: {
        ...yearClasses,
        [classId]: {
          ...classGroup,
          students: update(classGroup.students),
        },
      },
    },
  };
}

function moveStudent(state, action) {
  if (
    action.yearId === action.targetYearId &&
    action.classId === action.targetClassId
  ) {
    return state;
  }

  const sourceStudents =
    state.classesByYear[action.yearId]?.[action.classId]?.students;
  const studentIndex = sourceStudents?.findIndex(
    (student) => normalizeId(student.id) === action.studentId
  );

  if (studentIndex == null || studentIndex < 0) {
    return state;
  }

  const student = sourceStudents[studentIndex];
  const withoutStudent = updateClassStudents(
    state,
    action.yearId,
    action.classId,
    (students) => students.filter((_, index) => index !== studentIndex)
  );

  return updateClassStudents(
    withoutStudent,
    action.targetYearId,
    action.targetClassId,
    (students) => [
      ...students,
      {
        ...student,
        _class: {
          year: action.targetYearId,
          id: action.targetClassId,
        },
      },
    ]
  );
}

function updateStudent(state, action) {
  const targetYearId = action.student._class.year;
  const targetClassId = action.student._class.id;

  if (action.yearId === targetYearId && action.classId === targetClassId) {
    return updateClassStudents(
      state,
      action.yearId,
      action.classId,
      (students) =>
        students.map((student) =>
          normalizeId(student.id) === action.originalId
            ? action.student
            : student
        )
    );
  }

  const withoutStudent = updateClassStudents(
    state,
    action.yearId,
    action.classId,
    (students) =>
      students.filter(
        (student) => normalizeId(student.id) !== action.originalId
      )
  );

  return updateClassStudents(
    withoutStudent,
    targetYearId,
    targetClassId,
    (students) => [...students, action.student]
  );
}

export function classLoaderReducer(state, action) {
  switch (action.type) {
    case "ADD_CLASS": {
      const yearClasses = state.classesByYear[action.yearId] || {};
      return {
        ...state,
        classesByYear: {
          ...state.classesByYear,
          [action.yearId]: {
            ...yearClasses,
            [action.classId]: {
              className: action.classId,
              students: [],
            },
          },
        },
      };
    }
    case "DELETE_CLASS": {
      const yearClasses = state.classesByYear[action.yearId] || {};
      const nextYearClasses = { ...yearClasses };
      delete nextYearClasses[action.classId];

      return {
        ...state,
        classesByYear: {
          ...state.classesByYear,
          [action.yearId]: nextYearClasses,
        },
      };
    }
    case "MOVE_STUDENT":
      return moveStudent(state, action);
    case "ADD_STUDENT":
      return updateClassStudents(
        state,
        action.yearId,
        action.classId,
        (students) => [...students, action.student]
      );
    case "UPDATE_STUDENT":
      return updateStudent(state, action);
    case "DELETE_STUDENT":
      return updateClassStudents(
        state,
        action.yearId,
        action.classId,
        (students) =>
          students.filter(
            (student) => normalizeId(student.id) !== action.studentId
          )
      );
    case "DELETE_STUDENTS": {
      const deletedIds = new Set(action.studentIds);
      return updateClassStudents(
        state,
        action.yearId,
        action.classId,
        (students) =>
          students.filter(
            (student) => !deletedIds.has(normalizeId(student.id))
          )
      );
    }
    default:
      return state;
  }
}

export function serializeStudents(studentsById) {
  return Object.values(studentsById).map((student) => {
    const { _locked, ...persistedStudent } = student;
    return {
      ...persistedStudent,
      assignedGuardians: (persistedStudent.assignedGuardians || []).map(
        (guardian) =>
          Object.fromEntries(
            Object.entries(guardian).filter(([key]) => key !== "_locked")
          )
      ),
    };
  });
}
