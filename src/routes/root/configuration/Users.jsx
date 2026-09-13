import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Pencil, Plus, Save, Trash2 } from "lucide-react";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";

import {
  deleteUser,
  editUser,
  getActiveUser,
  getUsers,
  register,
} from "../../../auth";
import { useErrorDialog } from "../../../context/ErrorDialogContext";
import { UserOption } from "../../login/UserSelector";

const userLevels = ["Administrador", "Coordinador", "Profesor"];

function normalizeUser(user) {
  return {
    ...user,
    userLevel: user.userLevel ?? user.userlevel ?? user.type ?? "",
    clientKey: `user-${user.id}`,
    password: "",
    isNew: false,
  };
}

function serializeChanges(draftUsers, baselineUsers, deletedIds) {
  const baselineById = new Map(
    baselineUsers.map((user) => [String(user.id), user])
  );

  const created = draftUsers
    .filter((user) => user.isNew)
    .map(({ name, password, userLevel }) => ({
      name: name.trim(),
      password,
      userLevel,
    }));

  const updated = draftUsers
    .filter((user) => {
      if (user.isNew) return false;
      const original = baselineById.get(String(user.id));
      return (
        !original ||
        user.name.trim() !== original.name ||
        user.userLevel !== original.userLevel ||
        Boolean(user.password)
      );
    })
    .map((user) => {
      const update = {
        id: user.id,
        name: user.name.trim(),
        userLevel: user.userLevel,
      };
      if (user.password) update.password = user.password;
      return update;
    });

  return { created, updated, deleted: deletedIds };
}

export async function usersLoader() {
  const users = await getUsers();
  const activeUser = getActiveUser();
  const userLevel = activeUser?.userLevel ?? activeUser?.userlevel;

  if (userLevel !== "Administrador") {
    throw new Error("No tiene permisos para administrar usuarios.");
  }
  return { users };
}

