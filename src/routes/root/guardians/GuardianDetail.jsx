import RelationshipLinks from "../components/RelationshipLinks";
import { useLoaderData } from "react-router";
import { getGuardianById } from "../../../db";
import {
  Card,
  CardHeader,
  FormField,
  PageLayout,
  TextInput,
} from "../../../components/Layout";
import { GUARDIAN_FIELDS } from "./guardiansUtils";

export async function guardianDetailLoader({ params }) {
  const data = await getGuardianById(params.guardianId);
  if (!data) throw new Response("Representante no encontrado", { status: 404 });
  return data;
}

export default function GuardianDetail() {
  const { guardian, fields } = useLoaderData();
  return (
    <PageLayout title="Representantes">
      <Card>
        <CardHeader
          title="Detalle del Representante"
          backTo=".."
          backLabel="Volver a la lista de representantes"
        />
        <div className="grid gap-5 sm:grid-cols-2">
          {GUARDIAN_FIELDS.map((field) => (
            <FormField key={field} label={fields[field]?.label || field}>
              <TextInput
                  value={fields[field]?.options?.find(
                    (option) => String(option.value) === String(guardian[field])
                  )?.label ?? guardian[field] ?? ""}
                  readOnly
                />
            </FormField>
          ))}
          <div className="space-y-2 sm:col-span-2">
            <h2 className="text-sm font-medium text-gray-700">Estudiantes representados</h2>
            <RelationshipLinks records={guardian.assignedStudents} entity="estudiantes" />
          </div>
        </div>
      </Card>
    </PageLayout>
  );
}
