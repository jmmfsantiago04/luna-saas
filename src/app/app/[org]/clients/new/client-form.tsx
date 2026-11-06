"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClientAction, type ClientFormState } from "../actions";

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-sm text-destructive">{messages[0]}</p>;
}

export function ClientForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState<ClientFormState, FormData>(
    createClientAction.bind(null, slug),
    {},
  );
  const v = state.values;
  const e = state.fieldErrors ?? {};
  // key muda a cada resposta, para os defaultValue voltarem preenchidos após erro.
  const formKey = v ? JSON.stringify(v) : "empty";

  return (
    <form key={formKey} action={formAction} className="space-y-5" noValidate>
      {state.error && !Object.keys(e).length && (
        <p className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{state.error}</p>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Nome *</Label>
        <Input id="name" name="name" defaultValue={v?.name} maxLength={200} aria-invalid={!!e.name} required />
        <FieldError messages={e.name} />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Tipo</legend>
        <div className="flex gap-4">
          {[
            { value: "person", label: "Pessoa" },
            { value: "company", label: "Empresa" },
          ].map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="type"
                value={opt.value}
                defaultChecked={(v?.type || "person") === opt.value}
                className="size-4 accent-primary"
              />
              {opt.label}
            </label>
          ))}
        </div>
        <FieldError messages={e.type} />
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={v?.email} maxLength={320} aria-invalid={!!e.email} />
          <FieldError messages={e.email} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={v?.phone} maxLength={40} aria-invalid={!!e.phone} />
          <FieldError messages={e.phone} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact">Contato</Label>
          <Input id="contact" name="contact" defaultValue={v?.contact} maxLength={200} placeholder="Pessoa de referência" aria-invalid={!!e.contact} />
          <FieldError messages={e.contact} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="source">Origem</Label>
          <Input id="source" name="source" defaultValue={v?.source} maxLength={120} placeholder="Instagram, indicação..." aria-invalid={!!e.source} />
          <FieldError messages={e.source} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" name="notes" defaultValue={v?.notes} maxLength={5000} rows={4} aria-invalid={!!e.notes} />
        <FieldError messages={e.notes} />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar cliente"}
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href={`/app/${slug}/clients`} />}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
