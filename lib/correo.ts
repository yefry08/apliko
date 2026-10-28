import "server-only";
import nodemailer from "nodemailer";

/**
 * Correos de ApliKo desde Gmail (gratis, unos 500 al día). GMAIL_USER es la cuenta y GMAIL_APP_PASSWORD una
 * contraseña de aplicación de Google, no la contraseña normal. Sin ellas no se manda nada y el sitio sigue igual.
 */
const user = process.env.GMAIL_USER;
const pass = process.env.GMAIL_APP_PASSWORD;

let transport: ReturnType<typeof nodemailer.createTransport> | null = null;

export const mailConfigured = Boolean(user && pass);

export async function sendMail(to: string | string[], subject: string, text: string): Promise<boolean> {
  if (!user || !pass) return false;
  transport ??= nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass } });
  try {
    await transport.sendMail({ from: `"ApliKo" <${user}>`, to, subject, text });
    return true;
  } catch (error) {
    // A failed email must not undo a booking; the panel still shows everything.
    console.error("No se pudo enviar el correo", subject, error);
    return false;
  }
}
