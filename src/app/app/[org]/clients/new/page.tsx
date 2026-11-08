import Link from "next/link";
import { connection } from "next/server";
import { requireOrg } from "@/lib/auth/org";
import { createClientAction } from "../actions";
import { ClientForm } from "../client-form";

export const instant = false;

export default async function NewClientPage({ params }: { params: Promise<{ org: string }> }) {
  await connection();
  const { org: slug } = await params;
  const { org } = await requireOrg(slug);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link href={`/app/${org.slug}/clients`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Voltar para clientes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Novo cliente</h1>
      </div>
      <ClientForm action={createClientAction.bind(null, org.slug)} cancelHref={`/app/${org.slug}/clients`} />
    </div>
  );
}
