import {
  createContext,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useFetcher } from "react-router";
import { RefreshCw } from "lucide-react";

import FloatingOverlay from "../components/FloatingOverlay";

const MAX_SUGGESTIONS = 5;
const MIN_OVERLAY_WIDTH = 256;
const StudentSuggestionsContext = createContext(null);

function getPosition(anchor) {
  const rect = anchor.getBoundingClientRect();
  const width = Math.max(rect.width, MIN_OVERLAY_WIDTH);
  const maxLeft = Math.max(8, window.innerWidth - width - 8);

  return {
    left: Math.min(Math.max(8, rect.left), maxLeft),
    top: rect.bottom + 4,
    width,
  };
}

export function useStudentSuggestions() {
  return useContext(StudentSuggestionsContext);
}

export default function StudentSuggestions({ children }) {
  const fetcher = useFetcher();
  const { data, load, state } = fetcher;
  const overlayRef = useRef(null);
  const selectStudentRef = useRef(null);
  const [active, setActive] = useState(null);
  const [position, setPosition] = useState(null);
  const [results, setResults] = useState([]);
  const [resultQuery, setResultQuery] = useState("");
  const deferredQuery = useDeferredValue(active?.query ?? "");

  const close = useCallback(() => {
    setActive(null);
    setPosition(null);
    selectStudentRef.current = null;
  }, []);

  const activate = useCallback((anchor, query, onSelect) => {
    selectStudentRef.current = onSelect;
    if (!anchor || !/\d/.test(query)) {
      setActive(null);
      setPosition(null);
      return;
    }

    setActive({ anchor, query });
    setPosition(getPosition(anchor));
  }, []);

  const contextValue = useMemo(
    () => ({ activate, close }),
    [activate, close]
  );

  useEffect(() => {
    if (!deferredQuery || !/\d/.test(deferredQuery)) {
      return;
    }

    const params = new URLSearchParams({
      id: deferredQuery,
      page: "1",
      limit: String(MAX_SUGGESTIONS),
    });
    load(`/periodo/all/estudiantes?${params}`);
  }, [deferredQuery, load]);

  useEffect(() => {
    const responseQuery = data?.filters?.id;
    if (
      responseQuery !== deferredQuery ||
      !Array.isArray(data?.rows)
    ) {
      return;
    }

    setResults(data.rows.slice(0, MAX_SUGGESTIONS));
    setResultQuery(responseQuery);
  }, [data, deferredQuery]);

  useEffect(() => {
    if (!active) {
      return;
    }

    const reposition = () => {
      if (active.anchor.isConnected) {
        setPosition(getPosition(active.anchor));
      } else {
        close();
      }
    };
    const closeFromOutside = (event) => {
      if (
        !active.anchor.contains(event.target) &&
        !overlayRef.current?.contains(event.target)
      ) {
        close();
      }
    };
    const closeFromKeyboard = (event) => {
      if (event.key === "Escape") {
        close();
        active.anchor.querySelector("input")?.focus();
      }
    };

    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    document.addEventListener("pointerdown", closeFromOutside);
    document.addEventListener("focusin", closeFromOutside);
    document.addEventListener("keydown", closeFromKeyboard);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      document.removeEventListener("pointerdown", closeFromOutside);
      document.removeEventListener("focusin", closeFromOutside);
      document.removeEventListener("keydown", closeFromKeyboard);
    };
  }, [active, close]);

  const isPending =
    active &&
    (active.query !== deferredQuery ||
      state !== "idle" ||
      resultQuery !== active.query);
  const showInitialLoading = isPending && results.length === 0;
  const shouldShowOverlay = results.length > 0;

  return (
    <StudentSuggestionsContext.Provider value={contextValue}>
      {children}
      {active &&
        position &&
        shouldShowOverlay &&
        createPortal(
          <FloatingOverlay
            ref={overlayRef}
            role="listbox"
            aria-label="Sugerencias de estudiantes"
            aria-busy={isPending ? "true" : "false"}
            className="fixed z-50 max-h-74 overflow-y-auto"
            style={{
              left: position.left,
              top: position.top,
              width: position.width,
            }}
          >
            <div className="flex items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <span>Coincidencias</span>
              {isPending && (
                <RefreshCw
                  aria-hidden="true"
                  className="h-3.5 w-3.5 animate-spin"
                />
              )}
            </div>
            {showInitialLoading && (
              <p className="px-4 py-3 text-sm text-gray-500">Buscando…</p>
            )}
            {results.length > 0 && (
              <div className={isPending ? "opacity-60" : ""}>
                {results.map((student) => {
                  const fullName =
                    `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim() ||
                    String(student.id);

                  return (
                    <button
                      key={student.id}
                      type="button"
                      role="option"
                      aria-selected="false"
                      className="block w-full px-4 py-2 text-left hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        selectStudentRef.current?.(student);
                        close();
                      }}
                    >
                      <span className="block font-medium text-gray-800">
                        {fullName}
                      </span>
                      <span className="block text-xs text-gray-500">
                        {student.id}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </FloatingOverlay>,
          document.body
        )}
    </StudentSuggestionsContext.Provider>
  );
}
