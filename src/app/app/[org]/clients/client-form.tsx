"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ClientFormKey, ClientFormState, ClientFormValues } from "./actions";

type FormAction = (state: ClientFormState, formData: FormData) => Promise<ClientFormState>;

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-sm text-destructive">{messages[0]}</p>;
}

function TextField({
  name,
  label,
  values,
  errors,
  type = "text",
  max,
  placeholder,
  required,
}: {
  name: ClientFormKey;
  label: string;
  values: ClientFormValues;
  errors: Record<string, string[] | undefined>;
  type?: string;
  max?: number;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={values[name]}
        maxLength={max}
        placeholder={placeholder}
        aria-invalid={!!errors[name]}
        required={required}
      />
      <FieldError messages={errors[name]} />
    </div>
  );
}

export function ClientForm({
  action,
  initial = {},
  extended = false,
  submitLabel = "Salvar cliente",
  cancelHref,
}: {
  action: FormAction;
  initial?: ClientFormValues;
  /** Mostra os campos da ficha completa (documento, endereço, redes, tags). */
  extended?: boolean;
  submitLabel?: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState<ClientFormState, FormData>(action, {});
  const v = state.values ?? initial;
  const e = state.fieldErrors ?? {};
  // key muda a cada resposta, para os defaultValue voltarem preenchidos após erro.
  const formKey = state.values ? JSON.stringify(state.values) : "initial";

  return (
    <form key={formKey} action={formAction} className="space-y-6" noValidate>
      {state.error && !Object.keys(e).length && (
        <p className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{state.error}</p>
      )}

      <section className="space-y-5">
        {extended && <h2 className="text-sm font-semibold uppercase text-muted-foreground">Dados básicos</h2>}
        <TextField values={v} errors={e} name="name" label="Nome" max={200} required />

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
                  defaultChecked={(v.type || "person") === opt.value}
                  className="size-4 accent-primary"
                />
                {opt.label}
              </label>
            ))}
          </div>
          <FieldError messages={e.type} />
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField values={v} errors={e} name="email" label="Email" type="email" max={320} />
          <TextField values={v} errors={e} name="phone" label="Telefone" type="tel" max={40} />
          <TextField values={v} errors={e} name="contact" label="Contato" max={200} placeholder="Pessoa de referência" />
          <TextField values={v} errors={e} name="source" label="Origem" max={120} placeholder="Instagram, indicação..." />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea id="notes" name="notes" defaultValue={v.notes} maxLength={5000} rows={4} aria-invalid={!!e.notes} />
          <FieldError messages={e.notes} />
        </div>
      </section>

      {extended && (
        <>
          <section className="space-y-5">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">Documentos e datas</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField values={v} errors={e} name="document" label="CPF ou CNPJ" max={20} />
              <TextField values={v} errors={e} name="birthDate" label="Aniversário" type="date" />
            </div>
          </section>

          <section className="space-y-5">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">Endereço</h2>
            <TextField values={v} errors={e} name="addressStreet" label="Rua e número" max={200} />
            <div className="grid gap-5 sm:grid-cols-3">
              <TextField values={v} errors={e} name="addressCity" label="Cidade" max={120} />
              <TextField values={v} errors={e} name="addressState" label="Estado" max={60} placeholder="BA" />
              <TextField values={v} errors={e} name="addressZip" label="CEP" max={20} />
            </div>
          </section>

          <section className="space-y-5">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">Redes e tags</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField values={v} errors={e} name="instagram" label="Instagram" max={100} placeholder="@usuario" />
              <TextField values={v} errors={e} name="website" label="Site" max={300} placeholder="https://..." />
            </div>
            <TextField values={v} errors={e} name="tags" label="Tags" placeholder="noiva, vip, corporativo" />
            <p className="-mt-3 text-xs text-muted-foreground">Separe as tags por vírgula.</p>
          </section>
        </>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : submitLabel}
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href={cancelHref} />}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
