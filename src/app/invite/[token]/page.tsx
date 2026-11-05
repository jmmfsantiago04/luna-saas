import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth, signOut } from "@/auth";
import { db } from "@/db";
import { organizationMembers } from "@/db/schema";
import { findValidInvite } from "@/lib/invite-lookup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AcceptButton } from "./accept-button";

export const instant = false;

function Shell({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        {children ? <CardContent className="flex flex-col gap-3">{children}</CardContent> : null}
      </Card>
    </main>
  );
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const invite = await findValidInvite(token);

  if (!invite) {
    return <Shell title="Convite inválido ou expirado" description="Peça um novo convite para quem te convidou." />;
  }

  const session = await auth();
  const back = encodeURIComponent(`/invite/${token}`);

  if (!session?.user?.id) {
    return (
      <Shell title={`Convite para ${invite.orgName}`} description={`Entre ou crie sua conta com ${invite.email} para aceitar.`}>
        <Button render={<Link href={`/login?callbackUrl=${back}`} />} className="w-full">Entrar</Button>
        <Button render={<Link href={`/signup?callbackUrl=${back}`} />} variant="outline" className="w-full">Criar conta</Button>
      </Shell>
    );
  }

  const [member] = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .where(and(eq(organizationMembers.organizationId, invite.orgId), eq(organizationMembers.userId, session.user.id)))
    .limit(1);
  if (member) redirect(`/app/${invite.orgSlug}`);

  if (session.user.email?.toLowerCase() !== invite.email) {
    return (
      <Shell title="Este convite é para outro email" description={`Você entrou como ${session.user.email}. Saia e entre com o email do convite.`}>
        <form action={async () => { "use server"; await signOut({ redirectTo: `/login?callbackUrl=${back}` }); }}>
          <Button type="submit" variant="outline" className="w-full">Sair e trocar de conta</Button>
        </form>
      </Shell>
    );
  }

  return (
    <Shell title={`Você foi convidado para ${invite.orgName}`} description={`Papel: ${invite.role}`}>
      <AcceptButton token={token} />
    </Shell>
  );
}