"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Phone, Instagram, Heart, ArrowUp } from "lucide-react";

const navLinks = [
  { label: "Início", id: "hero" },
  { label: "Sobre", id: "about" },
  { label: "Serviços", id: "services" },
  { label: "Contato", id: "contact" },
];

const services = [
  "Manutenção de PCs",
  "Instalação de Redes",
  "CFTV",
  "Suporte Técnico",
  "Serviços Elétricos",
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="relative bg-si-black border-t border-white/10">
      <div className="absolute -top-6 inset-x-0 flex justify-center pointer-events-none">
        <motion.button
          type="button"
          onClick={scrollToTop}
          className="w-12 h-12 bg-si-green rounded-full flex items-center justify-center shadow-lg shadow-si-green/30 pointer-events-auto"
          whileHover={{ scale: 1.08, y: -4 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowUp className="w-5 h-5 text-white" />
        </motion.button>
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12">
          <div className="space-y-6">
            <motion.div className="flex items-center" whileHover={{ scale: 1.02 }}>
              <Image
                src="/logo/logo-branco.svg"
                alt="Soluções Inteligentes"
                width={200}
                height={20}
                className="h-10 w-auto"
              />
            </motion.div>
            <p className="font-poppins text-white/60 text-sm leading-relaxed">
              Inovação que flui. Soluções tecnológicas que simplificam sua vida e impulsionam seu negócio.
            </p>
            <div className="flex gap-3">
              <motion.a
                href="https://wa.me/5521965318993"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 glass rounded-lg flex items-center justify-center hover:bg-si-green/20 transition-all"
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Phone className="w-5 h-5 text-si-green" />
              </motion.a>
              <motion.a
                href="https://www.instagram.com/solucoesinteligentes_si/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 glass rounded-lg flex items-center justify-center hover:bg-si-green/20 transition-all"
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Instagram className="w-5 h-5 text-si-green" />
              </motion.a>
            </div>
          </div>

          <div>
            <h4 className="font-titillium text-white font-semibold text-lg mb-6">Navegação</h4>
            <ul className="space-y-3">
              {navLinks.map((link) => (
                <li key={link.id}>
                  <button
                    type="button"
                    onClick={() => scrollToSection(link.id)}
                    className="font-poppins text-white/60 hover:text-si-green text-sm transition-colors flex items-center gap-2 group"
                  >
                    <span className="w-0 h-px bg-si-green group-hover:w-3 transition-all" />
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-titillium text-white font-semibold text-lg mb-6">Serviços</h4>
            <ul className="space-y-3">
              {services.map((s, i) => (
                <li key={i} className="font-poppins text-white/60 text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-si-green rounded-full" />
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-titillium text-white font-semibold text-lg mb-6">Contato</h4>
            <div className="space-y-4">
              <div>
                <p className="font-poppins text-white/40 text-xs mb-1">WhatsApp</p>
                <motion.a
                  href="https://wa.me/5521965318993"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-poppins text-white/80 hover:text-si-green text-sm transition-colors flex items-center gap-2"
                  whileHover={{ x: 5 }}
                >
                  <Phone className="w-4 h-4" />
                  (21) 96531-8993
                </motion.a>
              </div>
              <div>
                <p className="font-poppins text-white/40 text-xs mb-1">Instagram</p>
                <motion.a
                  href="https://www.instagram.com/solucoesinteligentes_si/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-poppins text-white/80 hover:text-si-green text-sm transition-colors flex items-center gap-2"
                  whileHover={{ x: 5 }}
                >
                  <Instagram className="w-4 h-4" />
                  @solucoesinteligentes_si
                </motion.a>
              </div>
              <div>
                <p className="font-poppins text-white/40 text-xs mb-1">Localização</p>
                <p className="font-poppins text-white/80 text-sm flex items-center gap-2">
                  <span className="w-4 h-4 flex items-center justify-center">📍</span>
                  Rio de Janeiro - RJ
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-white/10">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="font-poppins text-white/40 text-sm text-center sm:text-left">
              © {currentYear} Soluções Inteligentes. Todos os direitos reservados.
            </p>
            <p className="font-poppins text-white/40 text-sm flex items-center gap-1">
              Feito com{" "}
              <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                <Heart className="w-4 h-4 text-si-green fill-si-green inline" />
              </motion.span>{" "}
              para você
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
