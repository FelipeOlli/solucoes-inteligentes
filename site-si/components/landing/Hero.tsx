"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowRight, CheckCircle, Sparkles } from "lucide-react";
import { AnimatedButton } from "./AnimatedButton";

const benefits = ["Tecnologia que simplifica", "Suporte especializado", "Atendimento ágil"];

export function Hero() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden bg-primary">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 glass rounded-full px-4 py-2"
            >
              <motion.span
                className="w-2 h-2 bg-si-green rounded-full"
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-white/80 font-poppins text-sm flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-si-green" /> Inovação que flui
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="font-titillium text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight"
            >
              Soluções de <span className="text-gradient">Tecnologia</span>
              <br />
              que Simplificam sua Vida
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="font-poppins text-lg text-white/70 max-w-xl leading-relaxed"
            >
              Inovação e tecnologia deveriam simplificar a vida e não ao contrário. A SI foi fundada para garantir que a
              inovação funcione para você, seu negócio e equipe.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <AnimatedButton
                href="https://wa.me/5521965318993"
                variant="primary"
                size="lg"
                icon={<ArrowRight className="w-5 h-5" />}
              >
                Solicitar Orçamento
              </AnimatedButton>
              <motion.button
                type="button"
                onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })}
                className="px-8 py-4 rounded-xl border-2 border-white/30 text-white font-poppins font-semibold hover:border-si-green hover:bg-si-green/10 transition-all"
              >
                Conhecer Serviços
              </motion.button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="flex flex-wrap gap-4 pt-4"
            >
              {benefits.map((benefit, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-si-green/20 flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-si-green" />
                  </div>
                  <span className="text-white/70 font-poppins text-sm">{benefit}</span>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="relative hidden lg:flex items-center justify-center"
          >
            <div className="relative min-w-[240px] px-10 py-12 glass-strong rounded-3xl flex items-center justify-center glow-green">
              <motion.div
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                className="flex items-center justify-center"
              >
                <Image
                  src="/logo/logo-branco-2.svg"
                  alt="Soluções Inteligentes"
                  width={212}
                  height={200}
                  className="max-h-44 w-auto max-w-full object-contain"
                  priority
                />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white/5 to-transparent" />
    </section>
  );
}
