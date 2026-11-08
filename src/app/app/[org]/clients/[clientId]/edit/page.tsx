import Link from "next/link";
import { connection } from "next/server";
import { getClient } from "@/lib/clients";
import { updateClientAction, type ClientFormValues } from "../../actions";
import { ClientForm } from "../../client-form";

export const instant = false;

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ org: string; clientId: string }>;
}) {
  await connection();
  const { org: slug, clientId } = await params;
  const client = await getClient(slug, clientId);
  const detailHref = `/app/${slug}/clients/${client.id}`;

  const initial: ClientFormValues = {
    name: client.name,
    type: client.type,
    email: client.email ?? "",
    phone: client.phone ?? "",
    contact: client.contact ?? "",
    source: client.source ?? "",
    notes: client.notes ?? "",
    document: client.document ?? "",
    birthDate: client.birthDate ?? "",
    addressStreet: client.addressStreet ?? "",
    addressCity: client.addressCity ?? "",
    addressState: client.addressState ?? "",
    addressZip: client.addressZip ?? "",
    instagram: client.instagram ?? "",
    website: client.website ?? "",
    tags: client.tags.join(", "),
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={detailHref} className="text-sm text-muted-foreground hover:text-foreground">
          ← Voltar para a ficha
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Editar {client.name}</h1>
      </div>
      <ClientForm
        action={updateClientAction.bind(null, slug, client.id)}
        initial={initial}
        extended
        submitLabel="Salvar alterações"
        cancelHref={detailHref}
      />
    </div>
  );
}
