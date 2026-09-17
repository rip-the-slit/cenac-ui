import { Form, useActionData, useRouteLoaderData, useSearchParams } from "react-router";
import UserSelector from "./UserSelector";
import { useEffect, useState } from "react";
import { LogIn } from "lucide-react";
import { login } from "../../auth";
import { useErrorDialog } from "../../context/ErrorDialogContext";
import { Card } from "../../components/Layout";

export async function loginAction({ request }) {
  const formData = await request.formData();
  const userId = formData.get("username");
  const password = formData.get("password");

  try {
    return await login({ id: userId, password });
  } catch (error) {
    return error
  }
}

export default function Login() {
  const data = useRouteLoaderData("auth");
  const users = data.users;
  const [searchParams] = useSearchParams();
  const requestedUserId = searchParams.get("usuario");
  const defaultUserId =
    users.find((user) => String(user.id) === requestedUserId)?.id ?? users[0]?.id;
  const [userId, setUserId] = useState(defaultUserId);
  const user = users.find((u) => u.id === userId);
  const actionData = useActionData()
  const {emitError} = useErrorDialog()

  useEffect(() => {
    if (actionData instanceof Error) {
      emitError(actionData.message)}
  }, [actionData])

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <Card as="div" className="flex max-w-[25rem] flex-col items-center space-y-5 p-5">
        <h1 className="font-bold text-xl text-center text-gray-800">
          Ingresar como {user?.name}
        </h1>
        <div className="border rounded-lg w-full">
          <UserSelector users={users} userId={userId} setUserId={setUserId} />
        </div>
        <Form method="post" className="flex gap-2">
          <input type="text" name="username" value={userId ?? ""} hidden readOnly />
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
      </Card>
    </div>
  );
}
