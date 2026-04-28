const data =  {
    users: [
      { id: "12339", name: "Valeria", type: "Coordinador" },
      { id: "29382", name: "Maite", type: "Coordinador" },
    ],
    activeUser: null,
  }

export async function getUsers() {
    return data;
}

export async function login(userId) {
    data.activeUser = userId;
}

export async function logout() {
    data.activeUser = null;
}