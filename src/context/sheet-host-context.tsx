import type { CSSProperties, ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";

type SheetHostStore = {
  subscribe: (onStoreChange: () => void) => () => void;
  getSnapshot: () => HTMLElement | null;
};

const SheetHostContext = createContext<SheetHostStore | null>(null);

const noopSubscribe = () => () => {};
const serverSnapshot = (): HTMLElement | null => null;

export function useSheetHostEl(): HTMLElement | null {
  const store = useContext(SheetHostContext);
  return useSyncExternalStore(
    store?.subscribe ?? noopSubscribe,
    store?.getSnapshot ?? serverSnapshot,
    serverSnapshot,
  );
}

export type SheetHostProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/** Sized container for a sheet — snap heights measure from this element. */
export function SheetHost({ children, className, style }: SheetHostProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const listenersRef = useRef(new Set<() => void>());

  const notify = useCallback(() => {
    for (const listener of listenersRef.current) {
      listener();
    }
  }, []);

  const store = useMemo<SheetHostStore>(
    () => ({
      subscribe: (onStoreChange) => {
        listenersRef.current.add(onStoreChange);
        return () => {
          listenersRef.current.delete(onStoreChange);
        };
      },
      getSnapshot: () => hostRef.current,
    }),
    [],
  );

  useLayoutEffect(() => {
    notify();
  }, [notify]);

  return (
    <SheetHostContext.Provider value={store}>
      <div ref={hostRef} className={className} style={style}>
        {children}
      </div>
    </SheetHostContext.Provider>
  );
}
