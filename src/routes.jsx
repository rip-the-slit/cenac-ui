import { redirect } from "react-router";
import { getUsers } from "./auth";
import App from "./routes/root/App";
import Login, { loginAction } from "./routes/login/Login";

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
    return redirect("/");
  }

  return data;
}

export default [
  {
    id: "auth",
    loader: AuthLoader,
    children: [
      {
        path: "/",
        element: <App/>,
      },
      {
        path: "ingresar",
        element: <Login/>,
        action: loginAction,
      }
    ]
  },
]