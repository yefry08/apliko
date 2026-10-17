"use client";

import Link from "next/link";
import { BENEFITS } from "@/lib/registro";
import { useAuth } from "./auth-provider";

/** La sección de registro de la portada. Se esconde con sesión o si las cuentas no están activadas. */
export function RegistroSection() {
  const { configured, user, loading } = useAuth();
  if (!configured || loading || user) return null;
  return (
    <section className="signup-section" id="registro" aria-labelledby="signup-title">
      <div className="signup-copy">
        <h2 id="signup-title">Crea tu cuenta</h2>
        <p>Gratis. Guarda becas y llena Mi perfil una vez; lo encuentras igual en cualquier dispositivo.</p>
        <div className="hero-actions">
          <Link className="button-primary" href="/registro">
            Crear cuenta ↗
          </Link>
          <Link className="button-quiet" href="/entrar">
            Ya tengo cuenta
          </Link>
        </div>
      </div>
      <ul className="signup-benefits" role="list">
        {BENEFITS.map((b) => (
          <li key={b.title}>
            <h3>{b.title}</h3>
            <p>{b.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "Crear cuenta" en el menú de la portada, solo sin sesión. */
export function RegistroNavLink() {
  const { configured, user, loading } = useAuth();
  if (!configured || loading) return null;
  if (user) return <Link href="/entrar">Mi cuenta</Link>;
  return <Link href="/registro">Crear cuenta</Link>;
}
