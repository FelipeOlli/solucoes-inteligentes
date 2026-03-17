"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/api";
import { getStoredTheme, setStoredTheme, THEME_LABELS, type ThemeId } from "@/lib/theme";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<"idle" | "success" | "error">("idle");
  const [errorText, setErrorText] = useState("");
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
    setMessage("idle");
    setErrorText("");
    setLoading(true);
    const { data, error: err, status } = await api<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: { email: email.trim().toLowerCase() },
    });
    setLoading(false);
    if (err || status !== 200) {
      setMessage("error");
      setErrorText(
        status === 429
          ? "Muitas solicitações. Aguarde alguns minutos e tente novamente."
          : err?.message || "Não foi possível enviar o e-mail. Tente mais tarde."
      );
      return;
    }
    setMessage("success");
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
      <p className="text-body text-theme-muted mb-6">Esqueci a senha</p>

      <div className="w-full max-w-sm p-6 rounded-xl bg-theme-card border border-theme shadow-sm">
        {message === "success" ? (
          <div className="space-y-4">
            <p className="text-theme text-sm">
              Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha. Verifique também a pasta de spam.
            </p>
            <Link
              href="/login"
              className="block w-full py-3 rounded-lg font-medium text-center bg-theme-cta hover:opacity-90 text-white"
            >
              Voltar ao login
            </Link>
          </div>
        ) : (
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
                autoComplete="email"
                className="w-full px-4 py-2 border rounded-lg font-body bg-theme-card border-theme text-theme focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
              />
            </div>
            {message === "error" && <p className="text-red-500 text-sm">{errorText}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-medium disabled:opacity-50 bg-theme-cta hover:opacity-90"
            >
              {loading ? "Enviando…" : "Enviar link para redefinir senha"}
            </button>
          </form>
        )}
      </div>

      <Link href="/login" className="mt-6 text-theme-primary underline text-sm">
        Voltar ao login
      </Link>
    </main>
  );
}
