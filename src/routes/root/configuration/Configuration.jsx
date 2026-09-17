import { Link, NavLink, Outlet } from "react-router";
import RouteAccess from "../components/RouteAccess";
import { TableOfContents, Users } from "lucide-react";
import { Card, PageLayout } from "../../../components/Layout";

const tabsData = [
  {
    content: "Usuarios",
    to: "usuarios",
    allowedUserLevels: ["Administrador"],
    desc: "Agregue, edite o elimine las cuentas con acceso al sistema.",
    icon: <Users className="w-10 h-full text-gray-500" />,
  },
];

function Tab({ content, to, allowedUserLevels }) {
  return (
    <RouteAccess userLevels={allowedUserLevels}>
      <NavLink
        to={to}
        role="tab"
        end
        className={({ isActive }) =>
          `shrink-0 flex items-center rounded-t-lg border border-b-0 px-5 py-2 text-sm font-semibold transition-colors ${
            isActive
              ? "bg-white text-gray-900"
              : "bg-gray-100 text-gray-600 hover:bg-gray-50"
          }`
        }
      >
        {content}
      </NavLink>
    </RouteAccess>
  );
}

export function ConfigurationIndex() {
  return (
    <>
      <p className="mb-4 text-gray-600">
        Seleccione una sección de la configuración del sistema.
      </p>
      <ul className="space-y-3">
        {tabsData.map(({ content, to, allowedUserLevels, desc, icon }, i) => (
          <RouteAccess userLevels={allowedUserLevels}>
            <li key={to + i}>
              <Link
                to={to}
                className="flex justify-between items-center rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50 shadow-sm"
              >
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">{content}</h2>
                  <p className="mt-1 text-md text-gray-600">{desc}</p>
                </div>
                {icon}
              </Link>
            </li>
          </RouteAccess>
        ))}
      </ul>
    </>
  );
}

export default function Configuration() {
  return (
    <PageLayout title="Configuración">
      <div>
        <nav
          role="tablist"
          aria-label="Secciones de configuración"
          className="flex gap-2 overflow-x-auto"
        >
          <Tab
            content={<TableOfContents className="w-4 text-gray-700" />}
            to=""
            allowedUserLevels={["Profesor", "Coordinador", "Administrador"]}
          />
          {tabsData.map((tab, i) => (
            <Tab key={i} {...tab} />
          ))}
        </nav>
        <Card className="rounded-tl-none">
          <Outlet />
        </Card>
      </div>
    </PageLayout>
  );
}
