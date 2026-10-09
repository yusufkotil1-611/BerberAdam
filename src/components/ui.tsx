"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { Scissors, Star } from "lucide-react";
import type { ReactNode } from "react";

/** Kaydırdıkça yumuşakça beliren sarmalayıcı (Framer Motion whileInView) */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
  ...rest
}: { children: ReactNode; delay?: number; y?: number; className?: string } & Omit<HTMLMotionProps<"div">, "children">) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Bölüm başlığı: küçük üst etiket + büyük başlık + açıklama */
export function SectionHeading({
  eyebrow,
  title,
  accent,
  description,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  description?: string;
  align?: "center" | "left";
}) {
  return (
    <Reveal className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <div className={`mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-gold-400 ${align === "center" ? "justify-center" : ""}`}>
        <span className="h-px w-8 bg-gold-500/60" />
        {eyebrow}
        <span className={`h-px w-8 bg-gold-500/60 ${align === "center" ? "" : "hidden"}`} />
      </div>
      <h2 className="font-display text-4xl font-semibold uppercase leading-[1.05] text-white sm:text-5xl">
        {title} {accent && <span className="text-gold-gradient">{accent}</span>}
      </h2>
      {description && <p className="mt-4 text-base leading-relaxed text-ink-300 sm:text-lg">{description}</p>}
    </Reveal>
  );
}

/** Logo: makas ikonu + BERBERADAM */
export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const big = size === "lg";
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={`relative grid place-items-center rounded-xl bg-gradient-to-br from-gold-300 to-gold-600 text-ink-950 shadow-[0_0_18px_rgba(242,195,90,0.4)] ${big ? "h-12 w-12" : "h-10 w-10"}`}
      >
        <Scissors size={big ? 24 : 20} strokeWidth={2.4} className="-rotate-45" />
      </span>
      <span className={`font-display font-bold uppercase text-white ${big ? "text-3xl tracking-[0.12em]" : "text-lg tracking-[0.08em] sm:text-xl sm:tracking-[0.12em]"}`}>
        BERBER<span className="text-gold-gradient">ADAM</span>
      </span>
    </span>
  );
}

/** Yıldız gösterimi (salt okunur) */
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`5 üzerinden ${value} puan`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= Math.round(value) ? "fill-gold-400 text-gold-400" : "text-ink-500"}
          strokeWidth={1.6}
        />
      ))}
    </span>
  );
}

/** Dönen berber direği çubuğu (konumlandırma sınıfı — absolute/relative — çağıran tarafından verilmelidir) */
export function BarberPole({ className = "" }: { className?: string }) {
  return (
    <div className={`overflow-hidden rounded-full border border-white/20 shadow-[0_0_24px_rgba(255,61,90,0.35),0_0_24px_rgba(61,139,255,0.3)] ${className}`}>
      <div className="pole absolute inset-0" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-transparent to-black/55" />
    </div>
  );
}
