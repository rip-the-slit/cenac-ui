import { useLoaderData } from "react-router";
import { getPeriodList, getStudentById } from "../../../db";
import {
  Card,
  CardHeader,
  FormField,
  PageLayout,
  TextInput,
} from "../../../components/Layout";

export async function studentDetailLoader({ params }) {
  const periodList = await getPeriodList();
  const periodId =
    params.periodId === "actual" ? periodList[0].id : params.periodId;
  const data = await getStudentById(periodId, params.studentId);
  if (!data) throw new Response("Estudiante no encontrado", { status: 404 });
  return data;
}

export default function StudentDetail() {
  const { student, studentFieldLabels } = useLoaderData();

  return (
    <PageLayout title="Estudiantes">
      <Card>
        <CardHeader
          title="Detalle del Estudiante"
          backTo=".."
          backLabel="Volver a la lista de estudiantes"
        />
        <div className="grid gap-5 sm:grid-cols-2">
          {Object.entries(studentFieldLabels)
            .filter(([field]) => Object.hasOwn(student, field))
            .map(([field, label]) => (
              <FormField key={field} label={label}>
                <TextInput value={student[field] ?? ""} readOnly />
              </FormField>
            ))}
        </div>
      </Card>
    </PageLayout>
  );
}
