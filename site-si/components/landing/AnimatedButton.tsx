"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface AnimatedButtonProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
  icon?: ReactNode;
}

export function AnimatedButton({
  children,
  href,
  onClick,
  variant = "primary",
  size = "md",
  className = "",
  icon,
}: AnimatedButtonProps) {
  const baseStyles =
    "relative overflow-hidden font-poppins font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-300";

  const variants = {
    primary: "bg-si-green text-white hover:shadow-lg hover:shadow-si-green/30",
    secondary: "bg-white/10 text-white border border-white/20 hover:bg-white/20",
    outline: "bg-transparent text-white border-2 border-si-green hover:bg-si-green/10",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  const content = (
    <>
      <motion.span
        className="absolute inset-0 bg-gradient-to-r from-si-green-light to-si-green opacity-0 hover:opacity-100"
        initial={{ x: "-100%" }}
        whileHover={{ x: 0 }}
        transition={{ duration: 0.3 }}
      />
      <span className="relative z-10 flex items-center gap-2">
        {children}
        {icon && <span className="inline-block">{icon}</span>}
      </span>
    </>
  );

  const motionProps = {
    whileHover: { scale: 1.02, y: -2 },
    whileTap: { scale: 0.98 },
    transition: { type: "spring" as const, stiffness: 400, damping: 17 },
  };

  const cls = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

  if (href) {
    return (
      <motion.a href={href} target="_blank" rel="noopener noreferrer" className={cls} {...motionProps}>
        {content}
      </motion.a>
    );
  }
  return (
    <motion.button type="button" onClick={onClick} className={cls} {...motionProps}>
      {content}
    </motion.button>
  );
}
