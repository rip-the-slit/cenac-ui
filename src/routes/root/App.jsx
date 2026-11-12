import {
  LayoutDashboard,
  BookOpen,
  HelpCircle,
  Settings,
  MoreHorizontal,
  GraduationCap,
  FileText,
  UsersRound,
} from "lucide-react";
import UserSelector from "../login/UserSelector";
import {
  NavLink,
  Link,
  Outlet,
  redirect,
  useLoaderData,
  useNavigate,
  useNavigation,
  useRouteLoaderData,
} from "react-router";
import { getPeriodList, getPeriodStats } from "../../db";
import { PeriodSelector } from "./PeriodSelector";
import { logout } from "../../auth";
import Logo from "./components/Logo";

export async function appLoader({ params, request }) {
  const periodList = await getPeriodList();
  const periodId =
    params.periodId === "actual" ? periodList[0].id : params.periodId;
  const periodData = await getPeriodStats(periodId);

  const url = new URL(request.url);
  if (periodData.stats === null && !url.pathname.includes("cargar")) {
    return redirect(`/periodo/${periodId}/cargar`);
  } else if (periodData.stats && url.pathname.includes("cargar")) {
    return redirect(`/periodo/${periodId}`);
  }

  return { list: periodList, data: periodData, periodId: periodId, url };
}

const SidebarItem = ({ icon, label, path, end = true }) => {
  const Icon = icon;
  return (
    <NavLink
      to={path}
      end
      className={({ isActive }) =>
        `flex items-center w-full px-4 py-2 mt-1 text-sm rounded-lg transition-colors ${
          isActive
            ? "bg-gray-100 text-gray-900 font-medium"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`
      }
    >
      <Icon className="w-5 h-5 mr-3" />
      {label}
    </NavLink>
  );
};

const SidebarSection = ({ title, children }) => (
  <div className="mb-6">
    <div className="flex items-center justify-between px-4 mb-2">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {title}
      </h3>
      <MoreHorizontal className="w-4 h-4 text-gray-500 cursor-pointer" />
    </div>
    <div className="space-y-1">{children}</div>
  </div>
);

export default function App() {
  const authData = useRouteLoaderData("auth");
  const period = useLoaderData();
  const isAllDataLoaded = period.data.stats !== null;
  const users = authData.users;
  const rootUrl = `/periodo/${period.periodId}`;
  const navigate = useNavigate();
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const sections = [
    {
      title: "General",
      items: [
        {
          icon: LayoutDashboard,
          label: "Resumen",
          path: period.data.status === "active" ? "/periodo/actual" : rootUrl,
        },
        { icon: BookOpen, label: "Notas", path: `${rootUrl}/notas` },
        {
          icon: GraduationCap,
          label: "Estudiantes",
          path: `${rootUrl}/estudiantes`,
        },
        {
          icon: UsersRound,
          label: "Representantes",
          path: `${rootUrl}/representantes`,
        },
        {
          icon: FileText,
          label: "Reportes",
          path: `${rootUrl}/reportes`,
          end: false,
        },
      ],
    },
  ];

  return (
    <div className="flex h-screen bg-gray-200">
      <aside className="w-64 border-r border-gray-200 flex flex-col flex-shrink-0">
        <Logo />
        <div className="w-full h-[1px] bg-gray-300 px-5 bg-clip-content" />
        <UserSelector
          users={users}
          userId={authData?.activeUser.id}
          setUserId={async (userId) => {
            await logout();
            navigate(`/ingresar?usuario=${encodeURIComponent(userId)}`);
          }}
          footer={
            <div className="flex justify-end text-sm text-emerald-600 p-2 [&>a]:underline [&>a]: [&>a]:decoration-wavy">
              <Link to="/ingresar" onClick={() => logout()}>
                Cerrar sesión
              </Link>
            </div>
          }
        />
        <div
          className={
            "flex-1 overflow-y-auto py-6 px-3" +
            (!isAllDataLoaded ? " pointer-events-none opacity-50" : "")
          }
        >
          {sections.map((s) => (
            <SidebarSection key={s.title} title={s.title}>
              {s.items.map((i) => (
                <SidebarItem key={i.path} {...i} />
              ))}
            </SidebarSection>
          ))}
        </div>

        <div className="w-full h-[1px] bg-gray-300 px-5 bg-clip-content" />

        <div className="p-4">
          <button className="flex items-center w-full px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors">
            <HelpCircle className="w-5 h-5 mr-3 text-gray-600" />
            Centro de Ayuda
          </button>
          <NavLink
            to={`${rootUrl}/configuracion`}
            className={({ isActive }) =>
              `flex items-center w-full px-4 py-2 text-sm rounded-lg transition-colors ${
                isActive
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`
            }
          >
            <Settings className="w-5 h-5 mr-3 text-gray-600" />
            Configuración
          </NavLink>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <main className="flex-1 flex flex-col overflow-hidden relative isolate bg-gray-50 rounded-ss-3xl shadow-xl">
        <div className="rays" aria-hidden="true" />
        {/* Top Header */}
        <header className="h-16 absolute bg-transparent top-0 right-0 z-20 flex items-center justify-end px-8 shrink-0">
          {/* Right Actions */}
          <div className="flex items-center space-x-4">
            <PeriodSelector list={period.list} currentId={period.periodId} />
          </div>
        </header>

        {/* Dashboard Content Area */}
        <div className="relative z-10 flex-1 overflow-auto p-8">
          <Outlet />
        </div>
        {isNavigating && (
          <div
            role="status"
            aria-label="Cargando página"
            className="absolute inset-0 z-50 flex items-center justify-center bg-gray-200/60"
          >
            <div className="loading-logo h-40 w-40" aria-hidden="true" />
          </div>
        )}
      </main>
    </div>
  );
}
