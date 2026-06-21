import type { CSSProperties, ReactNode } from "react";
import { createContext, useCallback, useContext, useState } from "react";

const SheetHostContext = createContext<HTMLElement | null>(null);

export function useSheetHostEl(): HTMLElement | null {
  return useContext(SheetHostContext);
}

export type SheetHostProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/** Sized container for a sheet — snap heights measure from this element. */
export function SheetHost({ children, className, style }: SheetHostProps) {
  const [hostEl, setHostEl] = useState<HTMLElement | null>(null);

  const hostRef = useCallback((node: HTMLDivElement | null) => {
    setHostEl(node);
  }, []);

  return (
    <SheetHostContext.Provider value={hostEl}>
      <div ref={hostRef} className={className} style={style}>
        {children}
      </div>
    </SheetHostContext.Provider>
  );
}
