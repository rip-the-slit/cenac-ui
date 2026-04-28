import { Check, ChevronsUpDown, User } from "lucide-react";
import { useRef } from "react";

function UserOption({ name = "Usuario", type = "Personal" }) {
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
  const dialogRef = useRef(null);

  return (
    <div className="w-full">
      <button
        onClick={() => dialogRef.current.showModal()}
        className="p-5 flex w-full items-center justify-between
        rounded-lg cursor-pointer hover:bg-gray-50"
      >
        <UserOption
          name={users[userId]?.name || "Usuario"}
          type={users[userId]?.type || "Personal"}
        />
        <ChevronsUpDown className="w-5 h-5 text-gray-400" />
      </button>
      <dialog
        className="shadow-md backdrop:bg-transparent 
        bg-white border border-gray-200 rounded-lg p-2"
        ref={dialogRef}
        onClick={() => dialogRef.current.close()}
      >
        <ul className="space-y-2">
          {users.map((u, i) => (
            <li
              key={"user-" + u.name + i}
              onClick={() => setUserId(i)}
              className="flex items-center justify-between gap-1 cursor-pointer hover:bg-gray-100 rounded p-1"
              tabIndex={1}
            >
              <UserOption name={u.name} type={u.type} />
              {userId === i ? <Check className="w-4 h-4 text-gray-500" /> : null}
            </li>
          ))}
        </ul>
      </dialog>
    </div>
  );
}
