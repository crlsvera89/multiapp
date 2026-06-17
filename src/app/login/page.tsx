"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"idle" | "enviando" | "enviado" | "error">(
    "idle"
  );
  const [msg, setMsg] = useState("");

  async function enviarLink(e: React.FormEvent) {
    e.preventDefault();
    setEstado("enviando");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${
          process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
        }/auth/confirm`,
      },
    });
    if (error) {
      setEstado("error");
      setMsg(error.message);
    } else {
      setEstado("enviado");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border bg-white p-8 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-marca.png"
          alt="Ferretería Multicomercial"
          className="h-12 w-auto"
        />
        <p className="mt-3 text-sm text-gray-500">
          Gestión de Compras Ágiles y Licitaciones
        </p>

        {estado === "enviado" ? (
          <div className="mt-6 rounded-lg bg-green-50 p-4 text-sm text-green-800">
            Te enviamos un enlace de acceso a <strong>{email}</strong>. Revisa tu
            correo y haz clic para entrar.
          </div>
        ) : (
          <form onSubmit={enviarLink} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Correo
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.cl"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
            <button
              type="submit"
              disabled={estado === "enviando"}
              className="w-full rounded-lg bg-brand py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {estado === "enviando" ? "Enviando…" : "Enviar enlace de acceso"}
            </button>
            {estado === "error" && (
              <p className="text-sm text-red-600">{msg}</p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
