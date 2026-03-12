"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Phone, LogIn, Eye } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const navItems = [
  { label: "Início", id: "hero" },
  { label: "Sobre", id: "about" },
  { label: "Serviços", id: "services" },
  { label: "Contato", id: "contact" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled ? "bg-si-blue/90 backdrop-blur-xl shadow-2xl py-3" : "bg-transparent py-5"
        }`}
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-between">
          <Link href="/" className="flex items-center shrink-0">
            <Image
              src="/logo/logo-branco.svg"
              alt="Soluções Inteligentes"
              width={140}
              height={14}
              className="h-6 w-auto sm:h-7"
              priority
            />
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="px-5 py-2 text-white/80 hover:text-white font-poppins text-sm font-medium transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <Link
              href="/login"
              className="flex items-center gap-2 px-4 py-2 text-white/90 hover:text-white font-poppins text-sm font-medium"
            >
              <LogIn className="w-4 h-4" /> Área do dono
            </Link>
            <Link
              href="/acompanhar"
              className="flex items-center gap-2 px-4 py-2 text-white/90 hover:text-white font-poppins text-sm font-medium"
            >
              <Eye className="w-4 h-4" /> Acompanhar serviço
            </Link>
            <a
              href="https://wa.me/5521965318993"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-si-green text-white font-poppins font-semibold px-6 py-3 rounded-xl flex items-center gap-2 hover:opacity-90 transition"
            >
              <Phone className="w-4 h-4" /> Fale Conosco
            </a>
          </div>

          <button
            type="button"
            className="lg:hidden text-white p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-20 z-40 lg:hidden mx-4"
          >
            <div className="glass-strong rounded-2xl p-6 shadow-2xl">
              <div className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollTo(item.id)}
                    className="text-left text-white/80 hover:text-si-green font-poppins py-3 px-4 rounded-lg hover:bg-white/5"
                  >
                    {item.label}
                  </button>
                ))}
                <Link href="/login" className="py-3 px-4 text-white/80 hover:text-si-green font-poppins flex items-center gap-2">
                  <LogIn className="w-4 h-4" /> Área do dono
                </Link>
                <Link href="/acompanhar" className="py-3 px-4 text-white/80 hover:text-si-green font-poppins flex items-center gap-2">
                  <Eye className="w-4 h-4" /> Acompanhar serviço
                </Link>
                <a
                  href="https://wa.me/5521965318993"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 w-full bg-si-green text-white font-poppins font-semibold py-4 rounded-xl flex items-center justify-center gap-2"
                >
                  <Phone className="w-5 h-5" /> Fale Conosco
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
