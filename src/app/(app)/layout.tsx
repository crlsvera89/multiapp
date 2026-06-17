import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/compras-agiles", label: "Compras Ágiles" },
  { href: "/licitaciones", label: "Licitaciones" },
  { href: "/calendario", label: "Calendario" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col border-r bg-white">
        <div className="border-b px-4 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-marca.png"
            alt="Ferretería Multicomercial"
            className="h-9 w-auto"
          />
          <p className="mt-1 text-xs text-gray-400">Gestión ChileCompra</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-3">
          <p className="truncate px-3 pb-2 text-xs text-gray-400">
            {user?.email}
          </p>
          <form action="/auth/signout" method="post">
            <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden p-8">{children}</main>
    </div>
  );
}
