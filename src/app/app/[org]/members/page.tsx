import { connection } from "next/server";
import { and, asc, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { organizationInvites, organizationMembers, users } from "@/db/schema";
import { requireOrg } from "@/lib/auth/org";
import { InviteForm } from "./invite-form";

export const instant = false;

const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Bahia" });

export default async function MembersPage({ params }: { params: Promise<{ org: string }> }) {
  await connection();
  const { org: slug } = await params;
  const { org, role, user } = await requireOrg(slug, "admin");
  const isOwner = role === "owner";

  const members = await db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      role: organizationMembers.role,
      joinedAt: organizationMembers.createdAt,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .where(eq(organizationMembers.organizationId, org.id))
    .orderBy(asc(organizationMembers.createdAt));

  const invites = isOwner
    ? await db
        .select({
          id: organizationInvites.id,
          email: organizationInvites.email,
          role: organizationInvites.role,
          expiresAt: organizationInvites.expiresAt,
        })
        .from(organizationInvites)
        .where(
          and(
            eq(organizationInvites.organizationId, org.id),
            isNull(organizationInvites.acceptedAt),
            gt(organizationInvites.expiresAt, new Date()),
          ),
        )
        .orderBy(desc(organizationInvites.createdAt))
    : [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">Membros</h1>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Papel</th>
                <th className="px-4 py-2 font-medium">Entrou em</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.userId} className="border-t">
                  <td className="px-4 py-2">
                    {m.name ?? "—"}
                    {m.userId === user.id ? <span className="ml-2 text-xs text-muted-foreground">(você)</span> : null}
                  </td>
                  <td className="px-4 py-2">{m.email}</td>
                  <td className="px-4 py-2">{m.role}</td>
                  <td className="px-4 py-2">{fmt.format(m.joinedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isOwner ? (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Convidar</h2>
            <InviteForm slug={org.slug} />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Convites pendentes</h2>
            {invites.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum convite pendente.</p>
            ) : (
              <ul className="divide-y rounded-lg border text-sm">
                {invites.map((i) => (
                  <li key={i.id} className="flex items-center justify-between px-4 py-2">
                    <span>{i.email}</span>
                    <span className="text-muted-foreground">
                      {i.role} · vence em {fmt.format(i.expiresAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}