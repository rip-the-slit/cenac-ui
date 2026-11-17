import { useEffect, useState } from "react";
import { Form, redirect, useActionData, useLoaderData } from "react-router";

import { PageLayout } from "../../../../components/Layout";
import { PrimaryButton } from "../../../../components/Button";
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

export async function subjectAction({ request }) {
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
  
  if (!["Administrador", "Coordinador"].includes(activeUser?.userLevel)) {
    return redirect(`/periodo/${encodeURIComponent(params.periodId)}/cargar`);
  }

  const cachedSubjects = getCache("subjects");
  const [years, subjects, suggestions] = await Promise.all([
    getYears(),
    getSubjects(),
    getSubjectSuggestions(),
  ]);
  const { subjectsByYear: suggestedSubjects } = suggestions;

  const subjectsPerYear =
    Object.prototype.toString.call(cachedSubjects) === "[object Object]" &&
    Object.entries(cachedSubjects).length
      ? cachedSubjects
      : suggestedSubjects ||
        years.reduce((acc, year) => {
          acc[year.id] = [];
          return acc;
        }, {});

  years.forEach((year) => {
    subjectsPerYear[year.id] = (subjectsPerYear[year.id] || []).reduce(
      (acc, s) => {
        acc[s] = true;
        return acc;
      },
      {}
    );
  });

  return { years, subjects, subjectsPerYear };
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
      <p className="mb-6 text-gray-600">
        Seleccione al menos {MIN_SUBJECTS} materias correspondientes a cada año.
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
                  {loaderData.years.map((year) => (
                    <BodyCell key={year.id} className="text-center">
                      <input
                        type="checkbox"
                        aria-label={`${subject.name} — ${year.name}`}
                        name={`year${year.id}`}
                        value={subject.id}
                        checked={Boolean(subjectsPerYear[year.id]?.[subject.id])}
                        onChange={() => handleToggle(year.id, subject.id)}
                      />
                    </BodyCell>
                  ))}
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
