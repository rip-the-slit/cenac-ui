import FieldInput from "../../../../components/FieldInput";
import { useState } from "react";
import { Plus, UserRound } from "lucide-react";

import {
  Button,
  DeleteButton,
  EditButton,
  PrimaryButton,
} from "../../../../components/Button";
import { CardHeader, FormField } from "../../../../components/Layout";
import IdInput from "./IdInput";
import PhoneInput from "./PhoneInput";
import { normalizeId } from "./classLoaderUtils";
import { getStudentById } from "../../../../db";
const NO_DISABLED_FIELDS = new Set();

function guardianName(guardian) {
  return (
    `${guardian.firstName ?? ""} ${guardian.lastName ?? ""}`.trim() ||
    normalizeId(guardian.id)
  );
}

export function GuardianForm({
  guardianSchema,
  guardian: initialGuardian,
  disabledFields = NO_DISABLED_FIELDS,
  onBack,
  onCommit,
}) {
  const [draft, setDraft] = useState({
    ...guardianSchema.template,
    ...Object.fromEntries(
      Object.entries(guardianSchema.fields)
        .filter(([, definition]) => definition.default !== undefined)
        .map(([name, definition]) => [name, definition.default])
    ),
    ...initialGuardian,
    id: initialGuardian?.id ?? (guardianSchema.template.id || "V-"),
    assignedStudents: initialGuardian?.assignedStudents || [],
  });
  const [lockedIdentity, setLockedIdentity] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationVersion, setValidationVersion] = useState(0);
  const locked = lockedIdentity !== null;

  function updateField(field, value) {
    if (disabledFields.has(field)) return;
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function handleIdChange(value) {
    if (disabledFields.has("id")) return;
    if (lockedIdentity) {
      setLockedIdentity(null);
    }
    setDraft((current) => ({ ...current, id: value, assignedStudents: [] }));
  }

  function populateGuardian(guardian) {
    const nextGuardian = { assignedStudents: guardian.assignedStudents || [] };
    for (const field of guardianSchema.attributes.filter(
      (field) => field !== "assignedStudents"
    )) {
      nextGuardian[field] =
        field === "id"
          ? normalizeId(guardian[field])
          : String(
              (field === "legalRole"
                ? draft[field] || guardian[field]
                : guardian[field]) ?? ""
            );
    }
    nextGuardian._locked = true;
    setDraft(nextGuardian);
    setLockedIdentity(nextGuardian);
    setValidationVersion((version) => version + 1);
  }

  function buildGuardian() {
    const identity = lockedIdentity ?? draft;
    const guardian = {
      ...identity,
      id: normalizeId(identity.id),
      _locked: locked,
    };

    for (const field of guardianSchema.attributes.filter(
      (field) => field !== "assignedStudents"
    )) {
      if (field !== "id") {
        guardian[field] = String(
          (field === "legalRole" ? draft[field] : identity[field]) ?? ""
        ).trim();
      }
    }
    return guardian;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.querySelector(":invalid")?.focus();
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onCommit({ guardian: buildGuardian(), matched: locked });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBack() {
    if (!isSubmitting) onBack();
  }

  return (
    <form noValidate className="space-y-6" onSubmit={handleSubmit}>
      <CardHeader
        title={
          initialGuardian ? "Editar representante" : "Agregar representante"
        }
        onBack={handleBack}
        backLabel="Volver a la lista de representantes"
      />

      <fieldset disabled={isSubmitting} className="grid gap-4 sm:grid-cols-2">
        {guardianSchema.attributes
          .filter((field) => field !== "assignedStudents")
          .map((field) => (
            <FormField
              key={field}
              label={guardianSchema.fields[field]?.label || field}
              className={field === "address" ? "sm:col-span-2" : ""}
            >
              {field === "id" ? (
                <div className="rounded-lg border border-gray-300 px-2 py-2">
                  <IdInput
                    validationKey={validationVersion}
                    definition={guardianSchema.fields[field]}
                    value={draft.id}
                    disabled={disabledFields.has("id")}
                    label={guardianSchema.fields[field]?.label || field}
                    required={guardianSchema.fields[field].required}
                    onChange={handleIdChange}
                    onSuggestionSelect={populateGuardian}
                    suggestionsEndpoint="/api/guardians"
                    suggestionsLabel="Sugerencias de representantes"
                  />
                </div>
              ) : field === "phone" ? (
                <PhoneInput
                  validationKey={validationVersion}
                  definition={guardianSchema.fields[field]}
                  value={draft[field] ?? ""}
                  disabled={locked || disabledFields.has(field)}
                  onChange={(value) => updateField(field, value)}
                />
              ) : (
                <FieldInput
                  validationKey={validationVersion}
                  definition={guardianSchema.fields[field]}
                  value={draft[field] ?? ""}
                  disabled={
                    (locked && field !== "legalRole") ||
                    disabledFields.has(field)
                  }
                  onChange={(event) => updateField(field, event.target.value)}
                />
              )}
            </FormField>
          ))}
      </fieldset>

      {locked && (
        <p className="text-sm text-gray-600">
          Elija el rol legal del representante con respecto al estudiante o
          cambie la cédula para crear uno diferente.
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" onClick={handleBack} disabled={isSubmitting}>
          Cancelar
        </Button>
        <PrimaryButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : "Aceptar"}
        </PrimaryButton>
      </div>
    </form>
  );
}

export default function GuardianEditor({
  studentId,
  emitError,
  guardianSchema,
  guardians: initialGuardians,
  onBack,
  onConfirm,
  onCreateGuardian,
  disabledFields = NO_DISABLED_FIELDS,
}) {
  const [guardians, setGuardians] = useState(
    Array.isArray(initialGuardians)
      ? initialGuardians.map((guardian) => ({ ...guardian }))
      : []
  );
  const [adding, setAdding] = useState(false);
  const [editingGuardian, setEditingGuardian] = useState(null);

  function legalRoleName(value) {
    const option = guardianSchema.fields.legalRole?.options?.find(
      (option) => option.value === value
    );
    return String(option?.label || option?.name || value || "")
      .trim()
      .toLowerCase();
  }

  async function handleGuardianCommit({ guardian, matched }) {
    const guardianId = normalizeId(guardian.id);
    if (studentId && guardianId === normalizeId(studentId)) {
      emitError("El representante no puede tener la misma cédula que el estudiante.");
      return false;
    }
    const editingId = editingGuardian ? normalizeId(editingGuardian.id) : null;
    const otherGuardians = guardians.filter((candidate) => normalizeId(candidate.id) !== editingId);

    const role = legalRoleName(guardian.legalRole);
    const previousRole = (guardian.assignedStudents || [])
      .map((student) => legalRoleName(student.legalRole))
      .find((previous) => ["padre", "madre"].includes(previous) && previous !== role);
    if (previousRole && role !== "representante legal") {
      emitError(`El representante ha sido registrado como ${previousRole} anteriormente.`);
      return false;
    }
    if (
      otherGuardians.some(
        (candidate) => normalizeId(candidate.id) === guardianId
      )
    ) {
      emitError("Este representante ya está asignado al estudiante.");
      return false;
    }
    if (otherGuardians.some((candidate) => legalRoleName(candidate.legalRole) === role)) {
      emitError("Solo puede asignar un representante por rol.");
      return false;
    }

    try {
      if (editingGuardian) {
        setGuardians((current) =>
          current.map((candidate) =>
            normalizeId(candidate.id) === guardianId
              ? { ...candidate, legalRole: guardian.legalRole }
              : candidate
          )
        );
        setEditingGuardian(null);
        return true;
      }
      let student;
      try {
        student = await getStudentById("all", guardianId);
      } catch (error) {
        if (error.cause?.status !== 404) throw error;
      }
      if (normalizeId(student?.student?.id ?? student?.id) === guardianId) {
        emitError("Esta cédula ya está registrada como estudiante.");
        return false;
      }
      const savedGuardian = matched
        ? guardian
        : await onCreateGuardian(guardian);
      setGuardians((current) => [
        ...current,
        {
          ...savedGuardian,
          id: normalizeId(savedGuardian.id),
          _locked: true,
        },
      ]);
      setAdding(false);
      return true;
    } catch (error) {
      emitError(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  if (adding || editingGuardian) {
    return (
      <GuardianForm
        guardian={editingGuardian}
        guardianSchema={guardianSchema}
        disabledFields={
          editingGuardian
            ? new Set([
                ...disabledFields,
                "id",
                ...guardianSchema.attributes.filter((field) => field !== "legalRole"),
              ])
            : disabledFields
        }
        onBack={() => {
          setAdding(false);
          setEditingGuardian(null);
        }}
        onCommit={handleGuardianCommit}
      />
    );
  }

  return (
    <section className="space-y-6">
      <CardHeader
        title="Representantes"
        onBack={onBack}
        backLabel="Volver a los datos del estudiante"
        actions={
          <Button type="button" onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            Agregar representante
          </Button>
        }
      />

      {guardians.length > 0 ? (
        <ul className="divide-y divide-gray-100">
          {guardians.map((guardian) => {
            const id = normalizeId(guardian.id);
            return (
              <li
                key={id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <UserRound
                    aria-hidden="true"
                    className="h-11 w-11 rounded-full bg-gray-100 p-2 text-gray-400"
                  />
                  <div>
                    <p className="font-semibold text-gray-700">
                      {guardianName(guardian)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {guardian.legalRole || id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <EditButton
                    aria-label={`Editar representante ${guardianName(
                      guardian
                    )}`}
                    onClick={() => setEditingGuardian(guardian)}
                  />
                  <DeleteButton
                    aria-label={`Quitar representante ${guardianName(
                      guardian
                    )}`}
                    onClick={() =>
                      setGuardians((current) =>
                        current.filter(
                          (candidate) => normalizeId(candidate.id) !== id
                        )
                      )
                    }
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          No hay representantes asignados.
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" onClick={onBack}>
          Cancelar
        </Button>
        <PrimaryButton type="button" onClick={() => onConfirm(guardians)}>
          Aceptar
        </PrimaryButton>
      </div>
    </section>
  );
}
