import { connection } from "next/server";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

// Session cookies — must not be prerendered with Cache Components.
export const instant = false;

export default async function OnboardingPage() {
  await connection();
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">Onboarding</h1>
      <p className="text-muted-foreground">
        Olá, {session.user.email}. Em breve você configura sua organização aqui.
      </p>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <Button type="submit" variant="outline">
          Sair
        </Button>
      </form>
    </main>
  );
}
