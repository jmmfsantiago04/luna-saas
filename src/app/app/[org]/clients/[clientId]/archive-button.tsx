"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { archiveClientAction, restoreClientAction } from "../actions";

export function ArchiveButton({
  slug,
  clientId,
  name,
  archived,
}: {
  slug: string;
  clientId: string;
  name: string;
  archived: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (archived) {
    return (
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => startTransition(() => restoreClientAction(slug, clientId))}
      >
        {pending ? "Restaurando..." : "Restaurar"}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>Arquivar</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Arquivar {name}?</DialogTitle>
          <DialogDescription>
            O cliente sai da lista de ativos, mas nada é apagado. Você pode restaurar depois pela aba Arquivados.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await archiveClientAction(slug, clientId);
                setOpen(false);
              })
            }
          >
            {pending ? "Arquivando..." : "Arquivar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
