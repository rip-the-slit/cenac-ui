import { Link, Outlet, useLoaderData, useSearchParams } from "react-router";
import { getPeriodList, getStudents } from "../../../db";
import {
  BodyCell,
  DataTable,
  HeadCell,
  TableBody,
  TableContainer,
  TableHead,
} from "../load/TablePrimitives";

function pickClasses(classesByYear, year) {
  if (year) return classesByYear?.[Number(year)] || [];
  const all = new Set();
  Object.values(classesByYear || {}).forEach((list) => (list || []).forEach((classId) => all.add(classId)));
  return [...all].sort();
}

export async function studentsLoader({ params, request }) {
  const periodList = await getPeriodList();
  const periodId = params.periodId === "actual" ? periodList[0] : params.periodId;
  const url = new URL(request.url);
  const filters = {
    id: url.searchParams.get("id") || "",
    firstName: url.searchParams.get("firstName") || "",
    lastName: url.searchParams.get("lastName") || "",
    dateOfBirth: url.searchParams.get("dateOfBirth") || "",
    birthPlace: url.searchParams.get("birthPlace") || "",
    year: url.searchParams.get("year") || "",
    classId: url.searchParams.get("class") || "",
  };
  const data = await getStudents(periodId, filters);
  return { ...data, filters };
}

export default function Students() {
  const { rows, years, classesByYear, studentFieldLabels, filters } = useLoaderData();
  const [searchParams, setSearchParams] = useSearchParams();
  const classes = pickClasses(classesByYear, filters.year);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "year") next.delete("class");
    setSearchParams(next);
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <input className="rounded-lg border border-gray-300 px-3 py-2" placeholder={studentFieldLabels.id} value={filters.id} onChange={(e) => setFilter("id", e.target.value)} />
        <input className="rounded-lg border border-gray-300 px-3 py-2" placeholder={studentFieldLabels.firstName} value={filters.firstName} onChange={(e) => setFilter("firstName", e.target.value)} />
        <input className="rounded-lg border border-gray-300 px-3 py-2" placeholder={studentFieldLabels.lastName} value={filters.lastName} onChange={(e) => setFilter("lastName", e.target.value)} />
        <input className="rounded-lg border border-gray-300 px-3 py-2" placeholder={studentFieldLabels.dateOfBirth} value={filters.dateOfBirth} onChange={(e) => setFilter("dateOfBirth", e.target.value)} />
        <input className="rounded-lg border border-gray-300 px-3 py-2" placeholder={studentFieldLabels.birthPlace} value={filters.birthPlace} onChange={(e) => setFilter("birthPlace", e.target.value)} />
        <select className="rounded-lg border border-gray-300 px-3 py-2" value={filters.year} onChange={(e) => setFilter("year", e.target.value)}>
          <option value="">Todos los años</option>
          {years.map((year) => (
            <option key={year.id} value={year.id}>{year.name}</option>
          ))}
        </select>
        <select className="rounded-lg border border-gray-300 px-3 py-2" value={filters.classId} onChange={(e) => setFilter("class", e.target.value)}>
          <option value="">Todas las secciones</option>
          {classes.map((classId) => (
            <option key={classId} value={classId}>{classId}</option>
          ))}
        </select>
      </div>

      <TableContainer>
        <DataTable className="text-sm">
          <TableHead>
            <tr className="bg-gray-100">
              <HeadCell>{studentFieldLabels.id}</HeadCell>
              <HeadCell>{studentFieldLabels.firstName}</HeadCell>
              <HeadCell>{studentFieldLabels.lastName}</HeadCell>
              <HeadCell>{studentFieldLabels.dateOfBirth}</HeadCell>
              <HeadCell>{studentFieldLabels.birthPlace}</HeadCell>
              <HeadCell>Sección</HeadCell>
            </tr>
          </TableHead>
          <TableBody>
            {rows.map((student) => {
              const to = `estudiante/${student.id}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
              return (
                <tr key={student.id} className="border-t hover:bg-gray-50">
                  <BodyCell>
                    <Link className="block" to={to}>{student.id}</Link>
                  </BodyCell>
                  <BodyCell>
                    <Link className="block" to={to}>{student.firstName}</Link>
                  </BodyCell>
                  <BodyCell>
                    <Link className="block" to={to}>{student.lastName}</Link>
                  </BodyCell>
                  <BodyCell>
                    <Link className="block" to={to}>{student.dateOfBirth}</Link>
                  </BodyCell>
                  <BodyCell>
                    <Link className="block" to={to}>{student.birthPlace}</Link>
                  </BodyCell>
                  <BodyCell>
                    <Link className="block" to={to}>
                      {`${years.find((year) => year.id === student?._class?.year)?.name || ""} ${student?._class?.id || ""}`}
                    </Link>
                  </BodyCell>
                </tr>
              );
            })}
          </TableBody>
        </DataTable>
      </TableContainer>

      <Outlet />
    </div>
  );
}
