import { useEffect, useState } from "react";
import { Form, redirect, useActionData, useLoaderData } from "react-router";

import { PrimaryButton } from "../../../../components/Button";
import { PageLayout } from "../../../../components/Layout";
import { useErrorDialog } from "../../../../context/ErrorDialogContext";
import {
  getCache,
  getSubjects,
  getSubjectSuggestions,
  getYears,
  saveCache,
} from "../../../../db";
import { BodyCell, BodyRow, EmptyTableMessage, HeadCell, TableBody, TableContainer, TableHead } from "../TablePrimitives";
import { getActiveUser } from "../../../../auth";
import useSaveNavigationPrompt from "../useSaveNavigationPrompt";

const MIN_SUBJECTS = 3;

export async function subjectAction({ request, params }) {
  if (getActiveUser()?.userLevel !== "Administrador") {
    return redirect(`/periodo/${encodeURIComponent(params.periodId)}/cargar`);
  }
  try {
    const formData = await request.formData();
    const subjectsPayload = formData.get("subjects_payload");

    if (typeof subjectsPayload === "string" && subjectsPayload.length > 0) {
      try {
        const parsed = JSON.parse(subjectsPayload);
        if (parsed && typeof parsed === "object") {
          const years = {};
          for (const [yearId, subjectMap] of Object.entries(parsed)) {
            years[yearId] = Object.keys(subjectMap || {}).filter(
              (subjectId) => subjectMap?.[subjectId]
            );
          }
          saveCache("subjects", years);
          return redirect("../secciones");
        }
      } catch (error) {
        return error;
      }
    }

    const years = {};
    for (let index = 1; index <= 5; index += 1) {
      years[index] = formData.getAll(`year${index}`);
    }

    saveCache("subjects", years);
    return redirect("../secciones");
  } catch (error) {
    return error;
  }
}

export async function subjectLoader({params}) {
  const activeUser = getActiveUser();
  
  if (activeUser?.userLevel !== "Administrador") {
    return redirect(`/periodo/${encodeURIComponent(params.periodId)}/cargar`);
  }

  const cachedSubjects = getCache("subjects");
  const [years, subjects, suggestions] = await Promise.all([
    getYears(),
    getSubjects(),
    getSubjectSuggestions(),
  ]);
  const toSelection = (byYear) => Object.fromEntries(
    years.map(({ id }) => [id, Object.fromEntries(
      (byYear?.[id] || []).map((subjectId) => [subjectId, true])
    )])
  );
  const suggestedSubjects = toSelection(suggestions.subjectsByYear);
  const subjectsPerYear = cachedSubjects && Object.keys(cachedSubjects).length
    ? toSelection(cachedSubjects)
    : suggestedSubjects;

  return { years, subjects, subjectsPerYear, suggestedSubjects };
}

export default function SubjectLoader() {
  const allowSaveNavigation = useSaveNavigationPrompt();
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const { emitError } = useErrorDialog();
  const [subjectsPerYear, setSubjectsPerYear] = useState(
    loaderData.subjectsPerYear
  );

  useEffect(() => {
    if (actionData instanceof Error) {
      emitError(actionData.message);
    }
  }, [actionData, emitError]);

  function handleToggle(yearId, subjectId) {
    const yearSelection = { ...(subjectsPerYear[yearId] || {}) };
    const key = String(subjectId);
    if (yearSelection[key] && Object.values(yearSelection).filter(Boolean).length <= MIN_SUBJECTS) {
      emitError(`Debe seleccionar al menos ${MIN_SUBJECTS} materias por año.`);
      return;
    }
    if (yearSelection[key]) delete yearSelection[key];
    else yearSelection[key] = true;
    setSubjectsPerYear((current) => ({ ...current, [yearId]: yearSelection }));
  }

  function handleSubmit(event) {
    if (loaderData.years.some((year) => Object.values(subjectsPerYear[year.id] || {}).filter(Boolean).length < MIN_SUBJECTS)) {
      event.preventDefault();
      emitError(`Debe seleccionar al menos ${MIN_SUBJECTS} materias por año.`);
      return;
    }
    allowSaveNavigation();
  }

  return (
    <PageLayout title="Carga de Materias">
      <p className="mb-1 text-gray-600 w-[50ch]">
        Seleccione las materias correspondientes a cada año de acuerdo al plan de estudio establecido por el MPPE para este periodo académico.
      </p>
      <p className="mb-2 text-sm text-gray-600">
        <span aria-hidden="true" className="mr-2 inline-block h-3 w-3 rounded bg-emerald-100" />
        Materia cambiada
      </p>

      <Form method="post" onSubmit={handleSubmit} className="space-y-4">
        <input
          type="hidden"
          name="subjects_payload"
          value={JSON.stringify(subjectsPerYear)}
        />
        <TableContainer className="max-w-2xl">
          <table className="w-full border-collapse text-sm">
            <TableHead>
              <tr>
                <HeadCell scope="col">Materia</HeadCell>
                {loaderData.years.map((year) => <HeadCell key={year.id} scope="col" className="text-center">{year.name}</HeadCell>)}
              </tr>
            </TableHead>
            <TableBody>
              {loaderData.subjects.length === 0 && <EmptyTableMessage colSpan={loaderData.years.length + 1} />}
              {loaderData.subjects.map((subject) => (
                <BodyRow key={subject.id}>
                  <HeadCell className="text-left max-w-[15ch] truncate" scope="row" title={subject.name}>{subject.name}</HeadCell>
                  {loaderData.years.map((year) => {
                    const checked = Boolean(subjectsPerYear[year.id]?.[subject.id]);
                    const suggested = loaderData.suggestedSubjects[year.id]?.[subject.id];
                    return (
                      <BodyCell key={year.id} className={`text-center ${(suggested && !checked) || (!suggested && checked) ? "bg-emerald-50" : ""}`}>
                        <input
                          type="checkbox"
                          aria-label={`${subject.name} — ${year.name}`}
                          name={`year${year.id}`}
                          value={subject.id}
                          checked={checked}
                          title={suggested ? "Materia sugerida" : undefined}
                          onChange={() => handleToggle(year.id, subject.id)}
                        />
                      </BodyCell>
                    );
                  })}
                </BodyRow>
              ))}
            </TableBody>
          </table>
        </TableContainer>
        <PrimaryButton type="submit">Continuar</PrimaryButton>
      </Form>
    </PageLayout>
  );
}
