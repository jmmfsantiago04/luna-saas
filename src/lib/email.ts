import "server-only";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "Luna <onboarding@resend.dev>";

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Envia um email; nunca lança erro (retorna ok=false e loga). */
export async function sendEmail(opts: { to: string; subject: string; html: string; text: string }) {
  try {
    const { error } = await resend.emails.send({ from: FROM, ...opts });
    if (error) {
      console.error("[email] falha no envio:", error.name, error.message);
      return { ok: false as const };
    }
    return { ok: true as const };
  } catch (err) {
    console.error("[email] erro inesperado:", err);
    return { ok: false as const };
  }
}

export function inviteEmail(p: { orgName: string; inviterName: string; url: string }) {
  const org = escapeHtml(p.orgName);
  const who = escapeHtml(p.inviterName);
  return {
    subject: `Convite para ${p.orgName}`,
    text: `${p.inviterName} convidou você para ${p.orgName}.\n\nAceite o convite: ${p.url}\n\nO link vale 7 dias. Se você não esperava este convite, ignore este email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#111">
  <h2 style="margin:0 0 16px">Convite para ${org}</h2>
  <p>${who} convidou você para fazer parte de <strong>${org}</strong>.</p>
  <p style="margin:24px 0"><a href="${p.url}" style="background:#111;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block">Aceitar convite</a></p>
  <p style="font-size:13px;color:#555">O link vale 7 dias. Se você não esperava este convite, ignore este email.</p>
</div>`,
  };
}
export function resetPasswordEmail(p: { url: string }) {
  return {
    subject: "Redefinir sua senha",
    text: `Recebemos um pedido para redefinir sua senha.\n\nCrie uma nova senha: ${p.url}\n\nO link vale 30 minutos e só pode ser usado uma vez. Se não foi você, ignore este email: sua senha continua a mesma.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#111">
  <h2 style="margin:0 0 16px">Redefinir sua senha</h2>
  <p>Recebemos um pedido para redefinir a senha da sua conta.</p>
  <p style="margin:24px 0"><a href="${p.url}" style="background:#111;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block">Criar nova senha</a></p>
  <p style="font-size:13px;color:#555">O link vale 30 minutos e só pode ser usado uma vez. Se não foi você, ignore este email: sua senha continua a mesma.</p>
</div>`,
  };
}
