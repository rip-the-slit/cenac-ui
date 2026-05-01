import { Outlet, redirect } from "react-router";
import { getUsers } from "./auth";
import App, { appLoader } from "./routes/root/App";
import Login, { loginAction } from "./routes/login/Login";
import DataLoader from "./routes/root/load/DataLoader";

async function AuthLoader({ request }) {
  const data = await getUsers();
  const user = data.activeUser;

  const url = new URL(request.url);
  const isTryingToAccessLogin = url.pathname.startsWith("/ingresar");
  const isTryingToAccessApp = !isTryingToAccessLogin;

  if (!user && isTryingToAccessApp) {
    return redirect("/ingresar");
  }

  if (user && isTryingToAccessLogin) {
    return redirect("/periodo/actual");
  }

  return data;
}

export default [
  {
    id: "auth",
    loader: AuthLoader,
    children: [
      {
        path: "periodo/:periodId",
        element: <App />,
        loader: appLoader,
        children: [
          {
            path: "cargar",
            children: [{ index: true, element: <DataLoader /> }],
          },
        ],
      },
      {
        path: "ingresar",
        element: <Login />,
        action: loginAction,
      },
    ],
  },
];
