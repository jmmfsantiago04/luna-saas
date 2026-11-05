import Link from "next/link";
import { connection } from "next/server";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { findValidResetToken } from "@/lib/password-reset";
import { ResetForm } from "./reset-form";

export const instant = false;

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const row = await findValidResetToken(token);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{row ? "Criar nova senha" : "Link inválido ou expirado"}</CardTitle>
          <CardDescription>
            {row ? `Para a conta ${row.email}.` : "Peça um novo link de redefinição."}
          </CardDescription>
        </CardHeader>
        {row ? (
          <CardContent>
            <ResetForm token={token} />
          </CardContent>
        ) : null}
        <CardFooter>
          <Link href={row ? "/login" : "/forgot-password"} className="text-sm text-primary underline-offset-4 hover:underline">
            {row ? "Voltar para o login" : "Pedir novo link"}
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}