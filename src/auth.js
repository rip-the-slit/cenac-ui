import { request } from "./db";

export async function getUsers() {
  return request("/users");
}

export async function login(userId) {
  return request("/users/login", {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export async function logout() {
  return request("/users/logout", { method: "POST" });
}
