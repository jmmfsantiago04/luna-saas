"use client";
import { useActionState } from "react";
import { createOrg } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateOrgForm() {
  const [state, action, pending] = useActionState(createOrg, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <Label htmlFor="name">Nome do seu negócio</Label>
      <Input id="name" name="name" placeholder="Ex.: Luna Bahia" required />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Criando..." : "Criar"}</Button>
    </form>
  );
}