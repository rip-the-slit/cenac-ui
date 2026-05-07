import { Check } from "lucide-react";
import { Link, useLoaderData } from "react-router";
import { getCache } from "../../../db";

function hasData(data) {
  if (Array.isArray(data)) {
    return data.length > 0;
  }
  if (data && typeof data === "object") {
    return Object.keys(data).length > 0;
  }
  return false;
}

export async function dataLoader() {
  const subjects = getCache("subjects");
  const classStudents = getCache("class_students");
  const subjectsLoaded = hasData(subjects);
  const classesLoaded = hasData(classStudents);
  return {
    subjectsLoaded,
    classesLoaded,
    canConfirm: subjectsLoaded && classesLoaded,
  };
}

export default function DataLoader() {
  const { subjectsLoaded, classesLoaded, canConfirm } = useLoaderData();

  return (
    <div className="mx-auto">
      <h1 className="text-3xl font-bold text-center mb-4">Carga de datos</h1>
      <p className="text-gray-600 mb-8 text-center">
        Empiece por cargar los datos de este período escolar
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 mb-8 gap-8">
        <Link
          to="materias"
          className="relative block p-6 bg-white border border-gray-200 rounded-lg shadow-md hover:bg-gray-100 transition-colors"
        >
          {subjectsLoaded && (
            <Check className="absolute right-4 top-4 w-5 h-5 text-emerald-600" />
          )}
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Materias
          </h2>
          <p className="text-gray-600">
            Asigne las materias correspondientes a cada año.
          </p>
        </Link>
        <Link
          to="secciones"
          className="relative block p-6 bg-white border border-gray-200 rounded-lg shadow-md hover:bg-gray-100 transition-colors"
        >
          {classesLoaded && (
            <Check className="absolute right-4 top-4 w-5 h-5 text-emerald-600" />
          )}
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Secciones
          </h2>
          <p className="text-gray-600">
            Asigne las secciones y sus respectivos estudiantes.
          </p>
        </Link>
      </div>
      <button
          className={`mx-auto flex items-center gap-2 font-bold p-3 shadow-sm rounded-lg border text-white ${
            canConfirm
              ? "bg-gradient-to-b from-emerald-500 to-emerald-600 border-emerald-500"
              : "bg-gray-300 border-gray-300 cursor-not-allowed"
          }`}
          type="button"
          disabled={!canConfirm}
        >
          Confirmar <Check className="w-5 h-5" />
        </button>
    </div>
  );
}
