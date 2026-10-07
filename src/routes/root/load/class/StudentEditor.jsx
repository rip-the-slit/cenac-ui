import { createContext, useContext, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpenCheck, ChevronRight, UserRound, X } from "lucide-react";

import { Button, PrimaryButton } from "../../../../components/Button";
import {
  Card,
  CardHeader,
  FormField,
  TextInput,
} from "../../../../components/Layout";
import EnrollmentEditor from "./EnrollmentEditor";
import GuardianEditor from "./GuardianEditor";
import IdInput from "./IdInput";
import { normalizeId } from "./classLoaderUtils";

const StudentEditorContext = createContext(null);

export function useStudentEditor() {
  const context = useContext(StudentEditorContext);
  if (!context) {
    throw new Error("useStudentEditor must be used inside StudentEditorProvider");
  }
  return context;
}

function SectionLink({ description, icon, label, onClick }) {
  return (
    <Button
      type="button"
      className="w-full justify-between text-left"
      onClick={onClick}
    >
      <span className="flex items-center gap-3">
        {icon}
        <span>
          <span className="block font-semibold">{label}</span>
          <span className="block text-sm font-normal text-gray-500">
            {description}
          </span>
        </span>
      </span>
      <ChevronRight aria-hidden="true" className="h-5 w-5 text-gray-400" />
    </Button>
  );
}

