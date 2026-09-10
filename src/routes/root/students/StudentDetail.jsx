import { useEffect } from "react";
import { Form, Link, redirect, useActionData, useLoaderData } from "react-router";
import { getPeriodList, getStudentById, updateStudent } from "../../../db";
import { useErrorDialog } from "../../../context/ErrorDialogContext";

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
    <section className="rounded-xl border border-gray-200 bg-white p-4 mt-8">
      <div className="mb-4 flex items-center justify-between">
        <Link className="text-sm text-emerald-700 underline" to="..">
          Regresar
        </Link>
        <h2 className="text-lg font-semibold text-center flex-grow">Detalle del Estudiante</h2>
      </div>
      <Form method="post" className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          {studentFieldLabels.id}
          <input
            className="rounded-lg border border-gray-300 px-3 py-2"
            name="id"
            defaultValue={student.id}
            required
          />
        </label>
        <label className="grid gap-1 text-sm">
          {studentFieldLabels.firstName}
          <input
            className="rounded-lg border border-gray-300 px-3 py-2"
            name="firstName"
            defaultValue={student.firstName}
            required
          />
        </label>
        <label className="grid gap-1 text-sm">
          {studentFieldLabels.lastName}
          <input
            className="rounded-lg border border-gray-300 px-3 py-2"
            name="lastName"
            defaultValue={student.lastName}
            required
          />
        </label>
        <label className="grid gap-1 text-sm">
          {studentFieldLabels.birthDate}
          <input
            className="rounded-lg border border-gray-300 px-3 py-2"
            name="birthDate"
            defaultValue={student.birthDate}
          />
        </label>
        <label className="grid gap-1 text-sm">
          {studentFieldLabels.birthPlace}
          <input
            className="rounded-lg border border-gray-300 px-3 py-2"
            name="birthPlace"
            defaultValue={student.birthPlace}
          />
        </label>
        <div className="md:col-span-2">
        </div>
      </Form>
    </section>
  );
}
