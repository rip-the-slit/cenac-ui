import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useFetcher, useLoaderData, useRevalidator } from "react-router";
import {
  createGuardian,
  editStudent,
  getGrades,
  getPeriodList,
  getStudentById,
} from "../../../db";
import { Card, CardHeader, PageLayout } from "../../../components/Layout";
import { EditButton } from "../../../components/Button";
import { useErrorDialog } from "../../../context/ErrorDialogContext";
import DetailFields from "../components/DetailFields";
import { StudentEditorModal } from "../load/class/StudentEditor";
import RelationshipLinks from "../components/RelationshipLinks";
import TableControl from "../components/TableControl";
import GradesTable from "../grades/GradesTable";

const MAX_TABLE_ROWS = 20;
const DISABLED_FIELDS = new Set(["id", "enrollment"]);

export async function studentDetailLoader({ params, request }) {
  const periodList = await getPeriodList();
  const periodId =
    params.periodId === "actual" ? periodList[0].id : params.periodId;
  const url = new URL(request.url);
  const requestedPage = Number.parseInt(url.searchParams.get("page"), 10);
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const expanded = url.searchParams.get("expanded") || "";
  const data = await getStudentById(periodId, params.studentId);
  if (!data) throw new Response("Estudiante no encontrado", { status: 404 });
  const academicRecord = await getGrades(
    "all",
    "",
    "",
    "",
    params.studentId,
    page,
    MAX_TABLE_ROWS
  );
  const pageCount = Math.max(
    1,
    Math.ceil(academicRecord.recordsAmount / MAX_TABLE_ROWS)
  );
  return {
    ...data,
    academicRecord,
    filters: { page: String(Math.min(page, pageCount)), expanded },
  };
}

export default function StudentDetail() {
  const loaderData = useLoaderData();
  const fetcher = useFetcher();
  const { revalidate } = useRevalidator();
  const { emitError } = useErrorDialog();
  const [editor, setEditor] = useState(null);
  const { student, fields } = loaderData;
  const schemas = {
    studentSchema: {
      template: student,
      fields: fields.student,
      attributes: Object.keys(fields.student),
    },
    guardianSchema: {
      template: {},
      fields: fields.guardian,
      attributes: Object.keys(fields.guardian),
    },
  };
  const { academicRecord, filters } = fetcher.data ?? loaderData;
  const page = Number(fetcher.formData?.get("page") ?? filters.page);
  const expanded = fetcher.formData?.get("expanded") ?? filters.expanded;
  const expandedIndex = expanded === "" ? null : Number(expanded);
  const pageCount = Math.max(
    1,
    Math.ceil(academicRecord.recordsAmount / MAX_TABLE_ROWS)
  );
  const submitFilters = (nextPage, nextExpanded) => {
    const params = new URLSearchParams({ page: String(nextPage) });
    if (nextExpanded !== "") params.set("expanded", nextExpanded);
    fetcher.submit(params, { method: "get" });
  };

  async function commitStudent({ originalId, student: draft }) {
    const changes = Object.fromEntries(
      schemas.studentSchema.attributes
        .filter((field) => field !== "id" && Object.hasOwn(draft, field))
        .map((field) => [field, draft[field]])
    );
    changes.assignedGuardians = draft.assignedGuardians.map(({ id, legalRole }) => ({
      id, legalRole,
    }));
    await editStudent(originalId, changes);
    await revalidate();
    return true;
  }

  async function addGuardian(guardian) {
    const data = Object.fromEntries(
      schemas.guardianSchema.attributes
        .filter((field) => field !== "assignedStudents")
        .map((field) => [field, guardian[field]])
    );
    return createGuardian(data);
  }

  function closeEditor() {
    setEditor(null);
  }

  return (
    <PageLayout title="Estudiantes">
      <Card>
        <CardHeader
          title="Detalle del Estudiante"
          backTo=".."
          backLabel="Volver a la lista de estudiantes"
          actions={
            <EditButton
              aria-label="Editar estudiante"
              onClick={() =>
                setEditor({
                  mode: "edit",
                  originalId: student.id,
                  student: { ...student, _locked: false },
                })
              }
            />
          }
        />
        <div className="space-y-5">
          <DetailFields record={student} fields={fields.student} />
          <div className="space-y-2">
            <h2 className="text-lg font-medium text-gray-700">
              Representantes
            </h2>
            <RelationshipLinks
              records={student.assignedGuardians}
              entity="representantes"
              expanded
            />
          </div>
        </div>
      </Card>
      <section className="space-y-4" aria-labelledby="academic-record-heading">
        <h2
          id="academic-record-heading"
          className="text-2xl font-semibold text-gray-800"
        >
          Record Académico
        </h2>
        {academicRecord.rows.length === 0 ? (
          <p className="text-sm text-gray-500">No hay registros académicos.</p>
        ) : (
          <div className="relative">
            {fetcher.state !== "idle" && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
                <RefreshCw className="h-5 w-5 animate-spin text-gray-500" />
              </div>
            )}
            <TableControl
              page={page}
              pageCount={pageCount}
              recordsAmount={academicRecord.recordsAmount}
              selectedIds={{ all: false }}
              bulkActionId="academic-record-bulk-action"
              bulkActionOptions={[]}
              onPageChange={(nextPage) => submitFilters(nextPage, expanded)}
            >
              <GradesTable
                rows={academicRecord.rows}
                subjects={academicRecord.subjects}
                years={academicRecord.years}
                fields={academicRecord.fields}
                statuses={academicRecord.statuses}
                expandedIndex={expandedIndex}
                isEditing={false}
                selectable={false}
                showPeriod
                className="max-h-[55vh] overflow-auto"
                onExpandedChange={(nextExpanded) =>
                  submitFilters(page, nextExpanded)
                }
              />
            </TableControl>
          </div>
        )}
      </section>
      {editor && (
        <StudentEditorModal
          editor={editor}
          config={{
            ...schemas,
            emitError,
            onCommit: commitStudent,
            onCreateGuardian: addGuardian,
          }}
          disabledFields={DISABLED_FIELDS}
          onClose={closeEditor}
        />
      )}
    </PageLayout>
  );
}
