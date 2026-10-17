import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { AdminPanel } from "./panel";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6">
        <div className="flex max-w-3xl flex-col gap-3">
          <p className="eyebrow">Administración</p>
          <h1 className="font-display text-5xl tracking-tight md:text-6xl">Admin</h1>
        </div>
        <AdminPanel />
      </main>
      <SiteFooter />
    </>
  );
}
