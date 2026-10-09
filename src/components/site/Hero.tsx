"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { CalendarCheck, ChevronDown, Clock, MessageCircle, Scissors, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useBooking } from "@/components/booking/BookingProvider";
import { BarberPole } from "@/components/ui";
import { getOpenStatus, summarizeHours, type OpenStatus } from "@/lib/open-status";
import { whatsappLink } from "@/lib/site";
import type { WorkingHour } from "@/lib/types";

const WORDS = ["Stilini", "Ustalara", "Emanet", "Et"];

export function Hero({ hours, rating }: { hours: WorkingHour[]; rating: { average: number; count: number } }) {
  const { openBooking } = useBooking();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const yText = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const yArt = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const [status, setStatus] = useState<OpenStatus | null>(null);
  useEffect(() => {
    setStatus(getOpenStatus(hours));
    const id = setInterval(() => setStatus(getOpenStatus(hours)), 60_000);
    return () => clearInterval(id);
  }, [hours]);

  return (
    <section id="top" ref={ref} className="relative isolate flex min-h-[100svh] items-center overflow-hidden pt-28 pb-20">
      {/* Arka plan ışıkları */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute -right-40 top-10 h-[560px] w-[560px] rounded-full bg-gold-500/15 blur-[120px]" />
        <div className="absolute -left-40 bottom-0 h-[460px] w-[460px] rounded-full bg-neon-blue/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      </div>

      <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.15fr_0.85fr]">
        <motion.div style={{ y: yText, opacity: fade }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6 inline-flex flex-wrap items-center gap-3"
          >
            <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">
              <Scissors size={14} /> Erenler · Sakarya
            </span>
            {status && (
              <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-ink-100">
                <span className="relative flex h-2.5 w-2.5">
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${status.open ? "bg-neon-green" : "bg-neon-red"}`} />
                  <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${status.open ? "bg-neon-green" : "bg-neon-red"}`} />
                </span>
                {status.label} · <span className="text-ink-300">{status.detail}</span>
              </span>
            )}
          </motion.div>

          <h1 className="font-display text-[clamp(3rem,9vw,6.5rem)] font-bold uppercase leading-[0.95] tracking-tight text-white">
            {WORDS.map((w, i) => (
              <span key={w} className="mr-[0.25em] inline-block overflow-hidden align-bottom">
                <motion.span
                  className={`inline-block ${i === 2 ? "text-gold-gradient" : ""}`}
                  initial={{ y: "110%", rotate: 4 }}
                  animate={{ y: 0, rotate: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                >
                  {w}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.7 }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-ink-200"
          >
            <span className="font-serif-italic text-gold-300">BERBERADAM</span>&apos;da keskin hatlar, temiz işçilik ve premium bir deneyim seni bekliyor. Birkaç tıkla online randevunu al, sıra bekleme.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05 }} className="mt-9 flex flex-wrap gap-3">
            <button onClick={() => openBooking()} className="btn-gold !px-8 !py-4 text-base">
              <CalendarCheck size={20} /> Hemen Randevu Al
            </button>
            <a href={whatsappLink("Merhaba BERBERADAM, randevu almak istiyorum.")} target="_blank" rel="noopener noreferrer" className="btn-ghost !px-7 !py-4 text-base">
              <MessageCircle size={20} className="text-neon-green" /> WhatsApp
            </a>
          </motion.div>

          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
            className="mt-12 grid max-w-xl grid-cols-1 gap-4 text-sm sm:grid-cols-3"
          >
            <Fact icon={<Clock size={18} />} title="Çalışma Saatleri" value={summarizeHours(hours).split(" · ")[0] || "Bizi arayın"} />
            <Fact icon={<CalendarCheck size={18} />} title="Online Randevu" value="7/24 açık" />
            <Fact
              icon={<Star size={18} className="fill-gold-400" />}
              title="Müşteri Puanı"
              value={rating.count > 0 ? `${rating.average.toFixed(1)} / 5 (${rating.count} yorum)` : "İlk yorumu sen yaz"}
            />
          </motion.dl>
        </motion.div>

        {/* Sağ taraf: dönen madalyon + berber direği */}
        <motion.div style={{ y: yArt }} className="relative mx-auto hidden aspect-square w-full max-w-[460px] lg:block" aria-hidden>
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          >
            <svg viewBox="0 0 400 400" className="h-full w-full">
              <defs>
                <path id="circlePath" d="M200,200 m-165,0 a165,165 0 1,1 330,0 a165,165 0 1,1 -330,0" />
              </defs>
              <circle cx="200" cy="200" r="190" fill="none" stroke="rgba(242,195,90,0.25)" strokeWidth="1" strokeDasharray="2 8" />
              <text fill="#f2c35a" fontSize="21" letterSpacing="9" fontFamily="var(--font-display)" fontWeight="500">
                <textPath href="#circlePath">BERBERADAM ✂ USTALIK ✂ STİL ✂ BAKIM ✂ DETAY ✂</textPath>
              </text>
            </svg>
          </motion.div>

          <div className="absolute inset-[16%] rounded-full border border-gold-500/40 bg-gradient-to-br from-ink-700/80 to-ink-900/90 shadow-[0_0_80px_rgba(242,195,90,0.25),inset_0_0_60px_rgba(0,0,0,0.6)]" />
          <motion.div
            className="absolute inset-0 grid place-items-center"
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="text-center">
              <motion.div animate={{ rotate: [-45, -30, -45] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }} className="inline-block">
                <Scissors size={96} strokeWidth={1.4} className="text-gold-300 drop-shadow-[0_0_24px_rgba(242,195,90,0.8)]" />
              </motion.div>
              <p className="neon-text font-display mt-3 animate-pulse text-3xl font-semibold uppercase tracking-[0.25em]">Barber</p>
              <p className="mt-1 text-xs uppercase tracking-[0.5em] text-ink-300">est. Sakarya</p>
            </div>
          </motion.div>

          <BarberPole className="absolute -right-6 top-[12%] h-[76%] w-8" />
          <BarberPole className="absolute -left-6 top-[22%] h-[56%] w-6 opacity-80" />
        </motion.div>
      </div>

      <motion.a
        href="#hizmetler"
        aria-label="Aşağı kaydır"
        style={{ opacity: fade }}
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-[11px] uppercase tracking-[0.3em] text-ink-400 hover:text-gold-300 sm:flex"
      >
        Keşfet
        <motion.span animate={{ y: [0, 6, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>
          <ChevronDown size={18} />
        </motion.span>
      </motion.a>
    </section>
  );
}

function Fact({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <dt className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-gold-400">
        {icon} {title}
      </dt>
      <dd className="text-sm font-medium leading-snug text-white">{value}</dd>
    </div>
  );
}

