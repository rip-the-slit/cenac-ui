import { Check, ChevronsUpDown, User } from "lucide-react";
import { useState } from "react";

import FloatingOverlay from "../root/components/FloatingOverlay";
import SelectorBatches from "../root/components/SelectorBatches";

export function UserOption({ name = "Usuario", type = "Personal" }) {
  return (
    <div className="flex items-center space-x-3 text-left">
      <User className="w-12 h-12 bg-gray-200 rounded-full p-2 text-gray-500" />
      <div>
        <p className="text-md font-semibold text-gray-700">{name}</p>
        <p className="text-sm text-gray-600">{type}</p>
      </div>
    </div>
  );
}

export default function UserSelector({ users, userId, setUserId, footer }) {
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
        type="button"
        aria-expanded={isOpen}
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
          <SelectorBatches items={users} size={3}>
            {(visibleUsers) => (
              <ul className="space-y-2">
                {visibleUsers.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setUserId(u.id);
                        setIsOpen(false);
                      }}
                      className="flex w-full items-center justify-between gap-1 rounded p-3 hover:bg-gray-100"
                    >
                      <UserOption name={u.name} type={u.userLevel} />
                      {userId === u.id && <Check aria-hidden="true" className="w-5 h-5 text-gray-500" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SelectorBatches>
          {footer}
        </FloatingOverlay>
      )}
    </div>
  );
}
