import { Link, useLoaderData, useRouteLoaderData } from "react-router";
import { getClassesByYear, getPeriodList, getYears } from "../../db";
import ClassCard from "./load/ClassCard";
import CollapsibleSection from "./load/CollapsibleSection";

export async function periodOverviewLoader({ params }) {
  const periodList = await getPeriodList();
  const periodId =
    params.periodId === "actual" ? periodList[0] : params.periodId;
  const years = await getYears();
  const classesByYear = await getClassesByYear(periodId);
  return { years, classesByYear };
}
function clampPercent(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  function polarToCartesian(cx, cy, r, angleDeg) {
    const angle = (Math.PI / 180) * angleDeg;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  }

  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export default function PeriodOverview() {
  const loaderData = useLoaderData();
  const periodData = useRouteLoaderData("period");
  const periodId = loaderData?.periodId ?? periodData?.periodId ?? "actual";
  const stats = loaderData?.stats ?? periodData?.data?.stats ?? null;
  const years = loaderData?.years ?? [];
  const classesByYear = loaderData?.classesByYear ?? {};

  const studentsTotal = stats?.students?.total ?? 0;
  const studentsApproved = stats?.students?.approved ?? 0;
  const gradesTotal = stats?.grades?.total ?? 0;
  const gradesLoaded = stats?.grades?.loaded ?? 0;

  const approvedPercent = clampPercent(
    studentsTotal > 0 ? (studentsApproved / studentsTotal) * 100 : 0
  );
  const gradesPercent = clampPercent(
    gradesTotal > 0 ? (gradesLoaded / gradesTotal) * 100 : 0
  );

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-emerald-500 p-6 text-white shadow-lg">
        <div className="absolute right-0 top-0 h-36 w-36 -translate-y-6 translate-x-8 rounded-full bg-white/15 blur-2xl" />
        <div className="absolute bottom-0 left-0 h-28 w-28 -translate-x-8 translate-y-8 rounded-full bg-emerald-300/40 blur-2xl" />
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-100">
          Resumen del período
        </p>
        <h1 className="mt-2 text-2xl font-bold">Período {periodId}</h1>
        <p className="mt-1 max-w-2xl text-sm text-emerald-50">
          Estado general de aprobación estudiantil y progreso de carga de
          notas.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-emerald-900">
            Aprobados vs Total
          </h2>
          <p className="mt-1 text-sm text-emerald-700">
            {studentsApproved} de {studentsTotal} estudiantes (
            {approvedPercent.toFixed(1)}%)
          </p>
          <div className="mt-3">
            <svg viewBox="0 0 240 140" className="mx-auto h-36 w-full max-w-xs">
              <path
                d={describeArc(120, 120, 78, 180, 360)}
                className="fill-none stroke-emerald-100 [stroke-width:22] [stroke-linecap:round]"
              />
              <path
                d={describeArc(
                  120,
                  120,
                  78,
                  180,
                  180 + (180 * approvedPercent) / 100
                )}
                className="fill-none stroke-emerald-500 [stroke-width:22] [stroke-linecap:round]"
              />
              <text
                x="120"
                y="102"
                textAnchor="middle"
                className="fill-emerald-900 text-[20px] font-bold"
              >
                {approvedPercent.toFixed(1)}%
              </text>
            </svg>
          </div>
        </article>

        <article className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-emerald-900">
            Notas Cargadas
          </h2>
          <p className="mt-1 text-sm text-emerald-700">
            {gradesLoaded} de {gradesTotal} registros
          </p>
          <div className="mt-3 h-4 w-full overflow-hidden rounded-full bg-emerald-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-[width] duration-500"
              style={{ width: `${gradesPercent}%` }}
            />
          </div>
          <p className="mt-1 text-right text-sm font-semibold text-emerald-900">
            {gradesPercent.toFixed(1)}%
          </p>
        </article>
      </section>

      <section className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-emerald-900">
          Secciones por Año
        </h2>
        {years.map((year, i) => {
          const classes = classesByYear[year.id] || [];
          return (
            <CollapsibleSection key={year.id} title={year.name} open={i === 0}>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                {classes.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Sin secciones registradas.
                  </p>
                ) : (
                  classes.map((classId) => (
                    <Link
                      key={`${year.id}-${classId}`}
                      to={`cargar/secciones?year=${year.id}&class=${classId}`}
                      className="block"
                    >
                      <ClassCard className={classId} />
                    </Link>
                  ))
                )}
              </div>
            </CollapsibleSection>
          );
        })}
      </section>
    </div>
  );
}
