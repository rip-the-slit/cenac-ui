import { createContext, useContext, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import {
  Card,
  CardHeader,
  FormField,
  TextInput,
} from "../../../../components/Layout";
import IdInput from "./IdInput";
import { normalizeId } from "./studentIdUtils";
import { Button, PrimaryButton } from "../../../../components/Button";

const StudentEditorContext = createContext(null);

export function useStudentEditor() {
  const context = useContext(StudentEditorContext);
  if (!context) {
    throw new Error("useStudentEditor must be used inside StudentEditorProvider");
  }
  return context;
}

function StudentEditorModal({ editor, config, onClose }) {
  const { studentSchema, enrollment, onCommit } = config;
  const [draft, setDraft] = useState(editor.student);
  const [lockedIdentity, setLockedIdentity] = useState(
    editor.student._locked === true ? editor.student : null
  );
  const locked = lockedIdentity !== null;
  const studentName =
    `${draft.firstName ?? ""} ${draft.lastName ?? ""}`.trim();
  const editorTitle =
    editor.mode === "create"
      ? "Añadir estudiante"
      : `Editar estudiante${studentName ? ` - ${studentName}` : ""}`;
  const selectedClass =
    `${draft._class?.year ?? ""}:${draft._class?.id ?? ""}`;

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
    const nextStudent = { ...draft };

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

  function handleEnrollmentChange(event) {
    const [year, id] = event.target.value.split(":");
    updateField("_class", { year: Number(year), id });
  }

  function buildStudent() {
    const identity = lockedIdentity ?? draft;
    const student = {
      ...identity,
      _class: draft._class,
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

  function handleSubmit(event) {
    event.preventDefault();
    const committed = onCommit({
      mode: editor.mode,
      originalId: editor.originalId,
      student: buildStudent(),
    });

    if (committed !== false) {
      editor.onCommitted?.();
      onClose();
    }
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
          <form className="space-y-5" onSubmit={handleSubmit}>
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
                        onStudentSelect={populateHistoricalStudent}
                      />
                    </div>
                  ) : (
                    <TextInput
                      value={draft[field] ?? ""}
                      disabled={locked}
                      required
                      minLength={3}
                      onChange={(event) =>
                        updateField(field, event.target.value)
                      }
                    />
                  )}
                </FormField>
              ))}
            </div>

            <fieldset className="rounded-lg border border-gray-200 p-4">
              <legend className="px-2 font-semibold text-gray-800">
                Inscripción
              </legend>
              <FormField label="Sección">
                <select
                  aria-label="Sección de inscripción"
                  className="rounded-lg border border-gray-300 px-3 py-2 font-normal"
                  value={selectedClass}
                  required
                  onChange={handleEnrollmentChange}
                >
                  {enrollment.years.map((year) => (
                    <optgroup label={year.name} key={year.id}>
                      {Object.values(
                        enrollment.classesByYear[year.id] || {}
                      ).map((classGroup) => (
                        <option
                          key={classGroup.className}
                          value={`${year.id}:${classGroup.className}`}
                        >
                          {classGroup.className}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </FormField>
            </fieldset>

            {locked && (
              <p className="text-sm text-gray-600">
                Los datos de un estudiante preexistente no se pueden modificar;
                únicamente puede cambiar su inscripción o cambiar la cédula
                para desbloquearlos.
              </p>
            )}

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                className="rounded-lg border border-gray-300 px-4 py-2"
                onClick={onClose}
              >
                Cancelar
              </Button>
              <PrimaryButton
                type="submit"
              >
                Aceptar
              </PrimaryButton>
            </div>
          </form>
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
      },
    });
  }

  function openEdit(student) {
    setEditor({
      mode: "edit",
      originalId: normalizeId(student.id),
      student: {
        ...student,
        id: normalizeId(student.id),
        _class: { ...student._class },
      },
    });
  }

  return (
    <StudentEditorContext.Provider value={{ openCreate, openEdit }}>
      {children}
      {editor && (
        <StudentEditorModal
          key={`${editor.mode}:${editor.originalId ?? editor.student.id}`}
          editor={editor}
          config={editorConfig}
          onClose={() => setEditor(null)}
        />
      )}
    </StudentEditorContext.Provider>
  );
}
