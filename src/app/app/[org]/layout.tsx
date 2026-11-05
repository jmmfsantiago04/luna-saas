import { connection } from "next/server";
import { signOut } from "@/auth";
import { requireOrg } from "@/lib/auth/org";
import { Button } from "@/components/ui/button";

export const instant = false;

export default async function OrgLayout({ children, params }: { children: React.ReactNode; params: Promise<{ org: string }> }) {
  await connection();
  const { org: slug } = await params;
  const { org, role, user } = await requireOrg(slug);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="font-semibold">{org.name} <span className="text-sm font-normal text-muted-foreground">· {role}</span></div>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
          <span className="mr-3 text-sm text-muted-foreground">{user.email}</span>
          <Button type="submit" variant="outline" size="sm">Sair</Button>
        </form>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}