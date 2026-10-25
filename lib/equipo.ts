/** El equipo de ApliKo, para la portada. Solo datos públicos: nada de teléfonos ni correos. */
export interface Member {
  name: string;
  role: string;
  linkedin: string;
  /** Square photo in public/equipo/; without one the card shows the initials. */
  photo?: string;
  initials: string;
}

export const TEAM: Member[] = [
  {
    name: "Yefry Núñez",
    role: "Fundador y CEO",
    linkedin: "https://www.linkedin.com/in/yefry-n%C3%BA%C3%B1ez-67a61831a",
    photo: "/equipo/yefry-nunez.webp",
    initials: "YN",
  },
  {
    name: "María J. Colas",
    role: "COO",
    linkedin: "https://www.linkedin.com/in/maria-colas-005a23312",
    photo: "/equipo/maria-colas.webp",
    initials: "MC",
  },
  {
    name: "Yira Tavarez Espinal",
    role: "CFO",
    linkedin: "https://www.linkedin.com/in/yira-tavarez-espinal-1a6868226",
    photo: "/equipo/yira-tavarez.webp",
    initials: "YT",
  },
];
