"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api, setToken } from "@/lib/api";
import { getStoredTheme, setStoredTheme, THEME_LABELS, type ThemeId } from "@/lib/theme";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<ThemeId>("default");

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  function handleThemeChange(t: ThemeId) {
    setStoredTheme(t);
    setTheme(t);
  }

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

  const darkLikeTheme = theme === "dark" || theme === "brand-blue";
  const logoSrc = darkLikeTheme ? "/logo/logo-branco.svg" : "/logo/logo-azul.svg";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-theme-page">
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <span className="text-sm text-theme-muted mr-1">Tema:</span>
        {(["default", "dark", "brand-blue"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => handleThemeChange(t)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium border transition"
            style={{
              color: theme === t ? "#ffffff" : (darkLikeTheme ? "var(--color-navbar-text-muted)" : "var(--color-navbar-text)"),
              backgroundColor: theme === t ? "var(--color-secondary)" : "transparent",
              borderColor: theme === t ? "var(--color-secondary)" : "var(--color-card-border)",
            }}
          >
            {THEME_LABELS[t]}
          </button>
        ))}
      </div>

      <Image
        src={logoSrc}
        alt="Soluções Inteligentes"
        width={240}
        height={24}
        className="h-10 w-auto mb-2"
        priority
      />
      <p className="text-body text-theme-muted mb-6">Minha área</p>

      <div className="w-full max-w-sm p-6 rounded-xl bg-theme-card border border-theme shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-theme mb-1">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-lg font-body bg-theme-card border-theme text-theme focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-theme mb-1">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-lg font-body bg-theme-card border-theme text-theme focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-medium disabled:opacity-50 bg-theme-cta hover:opacity-90"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>

      <Link href="/" className="mt-6 text-theme-primary underline text-sm">
        Voltar
      </Link>
    </main>
  );
}
