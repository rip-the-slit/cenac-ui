import { useEffect } from "react";
import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
} from "react-router";
import { getPeriodList, getStudentById, updateStudent } from "../../../db";
import { useErrorDialog } from "../../../context/ErrorDialogContext";
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
  if (!data) {
    throw new Response("Estudiante no encontrado", { status: 404 });
  }
  return data;
}

export async function studentDetailAction({ params, request }) {
  try {
    const periodList = await getPeriodList();
    const periodId =
      params.periodId === "actual" ? periodList[0].id : params.periodId;
    const formData = await request.formData();
    await updateStudent(periodId, params.studentId, {
      id: String(formData.get("id") || ""),
      firstName: String(formData.get("firstName") || ""),
      lastName: String(formData.get("lastName") || ""),
      birthDate: String(formData.get("birthDate") || ""),
      birthPlace: String(formData.get("birthPlace") || ""),
      _class: {
        year: Number(formData.get("year") || 0),
        id: String(formData.get("class") || ""),
      },
    });
    const url = new URL(request.url);
    return redirect(url.pathname + (url.search || ""));
  } catch (error) {
    return error;
  }
}

export default function StudentDetail() {
  const { student, studentFieldLabels } = useLoaderData();
  const actionData = useActionData();
  const { emitError } = useErrorDialog();

  useEffect(() => {
    if (actionData instanceof Error) {
      emitError(actionData.message);
    }
  }, [actionData, emitError]);

  return (
    <PageLayout title="Estudiantes">
      <Card>
        <CardHeader
          title="Detalle del Estudiante"
          backTo=".."
          backLabel="Volver a la lista de estudiantes"
        />
        <Form method="post" className="grid gap-5 sm:grid-cols-2">
          <FormField label={studentFieldLabels.id}>
            <TextInput name="id" defaultValue={student.id} required />
          </FormField>
          <FormField label={studentFieldLabels.firstName}>
            <TextInput
              name="firstName"
              defaultValue={student.firstName}
              required
            />
          </FormField>
          <FormField label={studentFieldLabels.lastName}>
            <TextInput
              name="lastName"
              defaultValue={student.lastName}
              required
            />
          </FormField>
          <FormField label={studentFieldLabels.birthDate}>
            <TextInput name="birthDate" defaultValue={student.birthDate} />
          </FormField>
          <FormField label={studentFieldLabels.birthPlace}>
            <TextInput name="birthPlace" defaultValue={student.birthPlace} />
          </FormField>
          <div className="md:col-span-2"></div>
        </Form>
      </Card>
    </PageLayout>
  );
}
