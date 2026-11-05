"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { acceptInvite, type AcceptState } from "./actions";

export function AcceptButton({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptInvite.bind(null, token), {} as AcceptState);
  return (
    <form action={action} className="flex flex-col gap-2">
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Entrando..." : "Aceitar convite"}
      </Button>
      {state.error ? <p className="text-sm text-destructive" role="alert">{state.error}</p> : null}
    </form>
  );
}