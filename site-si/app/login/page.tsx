"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api, setToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { data, error: err, status } = await api<{ token: string }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setLoading(false);
    if (err || !data?.token) {
      setError(status === 401 ? "E-mail ou senha inválidos." : (err?.message || "E-mail ou senha inválidos."));
      return;
    }
    setToken(data.token);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-brand-white">
      <Image
        src="/logo/logo-azul.svg"
        alt="Soluções Inteligentes"
        width={240}
        height={24}
        className="h-10 w-auto mb-2"
        priority
      />
      <p className="text-body text-secondary mb-6">Área do dono</p>
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-brand-black mb-1">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-400 rounded-lg font-body bg-white text-black placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-primary"
            style={{ color: "#000000" }}
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-brand-black mb-1">
            Senha
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-400 rounded-lg font-body bg-white text-black placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-primary"
            style={{ color: "#000000" }}
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
      <Link href="/" className="mt-6 text-primary underline text-sm">
        Voltar
      </Link>
    </main>
  );
}
