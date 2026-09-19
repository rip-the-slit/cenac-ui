import { createContext, useContext } from "react";

const ClassLoaderContext = createContext(null);

export function useClassLoader() {
  const context = useContext(ClassLoaderContext);
  if (!context) {
    throw new Error("useClassLoader must be used inside ClassLoaderProvider");
  }
  return context;
}

export default ClassLoaderContext;
