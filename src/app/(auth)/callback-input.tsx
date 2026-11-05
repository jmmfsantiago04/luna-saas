"use client";

import { useEffect, useState } from "react";

/** Copia ?callbackUrl da URL para um campo oculto do formulário. */
export function CallbackInput() {
  const [value, setValue] = useState("");
  useEffect(() => {
    setValue(new URLSearchParams(window.location.search).get("callbackUrl") ?? "");
  }, []);
  return <input type="hidden" name="callbackUrl" value={value} />;
}