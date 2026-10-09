"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Scissors } from "lucide-react";

/** Tarak (lucide'de bulunmadığı için özel SVG) */
function Comb({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="2" width="60" height="8" rx="3" />
      {Array.from({ length: 11 }, (_, i) => (
        <path key={i} d={`M${7 + i * 5} 10v11`} />
      ))}
    </svg>
  );
}

/** Düz ustura */
function Razor({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 14 L40 14 L44 8 L8 8 Z" />
      <path d="M44 11 H60 a2 2 0 0 1 0 4 H44" />
      <circle cx="52" cy="13" r="1.2" />
    </svg>
  );
}

/** Tıraş makinesi */
function Clipper({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 64" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8 4 H24 a2 2 0 0 1 2 2 V40 a6 6 0 0 1 -6 6 H12 a6 6 0 0 1 -6 -6 V6 a2 2 0 0 1 2 -2 Z" />
      <path d="M8 46 H24 V60 H8 Z" />
      <path d="M11 60v-4M15 60v-4M19 60v-4M23 60v-4" />
      <circle cx="16" cy="18" r="2.5" />
    </svg>
  );
}

const ITEMS = [
  { kind: "scissors", left: "6%", top: "14%", size: 54, dur: 9, delay: 0, rot: -25 },
  { kind: "comb", left: "86%", top: "20%", size: 78, dur: 11, delay: 1.2, rot: 18 },
  { kind: "razor", left: "14%", top: "46%", size: 76, dur: 12, delay: 0.6, rot: -12 },
  { kind: "clipper", left: "92%", top: "52%", size: 40, dur: 10, delay: 2, rot: 20 },
  { kind: "scissors", left: "78%", top: "74%", size: 44, dur: 13, delay: 0.3, rot: 35 },
  { kind: "comb", left: "4%", top: "78%", size: 70, dur: 14, delay: 1.8, rot: -20 },
  { kind: "razor", left: "50%", top: "90%", size: 66, dur: 11, delay: 2.6, rot: 8 },
  { kind: "clipper", left: "36%", top: "8%", size: 34, dur: 12, delay: 0.9, rot: -15 },
] as const;

/** Arka planda yavaşça süzülen makas / tarak / ustura / tıraş makinesi desenleri. */
export function FloatingTools() {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {ITEMS.map((it, i) => {
        const cls = "text-gold-400";
        const icon =
          it.kind === "scissors" ? (
            <Scissors size={it.size} strokeWidth={1.4} className={cls} />
          ) : it.kind === "comb" ? (
            <Comb className={cls} />
          ) : it.kind === "razor" ? (
            <Razor className={cls} />
          ) : (
            <Clipper className={cls} />
          );
        return (
          <motion.div
            key={i}
            className="absolute opacity-[0.07]"
            style={{
              left: it.left,
              top: it.top,
              width: it.kind === "scissors" ? it.size : it.kind === "clipper" ? it.size : it.size,
              rotate: it.rot,
            }}
            animate={
              reduce
                ? undefined
                : { y: [0, -26, 0], rotate: [it.rot, it.rot + 14, it.rot], x: [0, 10, 0] }
            }
            transition={{ duration: it.dur, delay: it.delay, repeat: Infinity, ease: "easeInOut" }}
          >
            {icon}
          </motion.div>
        );
      })}
    </div>
  );
}
