"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth, type Role } from "@/components/auth-provider";
import { AdminAsesorias } from "./asesorias";

interface AdminUser {
  id: string;
  email: string | null;
  name: string | null;
  createdAt: string;
  verified: boolean;
  providers: string[];
  lastActive: string | null;
  saved: number;
  hasProfile: boolean;
  role: Role;
}

interface AdminData {
  role: Role;
  me: string;
  stats: { accounts: number; verified: number; newThisWeek: number; anonymous: number; withSaved: number; withProfile: number };
  users: AdminUser[];
  /** Admin invitations by email; active once that email signs in verified. */
  admins: { email: string; since: string; active: boolean }[];
}

const ROLE_LABEL: Record<Role, string> = { usuario: "Usuario", admin: "Admin", superadmin: "Super admin" };
const date = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" }) : "—";
const howTheyEnter = (u: AdminUser) =>
  u.providers.length ? u.providers.map((p) => (p === "google" ? "Google" : p === "github" ? "GitHub" : p)).join(", ") : "Email";

export function AdminPanel() {
  const { configured, user, loading, getToken } = useAuth();
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState<"forbidden" | "failed" | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [newAdmin, setNewAdmin] = useState("");

  const fetchAdmin = useCallback(async (): Promise<AdminData | "forbidden" | "failed" | null> => {
    const token = await getToken();
    if (!token) return null;
    const res = await fetch("/api/admin", { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
    if (res?.status === 403) return "forbidden";
    if (!res?.ok) return "failed";
    return (await res.json()) as AdminData;
    // getToken changes identity each render; the user id is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const apply = (result: AdminData | "forbidden" | "failed" | null) => {
    if (result === null) return;
    if (typeof result === "string") return setError(result);
    setError(null);
    setData(result);
  };

  useEffect(() => {
    if (!user) return;
    let active = true;
    fetchAdmin().then((result) => {
      if (active) apply(result);
    });
    return () => {
      active = false;
    };
  }, [user, fetchAdmin]);

  if (!configured) return <p className="text-muted-foreground">Las cuentas no están activadas en este sitio.</p>;
  if (loading) return <p className="text-muted-foreground">Cargando…</p>;
  if (!user) {
    return (
      <p className="text-muted-foreground">
        <Link href="/entrar" className="text-larimar hover:underline">
          Entra
        </Link>{" "}
        con una cuenta de admin para ver este panel.
      </p>
    );
  }
  if (error === "forbidden") return <p className="text-muted-foreground">Esta página es solo para admins.</p>;
  if (error === "failed") return <p className="text-coral">No pudimos cargar el panel. Recarga la página.</p>;
  if (!data) return <p className="text-muted-foreground">Cargando…</p>;

  const setAdmin = async (email: string, admin: boolean) => {
    const token = await getToken();
    if (!token) return false;
    setBusy(email);
    setNotice("");
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email, admin }),
    }).catch(() => null);
    const body = res ? ((await res.json().catch(() => ({}))) as { error?: string }) : {};
    setBusy(null);
    if (!res?.ok) {
      setNotice(body.error ?? "No se pudo cambiar el rol.");
      return false;
    }
    setNotice(admin ? `${email} ahora es admin.` : `${email} ya no es admin.`);
    apply(await fetchAdmin());
    return true;
  };

  const q = query.trim().toLowerCase();
  const users = q
    ? data.users.filter((u) => (u.email ?? "").toLowerCase().includes(q) || (u.name ?? "").toLowerCase().includes(q))
    : data.users;
  const tiles = [
    { label: "Cuentas", value: data.stats.accounts },
    { label: "Con email verificado", value: data.stats.verified },
    { label: "Nuevas esta semana", value: data.stats.newThisWeek },
    { label: "Guardaron becas", value: data.stats.withSaved },
    { label: "Llenaron Mi perfil", value: data.stats.withProfile },
  ];

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-muted-foreground">
        Entraste como <span className="font-medium text-foreground">{ROLE_LABEL[data.role]}</span>.
        {data.role === "superadmin" ? " Puedes nombrar y quitar admins." : " Solo el super admin cambia roles."}
      </p>

      <dl className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl border p-5">
            <dd className="font-display text-4xl text-larimar tabular-nums">{t.value}</dd>
            <dt className="mt-1 text-sm text-muted-foreground">{t.label}</dt>
          </div>
        ))}
      </dl>
      <p className="-mt-4 text-xs text-muted-foreground">
        Sin contar {data.stats.anonymous} sesiones anónimas: visitas sin cuenta que Neon Auth registra por su cuenta.
      </p>

      <AdminAsesorias getToken={getToken} superadmin={data.role === "superadmin"} />

      <section className="flex flex-col gap-4" aria-labelledby="admins-title">
        <h2 id="admins-title" className="font-display text-3xl">
          Admins
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Un admin se nombra por email. Se activa cuando esa persona entra a ApliKo con ese email ya verificado (con Google
          lo está desde el primer día).
        </p>
        <ul className="flex flex-col divide-y rounded-2xl border" role="list">
          {data.admins.map((a) => (
            <li key={a.email} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="font-medium">{a.email}</span>
              <span className="flex items-center gap-3">
                <span className={a.active ? "text-larimar" : "text-muted-foreground"}>
                  {a.active ? "Activo" : "Pendiente: todavía no entra"}
                </span>
                {data.role === "superadmin" && (
                  <button
                    type="button"
                    disabled={busy === a.email}
                    onClick={() => setAdmin(a.email, false)}
                    className="rounded-full border px-3 py-1 text-xs hover:border-coral hover:text-coral disabled:opacity-50"
                  >
                    Quitar
                  </button>
                )}
              </span>
            </li>
          ))}
          {data.admins.length === 0 && <li className="px-4 py-3 text-sm text-muted-foreground">Todavía no hay admins.</li>}
        </ul>
        {data.role === "superadmin" && (
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await setAdmin(newAdmin.trim().toLowerCase(), true)) setNewAdmin("");
            }}
          >
            <label className="flex flex-col gap-1.5">
              <span className="eyebrow">Nuevo admin</span>
              <input
                type="email"
                required
                value={newAdmin}
                onChange={(e) => setNewAdmin(e.target.value)}
                placeholder="correo@gmail.com"
                className="h-10 w-72 max-w-full rounded-lg border bg-card px-3 text-sm outline-none focus-visible:border-larimar focus-visible:ring-2 focus-visible:ring-larimar/30"
              />
            </label>
            <button
              type="submit"
              disabled={busy !== null}
              className="h-10 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              Hacer admin
            </button>
          </form>
        )}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="users-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="users-title" className="font-display text-3xl">
            Cuentas
          </h2>
          <label className="flex flex-col gap-1.5">
            <span className="sr-only">Buscar por email o nombre</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por email o nombre"
              className="h-10 w-64 max-w-full rounded-lg border bg-card px-3 text-sm outline-none focus-visible:border-larimar focus-visible:ring-2 focus-visible:ring-larimar/30"
            />
          </label>
        </div>
        {notice && (
          <p className="text-sm" aria-live="polite">
            {notice}
          </p>
        )}
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Cuenta</th>
                <th className="px-4 py-3 font-medium">Entra con</th>
                <th className="px-4 py-3 font-medium">Creada</th>
                <th className="px-4 py-3 font-medium">Última visita</th>
                <th className="px-4 py-3 text-right font-medium">Becas</th>
                <th className="px-4 py-3 font-medium">Mi perfil</th>
                <th className="px-4 py-3 font-medium">Rol</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <span className="block font-medium">{u.email ?? "Sin email"}</span>
                    <span className="text-xs text-muted-foreground">
                      {u.name ? `${u.name} · ` : ""}
                      {u.verified ? "verificado" : "sin verificar"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{howTheyEnter(u)}</td>
                  <td className="px-4 py-3 tabular-nums">{date(u.createdAt)}</td>
                  <td className="px-4 py-3 tabular-nums">{date(u.lastActive)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{u.saved}</td>
                  <td className="px-4 py-3">{u.hasProfile ? "Sí" : "No"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className={u.role === "usuario" ? "text-muted-foreground" : "font-medium text-larimar"}>
                        {ROLE_LABEL[u.role]}
                      </span>
                      {data.role === "superadmin" && u.role !== "superadmin" && u.id !== data.me && u.email && (
                        <button
                          type="button"
                          disabled={busy === u.email}
                          onClick={() => setAdmin(u.email!, u.role !== "admin")}
                          className="rounded-full border px-3 py-1 text-xs hover:border-larimar hover:text-larimar disabled:opacity-50 disabled:hover:border-border disabled:hover:text-inherit"
                        >
                          {u.role === "admin" ? "Quitar admin" : "Hacer admin"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    {q ? "Ninguna cuenta coincide." : "Todavía no hay cuentas."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
