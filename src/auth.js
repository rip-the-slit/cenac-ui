import { getCache, request, saveCache } from "./db";

const getCookie = (name) => {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  const rawCookieString = match ? decodeURIComponent(match[2]) : null;

  if (rawCookieString === null) return rawCookieString;

  const cleanJsonString = rawCookieString.startsWith('j:') 
      ? rawCookieString.slice(2) 
      : rawCookieString;

  return cleanJsonString;
};

export async function getUsers() {
  return request("/users");
}

export function getActiveUser() {
  return JSON.parse(getCookie("activeUser"))
}

export async function login({ id, password }) {
  const res = await request("/users/login", {
    method: "POST",
    body: JSON.stringify({ id, password }),
  });
  return res;
}

export async function logout() {
  const res = await request("/users/logout", { method: "POST" });
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