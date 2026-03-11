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
        brand: { black: "#050006", white: "#ffffff" },
        si: {
          blue: "#122969",
          "blue-dark": "#0a1a45",
          "blue-light": "#1a3a7a",
          green: "#19cb96",
          "green-dark": "#12a67a",
          "green-light": "#2ee5ad",
          black: "#050006",
        },
      },
      fontFamily: {
        heading: ["Titillium Web", "sans-serif"],
        body: ["Poppins", "sans-serif"],
        titillium: ["Titillium Web", "sans-serif"],
        poppins: ["Poppins", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
