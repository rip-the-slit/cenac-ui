import { useEffect } from "react";
import { Check } from "lucide-react";
import {
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
} from "react-router";
import {
  clearCache,
  getCache,
  getPeriodList,
  loadPeriodData,
} from "../../../db";
import { useErrorDialog } from "../../../context/ErrorDialogContext";
import { getActiveUser } from "../../../auth";
import { PageLayout } from "../../../components/Layout";

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
  const activeUser = getActiveUser();
  const userLevel = activeUser?.userLevel ?? activeUser?.userlevel;

  if (!["Administrador", "Coordinador"].includes(userLevel)) {
    throw new Error("No tiene permisos para cargar datos del período.");
  }

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

export async function dataAction({ params }) {
  try {
    const subjects = getCache("subjects");
    const classStudents = getCache("class_students");
    const periodList = await getPeriodList();
    const periodId =
      params.periodId === "actual" ? periodList[0].id : params.periodId;

    await loadPeriodData(periodId, classStudents, subjects);
    clearCache("subjects");
    clearCache("class_students");
    return redirect("..");
  } catch (error) {
    return error;
  }
}

export default function DataLoader() {
  const { subjectsLoaded, classesLoaded, canConfirm } = useLoaderData();
  const actionData = useActionData();
  const { emitError } = useErrorDialog();

  useEffect(() => {
    if (actionData instanceof Error) {
      emitError(actionData.message);
    }
  }, [actionData, emitError]);

  return (
    <PageLayout title="Carga de datos">
      <p className="text-gray-600 mb-8">
        Empiece por cargar los datos de este período escolar
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 mb-8 gap-8">
        <Link
          to="materias"
          className={"relative block p-6 bg-white border rounded-lg shadow-sm hover:bg-gray-100 transition-colors " + (subjectsLoaded ? "border-emerald-500": "border-gray-200")}
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
          className={"relative block p-6 bg-white border rounded-lg shadow-sm hover:bg-gray-100 transition-colors " + (classesLoaded ? "border-emerald-500": "border-gray-200")}
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
      <Form method="post">
        <button
          className={`flex items-center mx-auto gap-2 font-bold p-3 shadow-sm rounded-lg border text-white ${
            canConfirm
              ? "bg-gradient-to-b from-emerald-500 to-emerald-600 border-emerald-500"
              : "bg-gray-300 border-gray-300 cursor-not-allowed"
          }`}
          type="submit"
          disabled={!canConfirm}
        >
          Confirmar <Check className="w-5 h-5" />
        </button>
      </Form>
    </PageLayout>
  );
}
