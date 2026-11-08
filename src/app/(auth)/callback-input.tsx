"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

function getSnapshot() {
  return new URLSearchParams(window.location.search).get("callbackUrl") ?? "";
}

/** No servidor (e na hidratação) o valor é "": evita mismatch. */
function getServerSnapshot() {
  return "";
}

/** Copia ?callbackUrl da URL para um campo oculto do formulário. */
export function CallbackInput() {
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return <input type="hidden" name="callbackUrl" value={value} />;
}
