import { createContext, useContext, useState } from "react";
import { X } from "lucide-react";

const ErrorDialogContext = createContext(null);

export function useErrorDialog() {
  const context = useContext(ErrorDialogContext);
  if (!context) {
    throw new Error("useErrorDialog must be used inside ErrorDialogProvider");
  }
  return context;
}

function ErrorDialog({ message, onClose }) {
  if (!message) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <h2 className="text-base font-semibold text-gray-900">Error</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-gray-100"
            aria-label="Cerrar error"
          >
            <X className="h-4 w-4 text-gray-600" />
          </button>
        </div>
        <div className="p-4 text-sm text-gray-700">{message}</div>
        <div className="flex justify-end p-4 pt-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export function ErrorDialogProvider({ children }) {
  const [errorMessage, setErrorMessage] = useState(null);

  return (
    <ErrorDialogContext.Provider value={{ emitError: setErrorMessage }}>
      {children}
      <ErrorDialog message={errorMessage} onClose={() => setErrorMessage(null)} />
    </ErrorDialogContext.Provider>
  );
}
