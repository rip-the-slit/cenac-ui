import { useState } from "react";
import { getCache, getSubjects, getYears, saveCache } from "../../../db";
import { Form, redirect, useLoaderData } from "react-router";
import CollapsibleSection from "./CollapsibleSection";

export async function subjectAction({ request }) {
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
      console.error(error);
    }
  }

  const years = {}
  for (let i = 1; i <= 5; i++) {
    const subjects = formData.getAll(`year${i}`);
    years[i] = subjects;
  }

  saveCache("subjects", years);
  return redirect("../secciones");
}

export async function subjectLoader() {
  const years = await getYears();
  const subjects = await getSubjects();
  const cachedSubjects = getCache("subjects");
  const subjectsPerYear = {};
  for (const year of years) {
    const cached = cachedSubjects?.[year.id] ?? cachedSubjects?.[String(year.id)] ?? [];
    subjectsPerYear[year.id] = Object.fromEntries(
      (Array.isArray(cached) ? cached : []).map((subjectId) => [String(subjectId), true])
    );
  }
  return { years, subjects, subjectsPerYear };
}

function SubjectSelector({ yearId, options, checkedItems, onToggle }) {
  return (
    <fieldset className="p-4 grid auto-rows-[2rem] md:grid-cols-3 lg:grid-cols-5 md:min-h-5 gap-2">
      {options.map((option) => (
        <label key={option.id} className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            checked={!!checkedItems[String(option.id)]}
            onChange={() => onToggle(yearId, option.id)}
            name={`year${yearId}`}
            value={option.id}
          />
          <span className="text-gray-700 text-ellipsis line-clamp-2">{option.name}</span>
        </label>
      ))}
    </fieldset>
  );
}

export default function SubjectLoader() {
  const loaderData = useLoaderData();
  const years = loaderData.years;
  const subjects = loaderData.subjects;
  const [subjectsPerYear, setSubjectsPerYear] = useState(loaderData.subjectsPerYear);

  const handleToggle = (yearId, subjectId) => {
    setSubjectsPerYear((prev) => {
      const yearSelection = { ...(prev[yearId] || {}) };
      const key = String(subjectId);
      if (yearSelection[key]) {
        delete yearSelection[key];
      } else {
        yearSelection[key] = true;
      }
      return { ...prev, [yearId]: yearSelection };
    });
  };

  return (
    <div className="mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8">Carga de Materias</h1>
      <p className="text-gray-600 mb-6 text-center">
        Seleccione las materias correspondientes a cada año.
      </p>

      <Form method="post">
        <input
          type="hidden"
          name="subjects_payload"
          value={JSON.stringify(subjectsPerYear)}
        />
        {years.map((y, i) => (
          <CollapsibleSection open={i === 0} key={y.id} title={y.name}>
            <SubjectSelector
              yearId={y.id}
              options={subjects}
              checkedItems={subjectsPerYear[y.id] || {}}
              onToggle={handleToggle}
            />
          </CollapsibleSection>
        ))}
        <button
          type="submit"
          className="text-emerald-600 underline decoration-wavy"
        >
          Continuar
        </button>
      </Form>
    </div>
  );
}