export async function usersAction({ request }) {
  try {
    const formData = await request.formData();
    const changes = JSON.parse(formData.get("changes") ?? "{}");
    const created = Array.isArray(changes.created) ? changes.created : [];
    const updated = Array.isArray(changes.updated) ? changes.updated : [];
    const deleted = Array.isArray(changes.deleted) ? changes.deleted : [];

    await Promise.all(deleted.map((id) => deleteUser(id)));
    await Promise.all(updated.map((user) => editUser(user)));
    await Promise.all(created.map((user) => register(user)));

    return { users: await getUsers() };
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}

function UserForm({ editor, onCancel, onConfirm }) {
  const [user, setUser] = useState(editor.user);
  const isNew = editor.mode === "add";

  function update(field, value) {
    setUser((current) => ({ ...current, [field]: value }));
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onConfirm(user);
      }}
    >
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Volver a la lista de usuarios"
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
        >
          <ArrowLeft aria-hidden="true" className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-semibold text-gray-800">
          {isNew ? "Agregar usuario" : "Editar usuario"}
        </h2>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
          Nombre
          <input
            name="name"
            value={user.name}
            placeholder="Nombre del usuario"
            onChange={(event) => update("name", event.target.value)}
            required
            minLength={4}
            maxLength={20}
            className="rounded-lg border border-gray-300 px-3 py-2 font-normal"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
          Nivel de usuario
          <select
            name="userLevel"
            value={user.userLevel}
            onChange={(event) => update("userLevel", event.target.value)}
            required
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 font-normal h-full"
          >
            {userLevels.map((userLevel) => (
              <option key={userLevel} value={userLevel}>
                {userLevel}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-gray-700 sm:col-span-2">
          Contraseña
          <input
            name="password"
            type="password"
            value={user.password}
            onChange={(event) => update("password", event.target.value)}
            required={isNew}
            minLength={4}
            maxLength={64}
            placeholder={
              isNew
                ? "Ingrese una contraseña"
                : "Dejar en blanco para conservarla"
            }
            className="rounded-lg border border-gray-300 px-3 py-2 font-normal"
          />
        </label>
      </div>

      <button
        type="submit"
        className="mt-6 flex items-center gap-2 rounded-lg border border-emerald-500 bg-gradient-to-b from-emerald-500 to-emerald-600 px-4 py-2 font-semibold text-white shadow-sm"
      >
        Aceptar
        <Check aria-hidden="true" className="h-5 w-5" />
      </button>
    </form>
  );
}

export default function Users() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const { emitError } = useErrorDialog();
  const initialUsers = loaderData.users.map(normalizeUser);
  const [baselineUsers, setBaselineUsers] = useState(initialUsers);
  const [draftUsers, setDraftUsers] = useState(initialUsers);
  const [deletedIds, setDeletedIds] = useState([]);
  const [editor, setEditor] = useState(null);
  const nextKey = useRef(0);

  useEffect(() => {
    if (actionData instanceof Error) {
      emitError(actionData.message);
      setDraftUsers(initialUsers);
      return;
    }

    if (actionData?.users) {
      const refreshedUsers = actionData.users.map(normalizeUser);
      setBaselineUsers(refreshedUsers);
      setDraftUsers(refreshedUsers);
      setDeletedIds([]);
    }
  }, [actionData, emitError]);

  const changes = serializeChanges(draftUsers, baselineUsers, deletedIds);
  const hasChanges =
    changes.created.length > 0 ||
    changes.updated.length > 0 ||
    changes.deleted.length > 0;
  const isSubmitting = navigation.state === "submitting";

  if (editor) {
    return (
      <UserForm
        editor={editor}
        onCancel={() => setEditor(null)}
        onConfirm={(user) => {
          if (editor.mode === "add") {
            setDraftUsers((current) => [...current, user]);
          } else {
            setDraftUsers((current) =>
              current.map((candidate) =>
                candidate.clientKey === user.clientKey ? user : candidate
              )
            );
          }
          setEditor(null);
        }}
      />
    );
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-gray-800">Usuarios</h2>
        <button
          type="button"
          onClick={() => {
            const clientKey = `new-user-${nextKey.current}`;
            nextKey.current += 1;
            setEditor({
              mode: "add",
              user: {
                clientKey,
                name: "",
                password: "",
                userLevel: "Docente",
                isNew: true,
              },
            });
          }}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Agregar usuario
        </button>
      </div>

      <ul className="divide-y divide-gray-100">
        {draftUsers.map((user) => (
          <li
            key={user.clientKey}
            className="flex items-center justify-between gap-4 py-3"
          >
            <UserOption name={user.name} type={user.userLevel} />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setEditor({ mode: "edit", user: { ...user } })}
                aria-label={`Editar usuario ${user.name}`}
                className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
              >
                <Pencil aria-hidden="true" className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftUsers((current) =>
                    current.filter(
                      (candidate) => candidate.clientKey !== user.clientKey
                    )
                  );
                  if (!user.isNew) {
                    setDeletedIds((current) =>
                      current.includes(user.id)
                        ? current
                        : [...current, user.id]
                    );
                  }
                }}
                aria-label={`Eliminar usuario ${user.name}`}
                className="rounded-md p-2 text-red-500 hover:bg-red-50"
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <Form method="post" className="mt-6">
        <input
          type="hidden"
          name="changes"
          value={JSON.stringify(changes)}
          readOnly
        />
        <button
          type="submit"
          disabled={!hasChanges || isSubmitting}
          className={`flex items-center gap-2 rounded-lg border px-4 py-2 font-semibold text-white shadow-sm ${
            hasChanges && !isSubmitting
              ? "border-emerald-500 bg-gradient-to-b from-emerald-500 to-emerald-600"
              : "cursor-not-allowed border-gray-300 bg-gray-300"
          }`}
        >
          <Save aria-hidden="true" className="h-5 w-5" />
          {isSubmitting ? "Guardando..." : "Guardar"}
        </button>
      </Form>
    </>
  );
}
