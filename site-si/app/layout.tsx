import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Soluções Inteligentes",
  description: "Inovação que flui - Acompanhamento de serviços",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

const themeScript = `
(function(){
  var t = localStorage.getItem('si_theme');
  if (t === 'dark' || t === 'brand-blue' || t === 'default') document.documentElement.setAttribute('data-theme', t);
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
