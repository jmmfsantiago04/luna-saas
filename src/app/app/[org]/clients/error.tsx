"use client";

import { Button } from "@/components/ui/button";

export default function ClientsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="space-y-3 rounded-lg border border-dashed p-10 text-center">
      <p className="text-sm text-muted-foreground">Não foi possível carregar os clientes.</p>
      <Button variant="outline" onClick={() => reset()}>
        Tentar de novo
      </Button>
    </div>
  );
}
