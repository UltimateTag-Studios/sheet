import type { ReactNode } from "react";
import { createContext, useContext } from "react";

type ChromeMeasureContextValue = (node: HTMLElement | null) => void;

const ChromeMeasureContext = createContext<ChromeMeasureContextValue | null>(
  null,
);

export function ChromeMeasureProvider({
  onChromeMeasure,
  children,
}: {
  onChromeMeasure: ChromeMeasureContextValue;
  children: ReactNode;
}) {
  return (
    <ChromeMeasureContext.Provider value={onChromeMeasure}>
      {children}
    </ChromeMeasureContext.Provider>
  );
}

export function useChromeMeasureRef(): ChromeMeasureContextValue {
  const value = useContext(ChromeMeasureContext);
  if (!value) {
    throw new Error("useChromeMeasureRef must be used within Sheet");
  }
  return value;
}
