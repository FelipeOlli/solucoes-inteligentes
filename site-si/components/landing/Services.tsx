"use client";

import { motion } from "framer-motion";
import {
  Monitor,
  RefreshCw,
  Network,
  Headphones,
  Video,
  Zap,
  Bell,
  ArrowUpRight,
} from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

const services = [
  {
    icon: Monitor,
    title: "Manutenção de Notebooks e PCs",
    description: "Diagnóstico completo e reparo de hardware e software para garantir o melhor desempenho.",
    features: ["Limpeza interna", "Troca de peças", "Otimização"],
  },
  {
    icon: RefreshCw,
    title: "Upgrade e Formatação",
    description: "Aumente a velocidade com upgrades de memória, SSD e formatação profissional.",
    features: ["SSD NVMe", "Memória RAM", "Backup"],
  },
  {
    icon: Network,
    title: "Instalação de Redes",
    description: "Configuração de redes cabeadas e wireless com conectividade estável e segura.",
    features: ["Wi-Fi 6", "Cabeamento", "Roteadores"],
  },
  {
    icon: Headphones,
    title: "Suporte Técnico",
    description: "Atendimento ágil remoto ou presencial, resolvendo problemas com rapidez.",
    features: ["Remoto 24h", "Presencial", "Emergencial"],
  },
  {
    icon: Video,
    title: "Instalação de Câmeras",
    description: "Sistemas de segurança completo com monitoramento 24h e acesso remoto.",
    features: ["CFTV IP", "DVR/NVR", "App mobile"],
  },
  {
    icon: Zap,
    title: "Serviços Elétricos",
    description: "Instalações elétricas residenciais e comerciais com total segurança.",
    features: ["Instalações", "Reparos", "Laudos"],
  },
  {
    icon: Bell,
    title: "Porteiro Eletrônico",
    description: "Instalação de interfones e video porteiros para maior segurança.",
    features: ["Interfones", "Vídeo porteiro", "Controle"],
  },
];

export function Services() {
  return (
    <section id="services" className="relative py-24 overflow-hidden bg-primary">
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}
      />
      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <ScrollReveal direction="up">
            <span className="text-si-green font-poppins text-sm font-semibold tracking-[0.2em] uppercase">
              Nossos Serviços
            </span>
            <h2 className="font-titillium text-3xl sm:text-4xl lg:text-5xl font-bold text-white mt-3 mb-6">
              Serviços <span className="text-gradient">Especializados</span>
            </h2>
            <p className="font-poppins text-white/70 text-lg">
              A Soluções Inteligentes resolve para você. Oferecemos soluções completas em tecnologia com qualidade e profissionalismo.
            </p>
          </ScrollReveal>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <ScrollReveal key={index} direction="up" delay={index * 0.1}>
              <motion.div
                className="group relative h-full glass rounded-2xl p-6 overflow-hidden cursor-pointer border border-transparent hover:border-si-green/50 transition-all"
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-si-green/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <motion.div
                  className="relative w-14 h-14 bg-gradient-to-br from-si-green/30 to-si-green/10 rounded-xl flex items-center justify-center mb-5 group-hover:from-si-green/40 group-hover:to-si-green/20 transition-all"
                  whileHover={{ rotate: 5, scale: 1.1 }}
                >
                  <service.icon className="w-7 h-7 text-si-green" />
                </motion.div>
                <div className="relative">
                  <h3 className="font-titillium text-lg font-semibold text-white mb-3 group-hover:text-si-green transition-colors">
                    {service.title}
                  </h3>
                  <p className="font-poppins text-white/60 text-sm leading-relaxed mb-4">{service.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {service.features.map((feature, i) => (
                      <span key={i} className="text-xs font-poppins text-si-green/80 bg-si-green/10 px-2 py-1 rounded">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
                <motion.div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowUpRight className="w-5 h-5 text-si-green" />
                </motion.div>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>
        <ScrollReveal direction="up" delay={0.5}>
          <div className="mt-16 text-center">
            <p className="font-poppins text-white/70 mb-6">Precisa de um serviço personalizado? Entre em contato conosco!</p>
            <motion.a
              href="https://wa.me/5521965318993"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-si-green text-white font-poppins font-semibold px-8 py-4 rounded-xl"
              whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(25, 203, 150, 0.4)" }}
              whileTap={{ scale: 0.98 }}
            >
              Solicitar Orçamento Rápido
              <ArrowUpRight className="w-5 h-5" />
            </motion.a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
