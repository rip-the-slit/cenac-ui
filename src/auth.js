import { getCache, request, saveCache } from "./db";

let activeUser = getCache("activeUser");

export async function getUsers() {
  return request("/users");
}

export function getActiveUser() {
  return activeUser ? { ...activeUser } : null;
}

export async function login({ id, password }) {
  const res = await request("/users/login", {
    method: "POST",
    body: JSON.stringify({ id, password }),
  });

  activeUser = res || activeUser;
  saveCache("activeUser", activeUser);
  return res;
}

export async function logout() {
  const res = await request("/users/logout", { method: "POST" });

  if (res) {
    activeUser = null;
    saveCache("activeUser", null);
  }

  return res;
}

export async function register({name, password, userLevel}) {
  const res = await request("/users/register", {
    method: "POST",
    body: JSON.stringify({name, password, userLevel}),
  });

  return res
}

export async function editUser({id, name, password, userLevel}) {
  const res = await request(`/users/${id}/edit`, {
    method: "POST",
    body: JSON.stringify({name, password, userLevel}),
  });

  return res
}

export async function deleteUser(id) {
  const res = await request(`/users/${id}/delete`, {
    method: "POST",
  });

  return res
}