import type { Config } from "tailwindcss";

// Marca Soluções Inteligentes - Manual de Marca
// Azul #122969 | Verde #19cb96 | Preto #050006 | Branco
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#122969",
        secondary: "#19cb96",
        brand: {
          black: "#050006",
          white: "#ffffff",
          // Design system da "minha área" (admin) — tokens em app/globals.css,
          // em RGB para que os modificadores de opacidade do Tailwind funcionem.
          DEFAULT: "rgb(var(--si-brand) / <alpha-value>)",
          hover: "rgb(var(--si-brand-hover) / <alpha-value>)",
          fg: "rgb(var(--si-brand-fg) / <alpha-value>)",
        },
        si: {
          blue: "#122969",
          "blue-dark": "#0a1a45",
          "blue-light": "#1a3a7a",
          green: "#19cb96",
          "green-dark": "#12a67a",
          "green-light": "#2ee5ad",
          black: "#050006",
        },
        surface: "rgb(var(--si-surface) / <alpha-value>)",
        "surface-subtle": "rgb(var(--si-surface-subtle) / <alpha-value>)",
        "surface-hover": "rgb(var(--si-surface-hover) / <alpha-value>)",
        line: "rgb(var(--si-line) / <alpha-value>)",
        ink: "rgb(var(--si-ink) / <alpha-value>)",
        "ink-muted": "rgb(var(--si-ink-muted) / <alpha-value>)",
        accent: {
          DEFAULT: "rgb(var(--si-accent) / <alpha-value>)",
          hover: "rgb(var(--si-accent-hover) / <alpha-value>)",
          fg: "rgb(var(--si-accent-fg) / <alpha-value>)",
        },
        warn: {
          DEFAULT: "rgb(var(--si-warn) / <alpha-value>)",
          bg: "rgb(var(--si-warn-bg) / <alpha-value>)",
        },
      },
      fontFamily: {
        heading: ["Titillium Web", "sans-serif"],
        body: ["Poppins", "sans-serif"],
        titillium: ["Titillium Web", "sans-serif"],
        poppins: ["Poppins", "sans-serif"],
      },
      // Design system da "minha área" (admin) — ver app/globals.css
      borderRadius: {
        control: "var(--radius-control)",
        card: "var(--radius-card)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        brand: "var(--shadow-brand)",
      },
    },
  },
  plugins: [],
};

export default config;
