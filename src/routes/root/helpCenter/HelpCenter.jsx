import { FileText, TableOfContents } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router";
import { Card, PageLayout } from "../../../components/Layout";
import generalPdf from "../../../assets/helpCenter/manual-general.pdf?url";
import installationPdf from "../../../assets/helpCenter/manual-instalacion-y-configuracion.pdf?url";
import troubleshootingPdf from "../../../assets/helpCenter/manual-solucion-de-problemas.pdf?url";

const manuals = [
  { path: "general", title: "Manual general", description: "Consulte cómo utilizar las funciones del sistema.", pdf: generalPdf },
  { path: "instalacion-y-configuracion", title: "Instalación y configuración", description: "Consulte cómo instalar y configurar el sistema.", pdf: installationPdf },
  { path: "solucion-de-problemas", title: "Solución de problemas", description: "Encuentre soluciones a problemas frecuentes.", pdf: troubleshootingPdf },
];

function ManualViewer({ title, pdf }) {
  return (
    <div className="space-y-3">
      <a href={pdf} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-700 underline">
        Abrir PDF en otra pestaña
      </a>
      <iframe title={title} src={pdf} className="block h-[70vh] w-full rounded-md border border-gray-200" />
    </div>
  );
}

export const manualRoutes = manuals.map(({ path, title, pdf }) => ({
  path,
  element: <ManualViewer title={title} pdf={pdf} />,
}));

export function HelpCenterIndex() {
  return (
    <div className="mx-auto max-w-[600px]">
      <p className="mb-4 text-gray-600">Seleccione un manual para consultarlo.</p>
      <ul className="space-y-3">
        {manuals.map(({ path, title, description }) => (
          <li key={path}>
            <Link to={path} className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4 shadow-sm transition-colors hover:bg-gray-50">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
                <p className="mt-1 text-gray-600">{description}</p>
              </div>
              <FileText aria-hidden="true" className="h-10 w-10 shrink-0 text-gray-500" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function HelpCenter() {
  return (
    <PageLayout title="Centro de Ayuda">
      <div>
        <nav role="tablist" aria-label="Manuales de ayuda" className="flex gap-2 overflow-x-auto">
          {[{ path: ".", title: "Índice" }, ...manuals].map(({ path, title }) => (
            <NavLink
              key={path}
              to={path}
              end
              role="tab"
              aria-label={path === "." ? title : undefined}
              className={({ isActive }) =>
                `shrink-0 flex items-center rounded-t-lg border border-b-0 px-5 py-2 text-sm font-semibold transition-colors ${
                  isActive ? "bg-white text-gray-900" : "bg-gray-100 text-gray-600 hover:bg-gray-50"
                }`
              }
            >
              {path === "." ? <TableOfContents aria-hidden="true" className="w-4" /> : title}
            </NavLink>
          ))}
        </nav>
        <Card className="rounded-tl-none">
          <Outlet />
        </Card>
      </div>
    </PageLayout>
  );
}
