import React from "react";
import type { RuntimeBundle } from "./bootstrap";

export type RuntimeStore = {
  bundle: RuntimeBundle;
  replace(bundle: RuntimeBundle): void;
};

const RuntimeContext = React.createContext<RuntimeStore | null>(null);

export function RuntimeProvider({ bundle, children }: { bundle: RuntimeBundle; children: React.ReactNode }): React.ReactElement {
  const [active, setActive] = React.useState(bundle);
  const store = React.useMemo(() => ({ bundle: active, replace: setActive }), [active]);
  return <RuntimeContext.Provider value={store}>{children}</RuntimeContext.Provider>;
}

export function useRuntime(): RuntimeStore {
  const store = React.useContext(RuntimeContext);
  if (!store) throw new Error("RuntimeProvider is required");
  return store;
}
