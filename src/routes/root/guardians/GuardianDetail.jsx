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
  const { guardian, guardianFieldLabels } = useLoaderData();
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
            <FormField key={field} label={guardianFieldLabels[field] || field}>
              <TextInput value={guardian[field] ?? ""} readOnly />
            </FormField>
          ))}
        </div>
      </Card>
    </PageLayout>
  );
}
