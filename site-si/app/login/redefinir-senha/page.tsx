"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/api";
import { getStoredTheme, setStoredTheme, THEME_LABELS, type ThemeId } from "@/lib/theme";

const MIN_PASSWORD_LENGTH = 8;

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<"idle" | "success" | "error">("idle");
  const [errorText, setErrorText] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<ThemeId>("default");

  const tokenFromUrl = useCallback(() => searchParams.get("token") ?? "", [searchParams]);

  useEffect(() => {
    setTheme(getStoredTheme());
    setToken(tokenFromUrl());
  }, [tokenFromUrl]);

  function handleThemeChange(t: ThemeId) {
    setStoredTheme(t);
    setTheme(t);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("idle");
    setErrorText("");
    if (password.length < MIN_PASSWORD_LENGTH) {
      setMessage("error");
      setErrorText(`A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirm) {
      setMessage("error");
      setErrorText("As senhas não coincidem.");
      return;
    }
    if (!token.trim()) {
      setMessage("error");
      setErrorText("Link inválido. Solicite um novo link na página Esqueci a senha.");
      return;
    }
    setLoading(true);
    const { error: err, status } = await api<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: { token: token.trim(), password },
    });
    setLoading(false);
    if (err || status !== 200) {
      setMessage("error");
      setErrorText(
        status === 429
          ? "Muitas tentativas. Aguarde alguns minutos."
          : err?.message || "Não foi possível redefinir a senha. O link pode ter expirado."
      );
      return;
    }
    setMessage("success");
  }

  const darkLikeTheme = theme === "dark" || theme === "brand-blue";
  const logoSrc = darkLikeTheme ? "/logo/logo-branco.svg" : "/logo/logo-azul.svg";
  const hasToken = token.trim().length > 0;

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
      <p className="text-body text-theme-muted mb-6">Redefinir senha</p>

      <div className="w-full max-w-sm p-6 rounded-xl bg-theme-card border border-theme shadow-sm">
        {message === "success" ? (
          <div className="space-y-4">
            <p className="text-theme text-sm">Senha alterada com sucesso. Faça login com a nova senha.</p>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="w-full py-3 rounded-lg font-medium bg-theme-cta hover:opacity-90"
            >
              Ir para o login
            </button>
          </div>
        ) : !hasToken ? (
          <div className="space-y-4">
            <p className="text-theme text-sm">
              Link inválido ou sem token. Solicite um novo link na página &quot;Esqueci a senha&quot;.
            </p>
            <Link
              href="/login/esqueci-senha"
              className="block w-full py-3 rounded-lg font-medium text-center bg-theme-cta hover:opacity-90"
            >
              Solicitar novo link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-theme mb-1">
                Nova senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
                className="w-full px-4 py-2 border rounded-lg font-body bg-theme-card border-theme text-theme focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
              />
              <p className="text-xs text-theme-muted mt-1">Mínimo de {MIN_PASSWORD_LENGTH} caracteres.</p>
            </div>
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-theme mb-1">
                Confirmar senha
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
                className="w-full px-4 py-2 border rounded-lg font-body bg-theme-card border-theme text-theme focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
              />
            </div>
            {message === "error" && <p className="text-red-500 text-sm">{errorText}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-medium disabled:opacity-50 bg-theme-cta hover:opacity-90"
            >
              {loading ? "Salvando…" : "Redefinir senha"}
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
