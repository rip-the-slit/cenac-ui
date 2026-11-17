import FieldInput from "../../../../components/FieldInput";
import { createContext, useContext, useState } from "react";
import { BookOpenCheck, ChevronRight, UserRound, X } from "lucide-react";

import { Button, PrimaryButton } from "../../../../components/Button";
import { CardHeader, FormField } from "../../../../components/Layout";
import EnrollmentEditor from "./EnrollmentEditor";
import GuardianEditor from "./GuardianEditor";
import IdInput from "./IdInput";
import PhoneInput from "./PhoneInput";
import BirthPlaceInput from "./BirthPlaceInput";
import { normalizeId } from "./classLoaderUtils";
import EditorDialog from "../../../../components/EditorDialog";
import { getClassSuggestions } from "../../../../db";

const StudentEditorContext = createContext(null);
const NO_DISABLED_FIELDS = new Set();

export function useStudentEditor() {
  const context = useContext(StudentEditorContext);
  if (!context) {
    throw new Error(
      "useStudentEditor must be used inside StudentEditorProvider"
    );
  }
  return context;
}

function SectionLink({ description, disabled, icon, label, onClick }) {
  return (
    <Button
      type="button"
      className="w-full justify-between text-left"
      onClick={onClick}
      disabled={disabled}
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

export function StudentEditorModal({
  editor,
  config,
  onClose,
  disabledFields = NO_DISABLED_FIELDS,
}) {
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationVersion, setValidationVersion] = useState(0);
  const locked = lockedIdentity !== null;
  const directSection = Boolean(
    editor.initialPage && editor.initialPage !== "details"
  );
  const studentName = `${draft.firstName ?? ""} ${draft.lastName ?? ""}`.trim();
  const editorTitle =
    editor.mode === "create" ? (
      "Añadir estudiante"
    ) : (
      <>
        Editar estudiante{" "}
        <span className="inline-flex flex-col pl-2 text-gray-500 font-normal truncate max-w-[30ch]">
          {studentName ? `${studentName}` : ""}
        </span>
      </>
    );

  function updateField(field, value) {
    if (disabledFields.has(field)) return;
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function handleIdChange(value) {
    if (disabledFields.has("id")) return;
    if (lockedIdentity) {
      setLockedIdentity(null);
    }
    updateField("id", value);
  }

  function populateHistoricalStudent(student) {
    getClassSuggestions(student.id).then((suggestion) => {
      suggestion = suggestion && suggestion.students[0];
      if (suggestion?.pendingSubjects)
        student.pendingSubjects = suggestion.pendingSubjects;
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
      setValidationVersion((version) => version + 1);
    }, (e) => emitError("Ocurrió un error inesperado al cargar estudiante histórico."));
  }

  function buildStudent(source) {
    const identity = lockedIdentity ?? source;
    const student = {
      ...source,
      ...identity,
      _class: { ...source._class },
      pendingSubjects: [...(source.pendingSubjects || [])],
      assignedGuardians: (source.assignedGuardians || []).map((guardian) => ({
        ...guardian,
      })),
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

  async function commitStudent(source) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const committed = await onCommit({
        mode: editor.mode,
        originalId: editor.originalId,
        initialClass: editor.student._class,
        student: buildStudent(source),
      });

      if (committed !== false) {
        editor.onCommitted?.();
        onClose();
      }
    } catch (error) {
      emitError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDetailsSubmit(event) {
    event.preventDefault();
    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.querySelector(":invalid")?.focus();
      return;
    }
    commitStudent(draft);
  }

  function confirmEnrollment(enrollmentValues) {
    if (disabledFields.has("enrollment")) return;
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

  let content;
  if (page === "enrollment" && !disabledFields.has("enrollment")) {
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
        studentId={draft.id}
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
      <form noValidate className="space-y-6" onSubmit={handleDetailsSubmit}>
        <CardHeader
          title={editorTitle}
          actions={
            <button
              type="button"
              aria-label="Cerrar"
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
              onClick={onClose}
              disabled={isSubmitting}
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          }
        />

        <fieldset disabled={isSubmitting} className="grid gap-4 sm:grid-cols-2">
          {studentSchema.attributes.map((field) =>
            field === "birthPlace" ? (
              <BirthPlaceInput
                validationKey={validationVersion}
                validationMessages={studentSchema.fields[field]?.validationMessages}
                key={field}
                value={draft[field] ?? ""}
                label={studentSchema.fields[field]?.label || field}
                placeholder={studentSchema.fields[field]?.placeholder}
                required={studentSchema.fields[field]?.required}
                disabled={locked || disabledFields.has(field)}
                className="sm:col-span-2"
                onChange={(value) => updateField(field, value)}
                onError={emitError}
              />
            ) : (
              <FormField
                key={field}
                label={studentSchema.fields[field]?.label || field}
              >
                {field === "id" ? (
                  <div className="rounded-lg border border-gray-300 px-2 py-2">
                    <IdInput
                      validationKey={validationVersion}
                      definition={studentSchema.fields[field]}
                      value={draft.id}
                      disabled={disabledFields.has("id")}
                      label={studentSchema.fields[field]?.label || field}
                      required={studentSchema.fields[field].required}
                      onChange={handleIdChange}
                      onSuggestionSelect={populateHistoricalStudent}
                    />
                  </div>
                ) : field === "phone" ? (
                  <PhoneInput
                    validationKey={validationVersion}
                    definition={studentSchema.fields[field]}
                    value={draft[field] ?? ""}
                    disabled={locked || disabledFields.has(field)}
                    onChange={(value) => updateField(field, value)}
                  />
                ) : (
                  <FieldInput
                    validationKey={validationVersion}
                    definition={studentSchema.fields[field]}
                    value={draft[field] ?? ""}
                    disabled={locked || disabledFields.has(field)}
                    onChange={(event) => updateField(field, event.target.value)}
                  />
                )}
              </FormField>
            )
          )}
        </fieldset>

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
            disabled={isSubmitting || disabledFields.has("enrollment")}
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
            disabled={isSubmitting || disabledFields.has("assignedGuardians")}
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
          <Button type="button" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <PrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Aceptar"}
          </PrimaryButton>
        </div>
      </form>
    );
  }

  return (
    <EditorDialog
      label={
        editor.mode === "create"
          ? "Añadir estudiante"
          : `Editar estudiante ${studentName}`.trim()
      }
      busy={isSubmitting}
      onClose={onClose}
    >
      {content}
    </EditorDialog>
  );
}

export default function StudentEditorProvider({
  children,
  editorConfig,
  disabledFields = NO_DISABLED_FIELDS,
}) {
  const [editor, setEditor] = useState(null);

  function openCreate({ yearId, classId, onCommitted }) {
    setEditor({
      mode: "create",
      originalId: null,
      onCommitted,
      student: {
        ...editorConfig.studentSchema.template,
        ...Object.fromEntries(
          Object.entries(editorConfig.studentSchema.fields)
            .filter(([, definition]) => definition.default !== undefined)
            .map(([name, definition]) => [name, definition.default])
        ),
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
          key={`${editor.mode}:${editor.originalId ?? editor.student.id}:${
            editor.initialPage ?? "details"
          }`}
          editor={editor}
          config={editorConfig}
          disabledFields={disabledFields}
          onClose={() => setEditor(null)}
        />
      )}
    </StudentEditorContext.Provider>
  );
}
