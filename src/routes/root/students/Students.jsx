import {
  Link,
  Outlet,
  useFetcher,
  useLoaderData,
  useParams,
} from "react-router";
import { getPeriodList, getStudents } from "../../../db";
import {
  BodyCell,
  DataTable,
  HeadCell,
  TableBody,
  TableContainer,
  TableHead,
} from "../load/TablePrimitives";
import { RefreshCw } from "lucide-react";

function pickClasses(classesByYear, year) {
  if (year) return classesByYear?.[Number(year)] || [];
  const all = new Set();
  Object.values(classesByYear || {}).forEach((list) =>
    (list || []).forEach((classId) => all.add(classId))
  );
  return [...all].sort();
}

export async function studentsLoader({ params, request }) {
  const periodList = await getPeriodList();
  const periodId =
    params.periodId === "actual" ? periodList[0] : params.periodId;
  const url = new URL(request.url);
  const filters = {
    id: url.searchParams.get("id") || "",
    firstName: url.searchParams.get("firstName") || "",
    lastName: url.searchParams.get("lastName") || "",
    birthDate: url.searchParams.get("birthDate") || "",
    birthPlace: url.searchParams.get("birthPlace") || "",
    year: url.searchParams.get("year") || "",
    classId: url.searchParams.get("class") || "",
  };
  const data = await getStudents(periodId, filters);
  return { ...data, filters };
}

export default function Students() {
  const loaderData = useLoaderData();
  const fetcher = useFetcher();
  const params = useParams();

  const activeData = fetcher.data ?? loaderData;
  const { rows, years, classesByYear, studentFieldLabels, filters } =
    activeData;
  const isSearching = fetcher.state !== "idle";

  const getFilterValue = (name, fallback = "") => {
    const pending = fetcher.formData?.get(name);
    if (pending != null) return String(pending);
    return fallback;
  };

  const viewFilters = {
    id: getFilterValue("id", filters.id),
    firstName: getFilterValue("firstName", filters.firstName),
    lastName: getFilterValue("lastName", filters.lastName),
    birthDate: getFilterValue("birthDate", filters.birthDate),
    birthPlace: getFilterValue("birthPlace", filters.birthPlace),
    year: getFilterValue("year", filters.year),
    classId: getFilterValue("class", filters.classId),
  };

  const classes = pickClasses(classesByYear, viewFilters.year);

  if (params.studentId) return <Outlet />;

  return (
    <div className="space-y-5 mt-8">
      <fetcher.Form
        className="grid gap-3 md:grid-cols-4"
        method="get"
        onChange={(event) => {
          const formData = new FormData(event.currentTarget);
          const year = String(formData.get("year") || "");
          if (!year) formData.delete("class");
          fetcher.submit(formData, { method: "get" });
        }}
      >
        <input
          name="id"
          className="rounded-lg border border-gray-300 px-3 py-2"
          placeholder={studentFieldLabels.id}
          value={viewFilters.id}
          onChange={() => {}}
        />
        <input
          name="firstName"
          className="rounded-lg border border-gray-300 px-3 py-2"
          placeholder={studentFieldLabels.firstName}
          value={viewFilters.firstName}
          onChange={() => {}}
        />
        <input
          name="lastName"
          className="rounded-lg border border-gray-300 px-3 py-2"
          placeholder={studentFieldLabels.lastName}
          value={viewFilters.lastName}
          onChange={() => {}}
        />
        <input
          name="birthDate"
          className="rounded-lg border border-gray-300 px-3 py-2"
          placeholder={studentFieldLabels.birthDate}
          value={viewFilters.birthDate}
          onChange={() => {}}
        />
        <input
          name="birthPlace"
          className="rounded-lg border border-gray-300 px-3 py-2"
          placeholder={studentFieldLabels.birthPlace}
          value={viewFilters.birthPlace}
          onChange={() => {}}
        />
        <select
          name="year"
          className="rounded-lg border border-gray-300 px-3 py-2"
          value={viewFilters.year}
          onChange={() => {}}
        >
          <option value="">Todos los años</option>
          {years.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name}
            </option>
          ))}
        </select>
        <select
          name="class"
          className="rounded-lg border border-gray-300 px-3 py-2"
          value={viewFilters.classId}
          onChange={() => {}}
        >
          <option value="">Todas las secciones</option>
          {classes.map((classId) => (
            <option key={classId} value={classId}>
              {classId}
            </option>
          ))}
        </select>
      </fetcher.Form>

      <div className="relative">
        {isSearching && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
            <RefreshCw className="h-5 w-5 animate-spin text-gray-500" />
          </div>
        )}
        <TableContainer className={isSearching ? "opacity-60" : ""}>
          <DataTable className="text-sm">
            <TableHead>
              <tr className="bg-gray-100">
                <HeadCell>{studentFieldLabels.id}</HeadCell>
                <HeadCell>{studentFieldLabels.firstName}</HeadCell>
                <HeadCell>{studentFieldLabels.lastName}</HeadCell>
                <HeadCell>{studentFieldLabels.birthDate}</HeadCell>
                <HeadCell>{studentFieldLabels.birthPlace}</HeadCell>
                <HeadCell>Sección</HeadCell>
              </tr>
            </TableHead>
            <TableBody>
              {rows.map((student) => {
                const to = `${student.id}`;
                return (
                  <tr key={student.id} className="border-t hover:bg-gray-50">
                    <BodyCell>
                      <Link className="block" to={to}>
                        {student.id}
                      </Link>
                    </BodyCell>
                    <BodyCell>
                      <Link className="block" to={to}>
                        {student.firstName}
                      </Link>
                    </BodyCell>
                    <BodyCell>
                      <Link className="block" to={to}>
                        {student.lastName}
                      </Link>
                    </BodyCell>
                    <BodyCell>
                      <Link className="block" to={to}>
                        {student.birthDate}
                      </Link>
                    </BodyCell>
                    <BodyCell>
                      <Link className="block" to={to}>
                        {student.birthPlace}
                      </Link>
                    </BodyCell>
                    <BodyCell>
                      <Link className="block" to={to}>
                        {`${
                          years.find(
                            (year) => year.id === student?._class?.year
                          )?.name || ""
                        } ${student?._class?.id || ""}`}
                      </Link>
                    </BodyCell>
                  </tr>
                );
              })}
            </TableBody>
          </DataTable>
        </TableContainer>
      </div>
    </div>
  );
}
