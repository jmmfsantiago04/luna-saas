import Link from "next/link";
import { connection } from "next/server";
import { listClients, listClientTags } from "@/lib/clients";
import {
  buildClientsHref as buildHref,
  parseClientListParams as parseFilters,
  type ClientStatus as Status,
  type SearchParamsRecord as SearchParams,
} from "@/lib/clients/filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientsTable } from "./clients-table";

export const instant = false;

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
  const [result, allTags] = await Promise.all([listClients(slug, filters), listClientTags(slug)]);

  if (!result.ok) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <p className="text-sm text-muted-foreground">
          Não foi possível aplicar esses filtros.{" "}
          <Link href={buildHref(slug, {})} className="underline">
            Limpar busca
          </Link>
        </p>
      </div>
    );
  }

  const { items, total, page, pageCount } = result;
  const { q, tag, status } = filters;
  const hasFilters = Boolean(q || tag);
  const tagOptions = tag && !allTags.includes(tag) ? [tag, ...allTags] : allTags;

  const tabs: { value: Status; label: string }[] = [
    { value: "active", label: "Ativos" },
    { value: "archived", label: "Arquivados" },
  ];

  let emptyMessage: string | null = null;
  if (items.length === 0) {
    if (hasFilters) emptyMessage = "Nenhum cliente encontrado com esses filtros.";
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
        <Button render={<Link href={`/app/${slug}/clients/new`} />}>Novo cliente</Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex gap-1" aria-label="Status dos clientes">
          {tabs.map((tab) => {
            const current = tab.value === status;
            return (
              <Link
                key={tab.value}
                href={buildHref(slug, { q, tag, status: tab.value })}
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

        <form method="get" className="flex flex-wrap items-center gap-2">
          {status !== "active" && <input type="hidden" name="status" value={status} />}
          <Input
            name="q"
            defaultValue={q}
            placeholder="Nome, email, telefone, Instagram, documento"
            className="w-full sm:w-64"
            maxLength={100}
          />
          <select
            name="tag"
            defaultValue={tag}
            aria-label="Filtrar por tag"
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            <option value="">Todas as tags</option>
            {tagOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline">
            Buscar
          </Button>
          {hasFilters && (
            <Link href={buildHref(slug, { status })} className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
              Limpar
            </Link>
          )}
        </form>
      </div>

      {tag && (
        <p className="text-sm text-muted-foreground">
          Filtrando pela tag <Badge variant="secondary">{tag}</Badge>{" "}
          <Link href={buildHref(slug, { q, status })} className="underline underline-offset-4">
            remover
          </Link>
        </p>
      )}

      {emptyMessage ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          <p>{emptyMessage}</p>
          {!hasFilters && status === "active" && (
            <Link href={`/app/${slug}/clients/new`} className="mt-2 inline-block underline">
              Cadastrar o primeiro
            </Link>
          )}
          {hasFilters && (
            <Link href={buildHref(slug, { status })} className="mt-2 inline-block underline">
              Limpar filtros
            </Link>
          )}
        </div>
      ) : (
        <ClientsTable slug={slug} items={items} filters={{ q, tag, status }} />
      )}

      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {total} {total === 1 ? "cliente" : "clientes"} · página {page} de {pageCount}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={buildHref(slug, { q, tag, status, page: page - 1 })} className="rounded-md border px-3 py-1.5 hover:bg-muted">
                Anterior
              </Link>
            ) : (
              <span className="rounded-md border px-3 py-1.5 opacity-50" aria-disabled="true">Anterior</span>
            )}
            {page < pageCount ? (
              <Link href={buildHref(slug, { q, tag, status, page: page + 1 })} className="rounded-md border px-3 py-1.5 hover:bg-muted">
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
