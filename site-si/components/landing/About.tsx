"use client";

import { motion } from "framer-motion";
import { Target, Lightbulb, Heart, TrendingUp, Users, Award, Shield, Clock } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

const values = [
  { icon: Lightbulb, title: "Inovação", description: "Tecnologia de ponta para simplificar seu dia a dia", color: "from-yellow-500/20 to-orange-500/20" },
  { icon: Target, title: "Foco", description: "Soluções personalizadas para suas necessidades", color: "from-blue-500/20 to-cyan-500/20" },
  { icon: Heart, title: "Compromisso", description: "Dedicação total à satisfação dos nossos clientes", color: "from-red-500/20 to-pink-500/20" },
  { icon: TrendingUp, title: "Crescimento", description: "Parceria para o sucesso do seu negócio", color: "from-green-500/20 to-emerald-500/20" },
];

const stats = [
  { value: "500+", label: "Clientes Atendidos", icon: Users },
  { value: "1000+", label: "Projetos Realizados", icon: Award },
  { value: "100%", label: "Satisfação", icon: Shield },
  { value: "5+", label: "Anos de Experiência", icon: Clock },
];

export function About() {
  return (
    <section id="about" className="relative py-24 overflow-hidden bg-primary">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-si-green/5 to-transparent" />
      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <ScrollReveal direction="left">
              <span className="text-si-green font-poppins text-sm font-semibold tracking-[0.2em] uppercase">Quem Somos</span>
              <h2 className="font-titillium text-3xl sm:text-4xl lg:text-5xl font-bold text-white mt-3 leading-tight">
                Inovação que se adapta às <span className="text-gradient">suas necessidades</span>
              </h2>
            </ScrollReveal>
            <div className="space-y-6">
              <ScrollReveal direction="left" delay={0.2}>
                <p className="font-poppins text-white/70 text-lg leading-relaxed">
                  A <strong className="text-white">Soluções Inteligentes</strong> foi fundada com uma missão clara: garantir que a inovação tecnológica funcione para você, seu negócio e sua equipe.
                </p>
              </ScrollReveal>
              <ScrollReveal direction="left" delay={0.3}>
                <p className="font-poppins text-white/70 text-lg leading-relaxed">
                  Imagine soluções de negócio que facilitem seu trabalho enquanto você aproveita mais a vida. Com tecnologia fácil de aprender e de usar, você tem seu valioso tempo de volta.
                </p>
              </ScrollReveal>
              <ScrollReveal direction="left" delay={0.4}>
                <p className="font-poppins text-white/70 text-lg leading-relaxed">
                  Assim você pode se concentrar no que realmente importa. Faça seu negócio crescer com a SI.{" "}
                  <span className="text-si-green font-semibold">Inovação que flui.</span>
                </p>
              </ScrollReveal>
            </div>
            <ScrollReveal direction="up" delay={0.5}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6">
                {stats.map((stat, index) => (
                  <motion.div
                    key={index}
                    className="text-center p-4 glass rounded-xl"
                    whileHover={{ scale: 1.05, y: -5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <stat.icon className="w-6 h-6 text-si-green mx-auto mb-2" />
                    <p className="font-titillium text-3xl font-bold text-white">{stat.value}</p>
                    <p className="font-poppins text-white/50 text-xs mt-1">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </ScrollReveal>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {values.map((value, index) => (
              <ScrollReveal key={index} direction="right" delay={index * 0.15}>
                <motion.div
                  className="group relative overflow-hidden glass rounded-2xl p-6 hover:border-si-green/50 transition-all duration-500"
                  whileHover={{ scale: 1.02, y: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${value.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  <div className="relative z-10">
                    <motion.div className="w-14 h-14 bg-si-green/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-si-green/30 transition-colors" whileHover={{ rotate: 5 }}>
                      <value.icon className="w-7 h-7 text-si-green" />
                    </motion.div>
                    <h3 className="font-titillium text-xl font-semibold text-white mb-2">{value.title}</h3>
                    <p className="font-poppins text-white/60 text-sm">{value.description}</p>
                  </div>
                </motion.div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
