import { Form, useRouteLoaderData } from "react-router";
import UserSelector from "./UserSelector";
import { useState } from "react";
import { LogIn } from "lucide-react";
import { login } from "../../auth";

export async function loginAction({ request }) {
  const formData = await request.formData();
  const userId = formData.get("username");
  const password = formData.get("password");
  return await login(userId);
}

export default function Login() {
  const data = useRouteLoaderData("auth");
  const [userId, setUserId] = useState(0);

  const users = data.users;

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100 font-sans">
      <div className="flex items-center flex-col max-w-[25rem] space-y-5 bg-white rounded-lg shadow-md p-5 border border-gray-200">
        <h1 className="font-bold text-xl text-center text-gray-800">
          Iniciar sesión como {users[userId].name}
        </h1>
        <div className="border rounded-lg w-full">
          <UserSelector users={users} userId={userId} setUserId={setUserId} />
        </div>
        <Form method="post" className="flex gap-2">
          <input type="text" name="username" value={users[userId].id} hidden />
          <input
            className="shrink p-3 shadow-sm rounded-lg border border-gray-200"
            type="password"
            name="password"
            required="true"
            placeholder="Ingrese su contraseña"
          />
          <button
            className="flex items-center gap-2 font-bold p-3 shadow-sm rounded-lg bg-gradient-to-b from-emerald-500 to-emerald-600 border border-emerald-500 text-white"
            type="submit"
          >
            Ingresar <LogIn className="w-5 h-5" />
          </button>
        </Form>
      </div>
    </div>
  );
}
