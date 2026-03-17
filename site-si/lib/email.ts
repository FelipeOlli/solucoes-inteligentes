import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = process.env.RESEND_FROM || "Soluções Inteligentes <onboarding@resend.dev>";

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export type SendResult = { ok: true } | { ok: false; error: string };

/**
 * Envia e-mail de redefinição de senha. Em produção use RESEND_API_KEY e domínio verificado (RESEND_FROM).
 */
export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<SendResult> {
  if (!resend) {
    return { ok: false, error: "Envio de e-mail não configurado (RESEND_API_KEY)." };
  }

  const appName = "Soluções Inteligentes";
  const html = `
    <p>Olá,</p>
    <p>Você solicitou a redefinição de senha na <strong>${appName}</strong>.</p>
    <p>Clique no link abaixo para definir uma nova senha (válido por 1 hora):</p>
    <p><a href="${resetLink}" style="color: #2563eb;">Redefinir senha</a></p>
    <p>Se você não solicitou isso, ignore este e-mail. Sua senha não será alterada.</p>
    <p>— ${appName}</p>
  `.trim();

  const { error } = await resend.emails.send({
    from: FROM,
    to: to.trim().toLowerCase(),
    subject: `Redefinição de senha - ${appName}`,
    html,
  });

  if (error) {
    return { ok: false, error: typeof error === "object" && "message" in error ? String(error.message) : "Falha ao enviar e-mail." };
  }
  return { ok: true };
}
