import { Check, ChevronsUpDown, User } from "lucide-react";
import { useState } from "react";

import FloatingOverlay from "../root/components/FloatingOverlay";

export function UserOption({ name = "Usuario", type = "Personal" }) {
  return (
    <div className="flex items-center space-x-3 text-left">
      <User className="w-12 h-12 bg-gray-100 rounded-full p-2 text-gray-400" />
      <div>
        <p className="text-md font-semibold text-gray-700">{name}</p>
        <p className="text-sm text-gray-500">{type}</p>
      </div>
    </div>
  );
}

export default function UserSelector({ users, userId, setUserId }) {
  const [isOpen, setIsOpen] = useState(false);

  const user = users.find((u) => u.id === userId) ?? users[0];

  return (
    <div className="w-full relative">
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-5 flex w-full items-center justify-between
        rounded-lg cursor-pointer hover:bg-gray-50"
      >
        <UserOption
          name={user?.name}
          type={user?.userLevel}
        />
        <ChevronsUpDown className="w-5 h-5 text-gray-400" />
      </button>
      {isOpen && (
        <FloatingOverlay className="-top-1 w-full p-2">
          <ul className="space-y-2">
            {users.map((u) => (
              <li
                key={"user-" + u.name + u.id}
                onClick={() => {
                  setUserId(u.id);
                  setIsOpen(false);
                }}
                className="flex items-center justify-between gap-1 cursor-pointer hover:bg-gray-100 rounded p-3"
                tabIndex={1}
              >
                <UserOption name={u.name} type={u.userLevel} />
                {userId === u.id ? (
                  <Check className="w-5 h-5 text-gray-500" />
                ) : null}
              </li>
            ))}
          </ul>
        </FloatingOverlay>
      )}
    </div>
  );
}
