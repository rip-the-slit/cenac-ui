import { useEffect } from "react";
import { BookOpen, Check, Users } from "lucide-react";
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  redirect,
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
import cacheSuggestedSubjects from "./cacheSuggestedSubjects";
import { PrimaryButton } from "../../../components/Button";

const steps = [
  { to: "materias", title: "Materias", description: "Asigne las materias correspondientes a cada año.", Icon: BookOpen },
  { to: "secciones", title: "Secciones", description: "Asigne las secciones y sus respectivos estudiantes.", Icon: Users },
];

function visibleSteps(userLevel) {
  return userLevel === "Administrador" ? steps : steps.slice(1);
}

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

  const subjects = activeUser?.userLevel === "Coordinador"
    ? await cacheSuggestedSubjects()
    : getCache("subjects");
  const classStudents = getCache("class_students");
  const subjectsLoaded = hasData(subjects);
  const classesLoaded = Array.isArray(classStudents);
  return {
    activeUser,
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
  const { activeUser, subjectsLoaded, classesLoaded, canConfirm } = useLoaderData();
  const actionData = useActionData();
  const { emitError } = useErrorDialog();

  const disableLoading = !["Administrador", "Coordinador"].includes(
    activeUser?.userLevel
  );

  useEffect(() => {
    if (actionData instanceof Error) {
      emitError(actionData.message);
    } else if (disableLoading) {
      emitError("No tiene permisos para cargar datos del período.")
    }
  }, [actionData, disableLoading, emitError]);

  return (
    <PageLayout title="Carga de datos">
    <div className="mx-auto w-full max-w-[600px]">
      <p className="mb-4 text-gray-600">
        Empiece por cargar los datos de este período escolar
      </p>
      <ul className="mb-8 space-y-3">
        {visibleSteps(activeUser?.userLevel).map(({ to, title, description, Icon }) => {
          const complete = to === "materias" ? subjectsLoaded : classesLoaded;
          return (
            <li key={to}>
              <Link
                to={to}
                aria-disabled={disableLoading}
                onClick={disableLoading ? (event) => event.preventDefault() : undefined}
                className={`flex items-center justify-between gap-4 rounded-lg border p-4 shadow-sm transition-colors hover:bg-gray-50 ${
                  complete ? "border-emerald-500" : "border-gray-200"
                } ${disableLoading ? "pointer-events-none grayscale opacity-50" : ""}`}
              >
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
                  <p className="mt-1 text-gray-600">{description}</p>
                </div>
                {complete
                  ? <Check aria-label="Completado" className="h-6 w-6 shrink-0 text-emerald-600" />
                  : <Icon aria-hidden="true" className="h-10 w-10 shrink-0 text-gray-500" />}
              </Link>
            </li>
          );
        })}
      </ul>
      <Form method="post">
        <PrimaryButton
        className="m-auto"
          type="submit"
          disabled={disableLoading || !canConfirm}
        >
          Confirmar <Check className="w-5 h-5" />
        </PrimaryButton>
      </Form>
    </div>
    </PageLayout>
  );
}
