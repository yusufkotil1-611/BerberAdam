"use client";

import { motion } from "framer-motion";
import { CalendarPlus, Clock, Flame } from "lucide-react";
import type { MouseEvent } from "react";
import { useBooking } from "@/components/booking/BookingProvider";
import { ServiceIcon } from "@/components/ServiceIcon";
import { Reveal, SectionHeading } from "@/components/ui";
import { formatDuration, formatPrice } from "@/lib/time";
import type { Service, Staff } from "@/lib/types";

/** Kayan yazı bandı: hizmet adları */
export function Marquee({ items }: { items: string[] }) {
  const base = items.length ? items : ["Saç Kesimi", "Sakal Şekillendirme", "Cilt Bakımı", "VIP Paket"];
  const row = [...base, ...base, ...base, ...base];
  return (
    <div aria-hidden className="relative overflow-hidden border-y border-white/10 bg-ink-900/70 py-4 backdrop-blur">
      <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
        {[...row, ...row].map((t, i) => (
          <span key={i} className="flex items-center gap-10 font-display text-2xl font-medium uppercase tracking-[0.2em] text-ink-400">
            {t}
            <span className="text-gold-500">✂</span>
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-ink-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-ink-950 to-transparent" />
    </div>
  );
}

export function Services({ services }: { services: Service[] }) {
  const { openBooking } = useBooking();

  // Fareyi izleyen ışık efekti için CSS değişkenlerini güncelle
  const onMove = (e: MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <section id="hizmetler" className="relative z-10 scroll-mt-20 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Hizmetler & Fiyatlar"
          title="Ustalıkla"
          accent="Şekillenen Detaylar"
          description="Bir hizmet seç, randevu penceresi seçtiğin hizmetle hazır açılsın. Birden fazla hizmeti tek randevuda birleştirebilirsin."
        />

        {services.length === 0 ? (
          <p className="mt-14 text-center text-ink-300">Hizmet listesi yakında burada olacak.</p>
        ) : (
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s, i) => (
              <motion.article
                key={s.id}
                onMouseMove={onMove}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: (i % 3) * 0.1, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -8 }}
                className="glass spotlight group relative flex flex-col overflow-hidden rounded-3xl p-6 transition-shadow duration-500 hover:border-gold-500/40 hover:shadow-[0_20px_60px_rgba(242,195,90,0.12)]"
              >
                {s.popular && (
                  <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-neon-red/90 to-orange-500/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-[0_0_16px_rgba(255,61,90,0.5)]">
                    <Flame size={11} /> Çok Tercih Edilen
                  </span>
                )}

                <motion.div
                  whileHover={{ rotate: [0, -12, 12, -8, 0], scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                  className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-gold-300 to-gold-600 text-ink-950 shadow-[0_0_24px_rgba(242,195,90,0.35)]"
                >
                  <ServiceIcon name={s.icon} size={26} strokeWidth={2.2} />
                </motion.div>

                <h3 className="mt-5 font-display text-2xl font-semibold uppercase tracking-wide text-white">{s.name}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-300">{s.description}</p>

                <div className="mt-6 flex items-end justify-between border-t border-white/10 pt-5">
                  <div>
                    <p className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-ink-200">
                      <Clock size={13} className="text-gold-400" /> {formatDuration(s.duration)}
                    </p>
                    <p className="font-display text-4xl font-semibold text-gold-gradient">{formatPrice(s.price)}</p>
                  </div>
                  <button data-sfx="snip" onClick={() => openBooking([s.id])} className="btn-gold !px-5 !py-3 text-sm" aria-label={`${s.name} için randevu al`}>
                    <CalendarPlus size={17} /> Randevu Al
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        )}

        <Reveal className="mt-10 text-center text-sm text-ink-400">
          Fiyatlar bilgilendirme amaçlıdır; sakal/saç yoğunluğuna göre salonda küçük farklılıklar olabilir.
        </Reveal>
      </div>
    </section>
  );
}

export function Team({ staff }: { staff: Staff[] }) {
  const { openBooking } = useBooking();
  if (staff.length === 0) return null;
  return (
    <section id="ekip" className="relative z-10 scroll-mt-20 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading eyebrow="Ekibimiz" title="Ellerine" accent="Güvendiğin Ustalar" description="Randevu alırken dilediğin ustayı seçebilirsin." />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((m, i) => (
            <Reveal key={m.id} delay={i * 0.1}>
              <motion.div whileHover={{ y: -6 }} className="glass group flex items-center gap-5 rounded-3xl p-5 transition-colors hover:border-gold-500/40">
                <div className="relative">
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-gold-300 to-gold-600 opacity-60 blur-md transition group-hover:opacity-100" />
                  <div className="relative grid h-20 w-20 place-items-center rounded-full border-2 border-gold-400/70 bg-gradient-to-br from-ink-600 to-ink-800 font-display text-3xl font-semibold text-gold-300">
                    {m.name.trim().charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-xl font-semibold uppercase tracking-wide text-white">{m.name}</h3>
                  <p className="text-sm text-ink-300">{m.title || "Berber"}</p>
                  <button onClick={() => openBooking()} className="mt-2 text-xs font-semibold uppercase tracking-wider text-gold-400 hover:text-gold-200">
                    Randevu al →
                  </button>
                </div>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
