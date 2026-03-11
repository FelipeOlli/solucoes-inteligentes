"use client";

import { motion } from "framer-motion";
import { Phone, Instagram, MapPin, Clock, MessageCircle, Send } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";
import { AnimatedButton } from "./AnimatedButton";

const contactInfo = [
  { icon: Phone, title: "WhatsApp", value: "(21) 96531-8993", href: "https://wa.me/5521965318993", color: "from-green-500/20 to-emerald-500/20" },
  { icon: Instagram, title: "Instagram", value: "@solucoesinteligentes_si", href: "https://www.instagram.com/solucoesinteligentes_si/", color: "from-pink-500/20 to-purple-500/20" },
  { icon: Clock, title: "Horário", value: "Seg - Sex: 8h às 18h", href: null, color: "from-blue-500/20 to-cyan-500/20" },
  { icon: MapPin, title: "Localização", value: "Rio de Janeiro - RJ", href: null, color: "from-orange-500/20 to-red-500/20" },
];

const trustBadges = [
  { title: "Atendimento", subtitle: "Personalizado" },
  { title: "Suporte", subtitle: "Especializado" },
  { title: "Garantia", subtitle: "Em Todos os Serviços" },
  { title: "Qualidade", subtitle: "Garantida" },
];

export function Contact() {
  return (
    <section id="contact" className="relative py-24 overflow-hidden bg-primary">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-si-green/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-si-green/5 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-12">
        <ScrollReveal direction="up">
          <div className="glass-strong rounded-3xl p-8 sm:p-12 lg:p-16 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-si-green/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/50 rounded-full blur-3xl" />
            <div className="relative grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <span className="inline-flex items-center gap-2 bg-si-green/10 text-si-green font-poppins text-sm font-semibold px-4 py-2 rounded-full">
                  <Send className="w-4 h-4" /> Entre em Contato
                </span>
                <h2 className="font-titillium text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
                  Pronto para <span className="text-gradient">transformar</span> seu negócio?
                </h2>
                <p className="font-poppins text-white/70 text-lg">
                  Entre em contato conosco e descubra como podemos ajudar sua empresa a crescer com soluções tecnológicas inteligentes.
                </p>
                <p className="font-poppins text-si-green font-semibold text-lg">Orçamento rápido e sem compromisso!</p>
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <AnimatedButton href="https://wa.me/5521965318993" variant="primary" size="lg" icon={<MessageCircle className="w-5 h-5" />}>
                    Falar no WhatsApp
                  </AnimatedButton>
                  <AnimatedButton
                    href="https://www.instagram.com/solucoesinteligentes_si/"
                    variant="outline"
                    size="lg"
                    icon={<Instagram className="w-5 h-5" />}
                  >
                    Seguir no Instagram
                  </AnimatedButton>
                </div>
              </div>
              <div className="space-y-4">
                {contactInfo.map((item, index) => (
                  <ScrollReveal key={index} direction="right" delay={index * 0.1}>
                    <motion.div
                      className="flex items-center gap-4 glass rounded-xl p-4 hover:border-si-green/30 transition-all cursor-pointer group"
                      whileHover={{ scale: 1.02, x: 5 }}
                    >
                      <div className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <item.icon className="w-6 h-6 text-si-green" />
                      </div>
                      <div>
                        <p className="font-poppins text-white/60 text-sm">{item.title}</p>
                        {item.href ? (
                          <a href={item.href} target="_blank" rel="noopener noreferrer" className="font-poppins text-white font-semibold hover:text-si-green transition-colors">
                            {item.value}
                          </a>
                        ) : (
                          <p className="font-poppins text-white font-semibold">{item.value}</p>
                        )}
                      </div>
                      <Send className="w-4 h-4 text-si-green ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>
        <ScrollReveal direction="up" delay={0.3}>
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6">
            {trustBadges.map((badge, index) => (
              <motion.div
                key={index}
                className="text-center p-6 glass rounded-xl"
                whileHover={{ scale: 1.05, y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <p className="font-titillium text-2xl font-bold text-white mb-1">{badge.title}</p>
                <p className="font-poppins text-si-green text-sm">{badge.subtitle}</p>
              </motion.div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
