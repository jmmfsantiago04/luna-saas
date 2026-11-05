"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createInvite, type InviteState } from "./actions";

export function InviteForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState(createInvite.bind(null, slug), {} as InviteState);
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!state.url) return;
    await navigator.clipboard.writeText(state.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-3">
      <form action={formAction} className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input id="invite-email" name="email" type="email" required placeholder="pessoa@email.com" />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Gerando..." : "Gerar convite"}
        </Button>
      </form>
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">{state.error}</p>
      ) : null}
      {state.url ? (
        <div className="flex flex-col gap-2 rounded-lg border p-3 text-sm">
          <span>Convite para {state.email} (vale 7 dias). Envie este link:</span>
          <div className="flex gap-2">
            <Input readOnly value={state.url} onFocus={(e) => e.currentTarget.select()} />
            <Button type="button" variant="outline" onClick={copy}>
              {copied ? "Copiado!" : "Copiar"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}