import type { Metadata } from "next";
import { Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

// Satoshi (the body face) is not on Google Fonts; it loads from Fontshare in <head> below.
const display = Instrument_Serif({ weight: "400", style: ["normal", "italic"], variable: "--font-display", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono-face", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "ApliKo · Becas para dominicanos y latinos",
    template: "%s · ApliKo",
  },
  description:
    "Becas, fellowships e internships verificados para estudiantes dominicanos y latinos. Filtra por tu ciudadanía y descubre a cuáles sí puedes postular.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${display.variable} ${mono.variable} h-full antialiased`}>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap" />
      </head>
      <body className="flex min-h-full flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
