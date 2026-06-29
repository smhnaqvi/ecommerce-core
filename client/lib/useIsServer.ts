import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

// true during SSR + the first hydration render, false thereafter — lets a component safely
// render client-only values (localStorage, etc.) without a hydration mismatch.
export function useIsServer() {
  return useSyncExternalStore(noopSubscribe, () => false, () => true);
}