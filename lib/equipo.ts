/** El equipo de ApliKo, para la portada y las asesorías. Solo datos públicos: nada de teléfonos ni correos. */
export interface Member {
  /** Public id, used in /asesorias URLs. The email lives only on the server (lib/asesores.ts). */
  slug: string;
  name: string;
  role: string;
  linkedin: string;
  /** Square photo in public/equipo/; without one the card shows the initials. */
  photo?: string;
  initials: string;
}

export const TEAM: Member[] = [
  {
    slug: "yefry-nunez",
    name: "Yefry Núñez",
    role: "Fundador y CEO",
    linkedin: "https://www.linkedin.com/in/yefry-n%C3%BA%C3%B1ez-67a61831a",
    photo: "/equipo/yefry-nunez.webp",
    initials: "YN",
  },
  {
    slug: "maria-colas",
    name: "María J. Colas",
    role: "COO",
    linkedin: "https://www.linkedin.com/in/maria-colas-005a23312",
    photo: "/equipo/maria-colas.webp",
    initials: "MC",
  },
  {
    slug: "yira-tavarez",
    name: "Yira Tavarez Espinal",
    role: "CFO",
    linkedin: "https://www.linkedin.com/in/yira-tavarez-espinal-1a6868226",
    photo: "/equipo/yira-tavarez.webp",
    initials: "YT",
  },
  {
    slug: "marco-reyes",
    name: "Marco Reyes",
    role: "CTO",
    linkedin: "https://www.linkedin.com/in/marcoantreyes",
    photo: "/equipo/marco-reyes.webp",
    initials: "MR",
  },
];

/** Asesorías 1-1: precio y duración fijos para todo el equipo. */
export const SESSION = { priceUsd: 9, minutes: 30 } as const;
