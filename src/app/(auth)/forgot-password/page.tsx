"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset, type ForgotState } from "./actions";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, {} as ForgotState);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Esqueci minha senha</CardTitle>
          <CardDescription>Enviaremos um link para você criar uma nova senha.</CardDescription>
        </CardHeader>
        <CardContent>
          {state.done ? (
            <p className="text-sm">
              Se existir uma conta com esse email, enviamos um link para redefinir a senha. Ele vale 30 minutos.
            </p>
          ) : (
            <form action={formAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              {state.error ? <p className="text-sm text-destructive" role="alert">{state.error}</p> : null}
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Enviando..." : "Enviar link"}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter>
          <Link href="/login" className="text-sm text-primary underline-offset-4 hover:underline">
            Voltar para o login
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}