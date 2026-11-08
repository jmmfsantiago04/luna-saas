"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ClientRow } from "@/lib/clients";

const TYPE_LABEL = { person: "Pessoa", company: "Empresa" } as const;

function dash(value: string | null) {
  return value && value.trim() ? value : "—";
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}

export function ClientsTable({ slug, items }: { slug: string; items: ClientRow[] }) {
  const [selected, setSelected] = useState<ClientRow | null>(null);

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Origem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-medium">
                  <button
                    type="button"
                    onClick={() => setSelected(client)}
                    className="text-left underline-offset-4 hover:underline"
                  >
                    {client.name}
                  </button>
                </TableCell>
                <TableCell>{TYPE_LABEL[client.type]}</TableCell>
                <TableCell>{dash(client.email)}</TableCell>
                <TableCell>{dash(client.phone)}</TableCell>
                <TableCell>{dash(client.source)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        {selected && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selected.name}
                <Badge variant="secondary">{TYPE_LABEL[selected.type]}</Badge>
                {selected.archivedAt && <Badge variant="outline">Arquivado</Badge>}
              </DialogTitle>
              <DialogDescription>Resumo do cadastro</DialogDescription>
            </DialogHeader>

            <dl className="space-y-2 text-sm">
              <InfoRow label="Email">
                {selected.email ? (
                  <a href={`mailto:${selected.email}`} className="underline underline-offset-4">
                    {selected.email}
                  </a>
                ) : (
                  "—"
                )}
              </InfoRow>
              <InfoRow label="Telefone">
                {selected.phone ? (
                  <a href={`tel:${selected.phone}`} className="underline underline-offset-4">
                    {selected.phone}
                  </a>
                ) : (
                  "—"
                )}
              </InfoRow>
              <InfoRow label="Contato">{dash(selected.contact)}</InfoRow>
              <InfoRow label="Origem">{dash(selected.source)}</InfoRow>
              <InfoRow label="Observações">
                <span className="whitespace-pre-line">{dash(selected.notes)}</span>
              </InfoRow>
            </dl>

            <DialogFooter showCloseButton>
              <Button nativeButton={false} render={<Link href={`/app/${slug}/clients/${selected.id}`} />}>
                Ficha completa
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
