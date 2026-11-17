import { useEffect, useRef, useState } from "react";
import { Check, Circle, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import {
  Form,
  redirect,
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
import { CardHeader, FormField } from "../../../components/Layout";
import FieldInput from "../../../components/FieldInput";
import PhoneInput from "../load/class/PhoneInput";
import {
  DeleteButton,
  EditButton,
  PrimaryButton,
} from "../../../components/Button";

const userLevels = ["Administrador", "Coordinador", "Profesor"];

function normalizeUser(user) {
  return {
    ...user,
    phone: String(user.phone ?? ""),
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
    .map(({ name, password, userLevel, phone }) => ({
      name: name.trim(),
      password,
      userLevel,
      phone: phone.trim(),
    }));

  const updated = draftUsers
    .filter((user) => {
      if (user.isNew) return false;
      const original = baselineById.get(String(user.id));
      return (
        !original ||
        user.name.trim() !== original.name ||
        user.userLevel !== original.userLevel ||
        user.phone !== original.phone ||
        Boolean(user.password)
      );
    })
    .map((user) => {
      const update = {
        id: user.id,
        name: user.name.trim(),
        userLevel: user.userLevel,
        phone: user.phone.trim(),
      };
      if (user.password) update.password = user.password;
      return update;
    });

  return { created, updated, deleted: deletedIds };
}

export async function usersLoader({ params }) {
  const users = await getUsers();
  const activeUser = getActiveUser();
  const userLevel = activeUser?.userLevel ?? activeUser?.userlevel;

  if (userLevel !== "Administrador") {
    redirect(`/periodo/${encodeURIComponent(params.periodId)}/configuracion`);
  }

  return { users, activeUser };
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

const passwordRequirements = [
  { label: "Mayúsculas", pattern: /[A-Z]/ },
  { label: "Minúsculas", pattern: /[a-z]/ },
  { label: "Números", pattern: /\d/ },
  { label: "Símbolos", pattern: /[._+\-*()\[\]¡!¿?#$%&="']/ },
];

function UserForm({ editor, disableUserLevelSelect, onCancel, onConfirm }) {
  const [user, setUser] = useState(editor.user);
  const isNew = editor.mode === "add";

  function update(field, value) {
    if (
      field === "password" &&
      passwordRequirements.every((r) => !value.match(r.pattern)) &&
      value.length > 0
    )
      return;
    setUser((current) => ({ ...current, [field]: value }));
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!event.currentTarget.checkValidity()) {
          event.currentTarget.querySelector(":invalid")?.focus();
          return;
        }
        onConfirm({ ...user, phone: user.phone.length > 4 ? user.phone : "" });
      }}
    >
      <CardHeader
        title={isNew ? "Agregar usuario" : "Editar usuario"}
        onBack={onCancel}
        backLabel="Volver a la lista de usuarios"
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Nombre">
          <FieldInput
            name="name"
            aria-label="Nombre"
            value={user.name}
            placeholder="Nombre del usuario"
            onChange={(event) => update("name", event.target.value)}
            required
            minLength={4}
            maxLength={20}
          />
        </FormField>

        <FormField label="Nivel de usuario">
          <FieldInput
            definition={{ type: "select", options: userLevels.map((value) => ({ value, label: value })) }}
            name="userLevel"
            aria-label="Nivel de usuario"
            value={user.userLevel}
            disabled={disableUserLevelSelect}
            onChange={(event) => update("userLevel", event.target.value)}
            required
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 font-normal h-full"
          />
        </FormField>

        <FormField label="Teléfono" className="sm:col-span-2">
          <PhoneInput
            definition={{ label: "Teléfono" }}
            value={user.phone}
            onChange={(value) => update("phone", value)}
            validationMessages={{ patternMismatch: "Número de suscriptor debe contener siete dígitos y no empezar en 0." }}
          />
        </FormField>

        <FormField label="Contraseña" className="sm:col-span-2">
          <FieldInput
            definition={{
              type: "password",
              pattern: "(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*(?:[._¡!¿?#$%&=\"']|\\+|-|\\*|\\(|\\)|\\[|\\])).{4,64}",
              validationMessages: { patternMismatch: "La contraseña debe contener de 4 a 64 caracteres y los caracteres especificados." },
            }}
            name="password"
            aria-label="Contraseña"
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
          />
        </FormField>
        {user.password.length ? (
          <div>
            <p className="text-sm text-gray-500 font-semibold mb-2">La contraseña debe contener:</p>
            <ul className="text-md">
              {passwordRequirements.map((r) => {
                const match = user.password.match(r.pattern)
                return (
                  <li key={r.label + "-requirement"} className={"flex items-center justify-start gap-2 " + (match ? "text-emerald-600" : "text-gray-600")}>
                    {match ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-3" />}
                    <span className="font-bold" aria-checked={Boolean(match)}>{r.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          ""
        )}
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

  const startAddingUser = () => {
    const clientKey = `new-user-${nextKey.current}`;
    nextKey.current += 1;
    setEditor({
      mode: "add",
      user: {
        clientKey,
        name: "",
        password: "",
        phone: "",
        userLevel: "Profesor",
        isNew: true,
      },
    });
  };

  if (editor) {
    return (
      <UserForm
        editor={editor}
        disableUserLevelSelect={editor?.user?.id === loaderData.activeUser.id}
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
      <CardHeader
        title="Usuarios"
        description="Modifique la lista de usuarios y guarde para aplicar los cambios."
        actions={
          <button
            type="button"
            onClick={startAddingUser}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Agregar usuario
          </button>
        }
      />

      <ul className="divide-y divide-gray-100">
        {draftUsers.map((user) => (
          <li
            key={user.clientKey}
            className="flex items-center justify-between gap-4 py-3"
          >
            <UserOption
              name={<span className="flex flex-wrap items-baseline gap-x-3"><span>{user.name}</span>{user.phone && <span className="text-sm font-normal text-gray-500">{user.phone}</span>}</span>}
              type={user.userLevel}
            />
            <div className="flex items-center gap-1">
              <EditButton
                onClick={() => setEditor({ mode: "edit", user: { ...user } })}
                aria-label={`Editar usuario ${user.name}`}
              />
              <DeleteButton
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
                disabled={user.id === loaderData.activeUser.id}
                aria-label={`Eliminar usuario ${user.name}`}
              />
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
        <PrimaryButton type="submit" disabled={!hasChanges || isSubmitting}>
          <Save aria-hidden="true" className="h-5 w-5" />
          {isSubmitting ? "Guardando..." : "Guardar"}
        </PrimaryButton>
      </Form>
    </>
  );
}
