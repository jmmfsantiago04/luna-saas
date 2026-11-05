"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "./google-action";
import { CallbackInput } from "./callback-input";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" className="w-full" disabled={pending}>
      {pending ? "Redirecionando..." : "Entrar com Google"}
    </Button>
  );
}

export function GoogleButton() {
  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        ou
        <span className="h-px flex-1 bg-border" />
      </div>
      <form action={signInWithGoogle}>
        <CallbackInput />
        <SubmitButton />
      </form>
    </div>
  );
}