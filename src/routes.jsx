import { redirect } from "react-router";
import { Outlet } from "react-router";
import { getUsers } from "./auth";
import ErrorBoundary from "./routes/ErrorBoundary";
import App, { appLoader } from "./routes/root/App";
import Login, { loginAction } from "./routes/login/Login";
import DataLoader, { dataAction, dataLoader } from "./routes/root/load/DataLoader";
import SubjectLoader, {
  subjectAction,
  subjectLoader,
} from "./routes/root/load/SubjectLoader";
import ClassLoader, {
  classAction,
  classLoader,
} from "./routes/root/load/ClassLoader";
import { ErrorDialogProvider } from "./context/ErrorDialogContext";
import PeriodOverview, { periodOverviewLoader } from "./routes/root/PeriodOverview";
import Grades, { gradesAction, gradesLoader } from "./routes/root/grades/Grades";
import Students, { studentsLoader } from "./routes/root/students/Students";
import StudentDetail, {
  studentDetailAction,
  studentDetailLoader,
} from "./routes/root/students/StudentDetail";

async function AuthLoader({ request }) {
  const data = await getUsers();
  const user = data.activeUser;

  const url = new URL(request.url);
  const isTryingToAccessLogin = url.pathname.startsWith("/ingresar");
  const isTryingToAccessApp = !isTryingToAccessLogin;
  const isTryingToAccessRoot = url.pathname === "/";

  if (!user && isTryingToAccessApp) {
    return redirect("/ingresar");
  }

  if (user && (isTryingToAccessLogin || isTryingToAccessRoot)) {
    return redirect("/periodo/actual");
  }

  return data;
}

export default [
  {
    id: "auth",
    path: "/",
    loader: AuthLoader,
    element: (
      <ErrorDialogProvider>
        <Outlet />
      </ErrorDialogProvider>
    ),
    errorElement: <ErrorBoundary />,
    children: [
      {
        path: "ingresar",
        element: <Login />,
        action: loginAction,
      },
      {
        id: "period",
        path: "periodo/:periodId",
        element: <App />,
        loader: appLoader,
        children: [
          {
            index: true,
            element: <PeriodOverview />,
            loader: periodOverviewLoader,
          },
          {
            path: "notas",
            element: <Grades />,
            loader: gradesLoader,
            action: gradesAction,
          },
          {
            path: "estudiantes",
            element: <Students />,
            loader: studentsLoader,
            children: [
              {
                path: "estudiante/:studentId",
                element: <StudentDetail />,
                loader: studentDetailLoader,
                action: studentDetailAction,
              },
            ],
          },
          {
            path: "cargar",
            children: [
              {
                index: true,
                element: <DataLoader />,
                loader: dataLoader,
                action: dataAction,
              },
              {
                path: "materias",
                element: <SubjectLoader />,
                loader: subjectLoader,
                action: subjectAction,
              },
              {
                path: "secciones",
                element: <ClassLoader />,
                loader: classLoader,
                action: classAction,
              },
            ],
          },
        ],
      },
    ],
  },
];
