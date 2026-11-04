/**
 * Junta classes Tailwind ignorando valores vazios.
 * Substitui clsx/tailwind-merge para não adicionar dependências.
 */
export function cn(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(" ");
}
