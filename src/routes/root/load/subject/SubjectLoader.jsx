import { useEffect, useState } from "react";
import { Form, redirect, useActionData, useLoaderData } from "react-router";

import { PageLayout } from "../../../../components/Layout";
import {PrimaryButton} from "../../../../components/Button"
import { useErrorDialog } from "../../../../context/ErrorDialogContext";
import {
  getCache,
  getSubjects,
  getYears,
  saveCache,
} from "../../../../db";
import CollapsibleSection from "../CollapsibleSection";
import SubjectSelector from "./SubjectSelector";

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

export async function subjectLoader() {
  const years = await getYears();
  const subjects = await getSubjects();
  const cachedSubjects = getCache("subjects");
  const subjectsPerYear = {};

  for (const year of years) {
    const cached =
      cachedSubjects?.[year.id] ??
      cachedSubjects?.[String(year.id)] ??
      [];
    subjectsPerYear[year.id] = Object.fromEntries(
      (Array.isArray(cached) ? cached : []).map((subjectId) => [
        String(subjectId),
        true,
      ])
    );
  }

  return { years, subjects, subjectsPerYear };
}

export default function SubjectLoader() {
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
    setSubjectsPerYear((current) => {
      const yearSelection = { ...(current[yearId] || {}) };
      const key = String(subjectId);

      if (yearSelection[key]) {
        delete yearSelection[key];
      } else {
        yearSelection[key] = true;
      }

      return { ...current, [yearId]: yearSelection };
    });
  }

  return (
    <PageLayout title="Carga de Materias">
      <p className="mb-6 text-gray-600">
        Seleccione las materias correspondientes a cada año.
      </p>

      <Form method="post">
        <input
          type="hidden"
          name="subjects_payload"
          value={JSON.stringify(subjectsPerYear)}
        />
        {loaderData.years.map((year, index) => (
          <CollapsibleSection
            open={index === 0}
            key={year.id}
            title={year.name}
          >
            <SubjectSelector
              yearId={year.id}
              options={loaderData.subjects}
              checkedItems={subjectsPerYear[year.id] || {}}
              onToggle={handleToggle}
            />
          </CollapsibleSection>
        ))}
        <PrimaryButton
          type="submit"
        >
          Continuar
        </PrimaryButton>
      </Form>
    </PageLayout>
  );
}