function StudentEditorModal({ editor, config, onClose }) {
  const {
    emitError,
    enrollment,
    guardianSchema,
    onCommit,
    onCreateGuardian,
    studentSchema,
  } = config;
  const [draft, setDraft] = useState({
    ...editor.student,
    _class: { ...editor.student._class },
    pendingSubjects: [...(editor.student.pendingSubjects || [])],
    assignedGuardians: (editor.student.assignedGuardians || []).map(
      (guardian) => ({ ...guardian })
    ),
  });
  const [lockedIdentity, setLockedIdentity] = useState(
    editor.student._locked === true ? editor.student : null
  );
  const [page, setPage] = useState(editor.initialPage || "details");
  const locked = lockedIdentity !== null;
  const directSection = Boolean(
    editor.initialPage && editor.initialPage !== "details"
  );
  const studentName =
    `${draft.firstName ?? ""} ${draft.lastName ?? ""}`.trim();
  const editorTitle =
    editor.mode === "create"
      ? "Añadir estudiante"
      : (<>Editar estudiante <span className="text-gray-500 font-normal">{studentName ? `${studentName}` : ""}</span></>);

  function updateField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function handleIdChange(value) {
    if (lockedIdentity) {
      setLockedIdentity(null);
    }
    updateField("id", value);
  }

  function populateHistoricalStudent(student) {
    const nextStudent = {
      ...draft,
      pendingSubjects: Array.isArray(student.pendingSubjects)
        ? student.pendingSubjects.map(String)
        : [],
      assignedGuardians: Array.isArray(student.assignedGuardians)
        ? student.assignedGuardians.map((guardian) => ({
            ...guardian,
            id: normalizeId(guardian.id),
            _locked: true,
          }))
        : [],
    };

    for (const field of studentSchema.attributes) {
      nextStudent[field] =
        field === "id"
          ? normalizeId(student[field])
          : String(student[field] ?? "");
    }

    nextStudent._locked = true;
    setLockedIdentity(nextStudent);
    setDraft(nextStudent);
  }

  function buildStudent(source) {
    const identity = lockedIdentity ?? source;
    const student = {
      ...source,
      ...identity,
      _class: { ...source._class },
      pendingSubjects: [...(source.pendingSubjects || [])],
      assignedGuardians: (source.assignedGuardians || []).map(
        (guardian) => ({ ...guardian })
      ),
      id: normalizeId(identity.id),
      _locked: locked,
    };

    for (const field of studentSchema.attributes) {
      if (field !== "id") {
        student[field] = String(identity[field] ?? "").trim();
      }
    }

    return student;
  }

  function commitStudent(source) {
    const committed = onCommit({
      mode: editor.mode,
      originalId: editor.originalId,
      initialClass: editor.student._class,
      student: buildStudent(source),
    });

    if (committed !== false) {
      editor.onCommitted?.();
      onClose();
    }
  }

  function handleDetailsSubmit(event) {
    event.preventDefault();
    commitStudent(draft);
  }

  function confirmEnrollment(enrollmentValues) {
    const nextDraft = { ...draft, ...enrollmentValues };
    if (directSection) {
      commitStudent(nextDraft);
      return;
    }
    setDraft(nextDraft);
    setPage("details");
  }

  function confirmGuardians(assignedGuardians) {
    const nextDraft = { ...draft, assignedGuardians };
    if (directSection) {
      commitStudent(nextDraft);
      return;
    }
    setDraft(nextDraft);
    setPage("details");
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      onClose();
    }
  }

  function handleBackdropMouseDown(event) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  let content;
  if (page === "enrollment") {
    content = (
      <EnrollmentEditor
        enrollment={enrollment}
        student={draft}
        locked={locked}
        onBack={directSection ? onClose : () => setPage("details")}
        onConfirm={confirmEnrollment}
      />
    );
  } else if (page === "guardians") {
    content = (
      <GuardianEditor
        emitError={emitError}
        guardianSchema={guardianSchema}
        guardians={draft.assignedGuardians}
        onBack={directSection ? onClose : () => setPage("details")}
        onConfirm={confirmGuardians}
        onCreateGuardian={onCreateGuardian}
      />
    );
  } else {
    content = (
      <form className="space-y-6" onSubmit={handleDetailsSubmit}>
        <CardHeader
          title={editorTitle}
          actions={
            <button
              type="button"
              aria-label="Cerrar"
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
              onClick={onClose}
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {studentSchema.attributes.map((field) => (
            <FormField
              key={field}
              label={studentSchema.labels[field] || field}
            >
              {field === "id" ? (
                <div className="rounded-lg border border-gray-300 px-2 py-2">
                  <IdInput
                    value={draft.id}
                    label={studentSchema.labels[field] || field}
                    onChange={handleIdChange}
                    onSuggestionSelect={populateHistoricalStudent}
                  />
                </div>
              ) : (
                <TextInput
                  type={field === "birthDate" ? "date" : "text"}
                  value={draft[field] ?? ""}
                  disabled={locked}
                  required
                  onChange={(event) =>
                    updateField(field, event.target.value)
                  }
                />
              )}
            </FormField>
          ))}
        </div>

        <nav
          aria-label="Secciones del formulario del estudiante"
          className="grid gap-3 sm:grid-cols-2"
        >
          <SectionLink
            icon={
              <BookOpenCheck
                aria-hidden="true"
                className="h-6 w-6 text-emerald-600"
              />
            }
            label="Inscripción"
            description="Sección y materias pendientes"
            onClick={() => setPage("enrollment")}
          />
          <SectionLink
            icon={
              <UserRound
                aria-hidden="true"
                className="h-6 w-6 text-emerald-600"
              />
            }
            label="Representantes"
            description={`${draft.assignedGuardians.length} asignados`}
            onClick={() => setPage("guardians")}
          />
        </nav>

        {locked && (
          <p className="text-sm text-gray-600">
            Los datos de un estudiante preexistente no se pueden modificar;
            únicamente puede cambiar su inscripción, sus representantes o
            cambiar la cédula para desbloquearlos.
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <PrimaryButton type="submit">Aceptar</PrimaryButton>
        </div>
      </form>
    );
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
      role="presentation"
      onKeyDown={handleKeyDown}
      onMouseDown={handleBackdropMouseDown}
    >
      <Card
        as="div"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto"
      >
        <div role="dialog" aria-modal="true" aria-label={editorTitle}>
          {content}
        </div>
      </Card>
    </div>,
    document.body
  );
}

export default function StudentEditorProvider({
  children,
  editorConfig,
}) {
  const [editor, setEditor] = useState(null);

  function openCreate({ yearId, classId, onCommitted }) {
    setEditor({
      mode: "create",
      originalId: null,
      onCommitted,
      student: {
        ...editorConfig.studentSchema.template,
        id: editorConfig.getNextStudentId(),
        _class: { year: yearId, id: classId },
        pendingSubjects: [],
        assignedGuardians: [],
      },
    });
  }

  function createEditState(student, initialPage = "details") {
    return {
      mode: "edit",
      initialPage,
      originalId: normalizeId(student.id),
      student: {
        ...student,
        id: normalizeId(student.id),
        _class: { ...student._class },
        pendingSubjects: [...(student.pendingSubjects || [])],
        assignedGuardians: (student.assignedGuardians || []).map(
          (guardian) => ({ ...guardian })
        ),
      },
    };
  }

  function openEdit(student) {
    setEditor(createEditState(student));
  }

  function openSection(student, section) {
    setEditor(createEditState(student, section));
  }

  return (
    <StudentEditorContext.Provider
      value={{ openCreate, openEdit, openSection }}
    >
      {children}
      {editor && (
        <StudentEditorModal
          key={`${editor.mode}:${editor.originalId ?? editor.student.id}:${editor.initialPage ?? "details"}`}
          editor={editor}
          config={editorConfig}
          onClose={() => setEditor(null)}
        />
      )}
    </StudentEditorContext.Provider>
  );
}
