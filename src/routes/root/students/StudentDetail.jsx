import { Form, Link, redirect, useLoaderData } from "react-router";
import { getPeriodList, getStudentById, updateStudent } from "../../../db";

export async function studentDetailLoader({ params }) {
  const periodList = await getPeriodList();
  const periodId = params.periodId === "actual" ? periodList[0] : params.periodId;
  const data = await getStudentById(periodId, params.studentId);
  if (!data) {
    throw new Response("Estudiante no encontrado", { status: 404 });
  }
  return data;
}

export async function studentDetailAction({ params, request }) {
  const periodList = await getPeriodList();
  const periodId = params.periodId === "actual" ? periodList[0] : params.periodId;
  const formData = await request.formData();
  await updateStudent(periodId, params.studentId, {
    id: String(formData.get("id") || ""),
    firstName: String(formData.get("firstName") || ""),
    lastName: String(formData.get("lastName") || ""),
    dateOfBirth: String(formData.get("dateOfBirth") || ""),
    birthPlace: String(formData.get("birthPlace") || ""),
    _class: {
      year: Number(formData.get("year") || 0),
      id: String(formData.get("class") || ""),
    },
  });
  const url = new URL(request.url);
  return redirect(url.pathname + (url.search || ""));
}

export default function StudentDetail() {
  const { student, years, classesByYear, studentFieldLabels } = useLoaderData();
  const selectedYear = student?._class?.year;
  const availableClasses = classesByYear?.[selectedYear] || [];

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Detalle del Estudiante</h2>
        <Link className="text-sm text-emerald-700 underline" to="..">
          Cerrar
        </Link>
      </div>
      <Form method="post" className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          {studentFieldLabels.id}
          <input className="rounded-lg border border-gray-300 px-3 py-2" name="id" defaultValue={student.id} required />
        </label>
        <label className="grid gap-1 text-sm">
          {studentFieldLabels.firstName}
          <input className="rounded-lg border border-gray-300 px-3 py-2" name="firstName" defaultValue={student.firstName} required />
        </label>
        <label className="grid gap-1 text-sm">
          {studentFieldLabels.lastName}
          <input className="rounded-lg border border-gray-300 px-3 py-2" name="lastName" defaultValue={student.lastName} required />
        </label>
        <label className="grid gap-1 text-sm">
          {studentFieldLabels.dateOfBirth}
          <input className="rounded-lg border border-gray-300 px-3 py-2" name="dateOfBirth" defaultValue={student.dateOfBirth} />
        </label>
        <label className="grid gap-1 text-sm">
          {studentFieldLabels.birthPlace}
          <input className="rounded-lg border border-gray-300 px-3 py-2" name="birthPlace" defaultValue={student.birthPlace} />
        </label>
        <label className="grid gap-1 text-sm">
          Año
          <select className="rounded-lg border border-gray-300 px-3 py-2" name="year" defaultValue={selectedYear}>
            {years.map((year) => (
              <option key={year.id} value={year.id}>{year.name}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Sección
          <select className="rounded-lg border border-gray-300 px-3 py-2" name="class" defaultValue={student?._class?.id}>
            {availableClasses.map((classId) => (
              <option key={classId} value={classId}>{classId}</option>
            ))}
          </select>
        </label>
        <div className="md:col-span-2">
          <button className="rounded-lg bg-emerald-600 px-4 py-2 text-white" type="submit">
            Guardar
          </button>
        </div>
      </Form>
    </section>
  );
}
