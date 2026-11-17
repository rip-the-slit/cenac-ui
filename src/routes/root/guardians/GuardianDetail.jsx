import RelationshipLinks from "../components/RelationshipLinks";
import { useState } from "react";
import { useLoaderData, useRevalidator } from "react-router";
import { editGuardian, getGuardianById, getPeriodList } from "../../../db";
import { Card, CardHeader, PageLayout } from "../../../components/Layout";
import DetailFields from "../components/DetailFields";
import EditorDialog from "../../../components/EditorDialog";
import { EditButton } from "../../../components/Button";
import { GuardianForm } from "../load/class/GuardianEditor";
import { useErrorDialog } from "../../../context/ErrorDialogContext";
import { getGuardianLegalRoles } from "./guardiansUtils";

const DISABLED_FIELDS = new Set(["id"]);

export async function guardianDetailLoader({ params }) {
  const periodList = await getPeriodList();
  const periodId =
    params.periodId === "actual" ? periodList[0].id : params.periodId;
  const data = await getGuardianById(periodId, params.guardianId);
  if (!data) throw new Response("Representante no encontrado", { status: 404 });
  return data;
}

export default function GuardianDetail() {
  const { guardian, fields } = useLoaderData();
  const { revalidate } = useRevalidator();
  const { emitError } = useErrorDialog();
  const [editorGuardian, setEditorGuardian] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const editableFields = Object.fromEntries(
    Object.entries(fields).filter(
      ([field]) => !["assignedStudents", "legalRole"].includes(field)
    )
  );
  const attributes = Object.keys(editableFields);

  async function commitGuardian({ guardian: draft }) {
    setIsSubmitting(true);
    try {
      const changes = Object.fromEntries(
        attributes
          .filter((field) => field !== "id")
          .map((field) => [field, draft[field]])
      );
      await editGuardian(editorGuardian.id, changes);
      await revalidate();
      setEditorGuardian(null);
      return true;
    } catch (error) {
      emitError(error.message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  function closeEditor() {
    if (!isSubmitting) setEditorGuardian(null);
  }
  return (
    <PageLayout title="Representantes">
      <Card>
        <CardHeader
          title="Detalle del Representante"
          backTo=".."
          backLabel="Volver a la lista de representantes"
          actions={
            <EditButton
              aria-label="Editar representante"
              onClick={() => setEditorGuardian({ ...guardian })}
            />
          }
        />
        <div className="space-y-5">
          <DetailFields
            record={{ ...guardian, legalRole: getGuardianLegalRoles(guardian) }}
            fields={fields}
          />
          <div className="space-y-2">
            <h2 className="text-lg font-medium text-gray-700">
              Estudiantes representados
            </h2>
            <RelationshipLinks
              records={guardian.assignedStudents}
              entity="estudiantes"
              expanded
            />
          </div>
        </div>
      </Card>
      {editorGuardian && (
        <EditorDialog
          label="Editar representante"
          busy={isSubmitting}
          onClose={closeEditor}
        >
          <GuardianForm
            guardian={editorGuardian}
            guardianSchema={{
              template: editorGuardian,
              fields: editableFields,
              attributes,
            }}
            disabledFields={DISABLED_FIELDS}
            onBack={closeEditor}
            onCommit={commitGuardian}
          />
        </EditorDialog>
      )}
    </PageLayout>
  );
}
