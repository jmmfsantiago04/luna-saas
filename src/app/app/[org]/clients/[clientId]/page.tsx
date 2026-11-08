import Link from "next/link";
import { connection } from "next/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getClient } from "@/lib/clients";
import { ArchiveButton } from "./archive-button";

export const instant = false;

const TYPE_LABEL = { person: "Pessoa", company: "Empresa" } as const;
const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Bahia" });

function dash(value: string | null) {
  return value && value.trim() ? value : "—";
}

/** "1990-05-20" -> "20/05/1990" sem passar por Date (evita erro de fuso). */
function formatDateOnly(value: string | null) {
  if (!value) return "—";
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

function instagramUrl(handle: string) {
  return `https://instagram.com/${handle.replace(/^@/, "").trim()}`;
}

function websiteUrl(site: string) {
  return /^https?:\/\//i.test(site) ? site : `https://${site}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border p-5">
      <h2 className="text-sm font-semibold uppercase text-muted-foreground">{title}</h2>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function Item({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words">{children}</dd>
    </div>
  );
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ org: string; clientId: string }>;
}) {
  await connection();
  const { org: slug, clientId } = await params;
  // getClient confere id do cliente + org da sessão; outra org => 404.
  const client = await getClient(slug, clientId);
  const archived = client.archivedAt !== null;
  const address = [client.addressStreet, client.addressCity, client.addressState, client.addressZip]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/app/${slug}/clients${archived ? "?status=archived" : ""}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Voltar para clientes
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">{client.name}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{TYPE_LABEL[client.type]}</Badge>
            {archived && <Badge variant="outline">Arquivado</Badge>}
            {client.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          {!archived && (
            <Button nativeButton={false} render={<Link href={`/app/${slug}/clients/${client.id}/edit`} />}>
              Editar ficha
            </Button>
          )}
          <ArchiveButton slug={slug} clientId={client.id} name={client.name} archived={archived} />
        </div>
      </div>

      <Section title="Contato">
        <Item label="Email">
          {client.email ? (
            <a href={`mailto:${client.email}`} className="underline underline-offset-4">
              {client.email}
            </a>
          ) : (
            "—"
          )}
        </Item>
        <Item label="Telefone">
          {client.phone ? (
            <a href={`tel:${client.phone}`} className="underline underline-offset-4">
              {client.phone}
            </a>
          ) : (
            "—"
          )}
        </Item>
        <Item label="Pessoa de referência">{dash(client.contact)}</Item>
        <Item label="Origem">{dash(client.source)}</Item>
      </Section>

      <Section title="Documentos e datas">
        <Item label="CPF ou CNPJ">{dash(client.document)}</Item>
        <Item label="Aniversário">{formatDateOnly(client.birthDate)}</Item>
      </Section>

      <Section title="Endereço">
        <Item label="Endereço" wide>
          {address || "—"}
        </Item>
      </Section>

      <Section title="Redes">
        <Item label="Instagram">
          {client.instagram ? (
            <a href={instagramUrl(client.instagram)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
              {client.instagram}
            </a>
          ) : (
            "—"
          )}
        </Item>
        <Item label="Site">
          {client.website ? (
            <a href={websiteUrl(client.website)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
              {client.website}
            </a>
          ) : (
            "—"
          )}
        </Item>
      </Section>

      <Section title="Observações">
        <Item label="Notas" wide>
          <span className="whitespace-pre-line">{dash(client.notes)}</span>
        </Item>
      </Section>

      <p className="text-xs text-muted-foreground">
        Criado em {dateTime.format(client.createdAt)} · Atualizado em {dateTime.format(client.updatedAt)}
        {client.archivedAt && ` · Arquivado em ${dateTime.format(client.archivedAt)}`} (horário de Brasília/Bahia)
      </p>
    </div>
  );
}
