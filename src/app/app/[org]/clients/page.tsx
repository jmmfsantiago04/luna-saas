import Link from "next/link";
import { connection } from "next/server";
import { listClients } from "@/lib/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const instant = false;

type Status = "active" | "archived";
type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** A URL pode trazer qualquer coisa: normaliza para valores seguros. */
function parseFilters(sp: SearchParams) {
  const q = (first(sp.q) ?? "").trim().slice(0, 100);
  const status: Status = first(sp.status) === "archived" ? "archived" : "active";
  const pageNum = Number(first(sp.page));
  const page = Number.isInteger(pageNum) && pageNum >= 1 ? pageNum : 1;
  return { q, status, page };
}

function buildHref(slug: string, f: { q: string; status: Status; page: number }) {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.status !== "active") params.set("status", f.status);
  if (f.page > 1) params.set("page", String(f.page));
  const qs = params.toString();
  return `/app/${slug}/clients${qs ? `?${qs}` : ""}`;
}

const TYPE_LABEL = { person: "Pessoa", company: "Empresa" } as const;

function dash(value: string | null) {
  return value && value.trim() ? value : "—";
}

export default async function ClientsPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await connection();
  const { org: slug } = await params;
  const filters = parseFilters(await searchParams);
  const result = await listClients(slug, filters);

  if (!result.ok) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <p className="text-sm text-muted-foreground">
          Não foi possível aplicar esses filtros.{" "}
          <Link href={buildHref(slug, { q: "", status: "active", page: 1 })} className="underline">
            Limpar busca
          </Link>
        </p>
      </div>
    );
  }

  const { items, total, page, pageCount } = result;
  const { q, status } = filters;

  const tabs: { value: Status; label: string }[] = [
    { value: "active", label: "Ativos" },
    { value: "archived", label: "Arquivados" },
  ];

  let emptyMessage: string | null = null;
  if (items.length === 0) {
    if (q) emptyMessage = `Nenhum cliente encontrado para “${q}”.`;
    else if (status === "archived") emptyMessage = "Nenhum cliente arquivado.";
    else emptyMessage = "Nenhum cliente cadastrado ainda.";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-sm text-muted-foreground">Clientes da sua organização.</p>
        </div>
        <Button nativeButton={false} render={<Link href={`/app/${slug}/clients/new`} />}>Novo cliente</Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex gap-1" aria-label="Status dos clientes">
          {tabs.map((tab) => {
            const current = tab.value === status;
            return (
              <Link
                key={tab.value}
                href={buildHref(slug, { q, status: tab.value, page: 1 })}
                aria-current={current ? "page" : undefined}
                className={
                  current
                    ? "rounded-md bg-muted px-3 py-1.5 text-sm font-medium"
                    : "rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                }
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <form method="get" className="flex gap-2">
          {status !== "active" && <input type="hidden" name="status" value={status} />}
          <Input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nome ou email"
            className="w-full sm:w-64"
            maxLength={100}
          />
          <Button type="submit" variant="outline">
            Buscar
          </Button>
        </form>
      </div>

      {emptyMessage ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          <p>{emptyMessage}</p>
          {!q && status === "active" && (
            <Link href={`/app/${slug}/clients/new`} className="mt-2 inline-block underline">
              Cadastrar o primeiro
            </Link>
          )}
          {q && (
            <Link href={buildHref(slug, { q: "", status, page: 1 })} className="mt-2 inline-block underline">
              Limpar busca
            </Link>
          )}
        </div>
      ) : (
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
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{TYPE_LABEL[client.type]}</TableCell>
                  <TableCell>{dash(client.email)}</TableCell>
                  <TableCell>{dash(client.phone)}</TableCell>
                  <TableCell>{dash(client.source)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {total} {total === 1 ? "cliente" : "clientes"} · página {page} de {pageCount}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={buildHref(slug, { q, status, page: page - 1 })} className="rounded-md border px-3 py-1.5 hover:bg-muted">
                Anterior
              </Link>
            ) : (
              <span className="rounded-md border px-3 py-1.5 opacity-50" aria-disabled="true">Anterior</span>
            )}
            {page < pageCount ? (
              <Link href={buildHref(slug, { q, status, page: page + 1 })} className="rounded-md border px-3 py-1.5 hover:bg-muted">
                Próxima
              </Link>
            ) : (
              <span className="rounded-md border px-3 py-1.5 opacity-50" aria-disabled="true">Próxima</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
