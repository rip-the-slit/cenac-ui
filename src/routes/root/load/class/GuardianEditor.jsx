import FieldInput from "../../../../components/FieldInput";
import { useState } from "react";
import { Plus, Trash2, UserRound } from "lucide-react";

import { Button, DeleteButton, PrimaryButton } from "../../../../components/Button";
import {
  CardHeader,
  FormField,
} from "../../../../components/Layout";
import IdInput from "./IdInput";
import { normalizeId } from "./classLoaderUtils";

function guardianName(guardian) {
  return (
    `${guardian.firstName ?? ""} ${guardian.lastName ?? ""}`.trim() ||
    normalizeId(guardian.id)
  );
}

function GuardianForm({
  guardianSchema,
  onBack,
  onCommit,
}) {
  const [draft, setDraft] = useState({
    ...guardianSchema.template,
    ...Object.fromEntries(Object.entries(guardianSchema.fields)
      .filter(([, definition]) => definition.default !== undefined)
      .map(([name, definition]) => [name, definition.default])),
    id: guardianSchema.template.id || "V-",
  });
  const [lockedIdentity, setLockedIdentity] = useState(null);
  const locked = lockedIdentity !== null;

  function updateField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function handleIdChange(value) {
    if (lockedIdentity) {
      setLockedIdentity(null);
    }
    updateField("id", value);
  }

  function populateGuardian(guardian) {
    const nextGuardian = {};
    for (const field of guardianSchema.attributes) {
      nextGuardian[field] =
        field === "id"
          ? normalizeId(guardian[field])
          : String(guardian[field] ?? "");
    }
    nextGuardian._locked = true;
    setDraft(nextGuardian);
    setLockedIdentity(nextGuardian);
  }

  function buildGuardian() {
    const identity = lockedIdentity ?? draft;
    const guardian = {
      ...identity,
      id: normalizeId(identity.id),
      _locked: locked,
    };

    for (const field of guardianSchema.attributes) {
      if (field !== "id") {
        guardian[field] = String(identity[field] ?? "").trim();
      }
    }
    return guardian;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await onCommit({
      guardian: buildGuardian(),
      matched: locked,
    });
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <CardHeader
        title="Agregar representante"
        onBack={onBack}
        backLabel="Volver a la lista de representantes"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {guardianSchema.attributes.map((field) => (
          <FormField
            key={field}
            label={guardianSchema.fields[field]?.label || field}
            className={field === "address" ? "sm:col-span-2" : ""}
          >
            {field === "id" ? (
              <div className="rounded-lg border border-gray-300 px-2 py-2">
                <IdInput
                  value={draft.id}
                  label={guardianSchema.fields[field]?.label || field}
                  required={guardianSchema.fields[field].required}
                  onChange={handleIdChange}
                  onSuggestionSelect={populateGuardian}
                  suggestionsEndpoint="/api/guardians"
                  suggestionsLabel="Sugerencias de representantes"
                />
              </div>
            ) : (
              <FieldInput
                definition={guardianSchema.fields[field]}
                value={draft[field] ?? ""}
                disabled={locked}
                onChange={(event) =>
                  updateField(field, event.target.value)
                }
              />
            )}
          </FormField>
        ))}
      </div>

      {locked && (
        <p className="text-sm text-gray-600">
          Los datos de un representante preexistente no se pueden modificar;
          cambie la cédula para crear uno diferente.
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" onClick={onBack}>
          Cancelar
        </Button>
        <PrimaryButton type="submit">Aceptar</PrimaryButton>
      </div>
    </form>
  );
}

export default function GuardianEditor({
  emitError,
  guardianSchema,
  guardians: initialGuardians,
  onBack,
  onConfirm,
  onCreateGuardian,
}) {
  const [guardians, setGuardians] = useState(
    Array.isArray(initialGuardians)
      ? initialGuardians.map((guardian) => ({ ...guardian }))
      : []
  );
  const [adding, setAdding] = useState(false);

  async function handleGuardianCommit({ guardian, matched }) {
    const guardianId = normalizeId(guardian.id);
    if (!/^[VE]-[1-9]\d{0,7}$/.test(guardianId)) {
      emitError("Ingrese una cédula válida para el representante.");
      return false;
    }

    if (
      guardians.some(
        (candidate) => normalizeId(candidate.id) === guardianId
      )
    ) {
      emitError("Este representante ya está asignado al estudiante.");
      return false;
    }

    try {
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

  if (adding) {
    return (
      <GuardianForm
        guardianSchema={guardianSchema}
        onBack={() => setAdding(false)}
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
                <DeleteButton
                  aria-label={`Quitar representante ${guardianName(guardian)}`}
                  onClick={() =>
                    setGuardians((current) =>
                      current.filter(
                        (candidate) =>
                          normalizeId(candidate.id) !== id
                      )
                    )
                  }
                />
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
        <PrimaryButton
          type="button"
          onClick={() => onConfirm(guardians)}
        >
          Aceptar
        </PrimaryButton>
      </div>
    </section>
  );
}
