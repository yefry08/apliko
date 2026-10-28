import "server-only";
import { TEAM, type Member } from "./equipo";

/**
 * El email de cada asesor, solo en el servidor: identifica al asesor en la base (availability, bookings) y en
 * los roles, y recibe los avisos de reservas. Nunca se manda al navegador.
 */
const EMAILS: Record<string, string> = {
  "yefry-nunez": "yefrynunez45@gmail.com",
  "maria-colas": "majocolas17@gmail.com",
  "yira-tavarez": "tavarezyira@gmail.com",
  "marco-reyes": "marcoreyes2050@gmail.com",
};

export interface Advisor extends Member {
  email: string;
}

export const ADVISORS: Advisor[] = TEAM.filter((m) => EMAILS[m.slug]).map((m) => ({ ...m, email: EMAILS[m.slug] }));

export const advisorBySlug = (slug: string) => ADVISORS.find((a) => a.slug === slug) ?? null;
export const advisorByEmail = (email: string) => ADVISORS.find((a) => a.email === email.toLowerCase()) ?? null;
