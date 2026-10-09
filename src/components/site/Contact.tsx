"use client";

import { motion } from "framer-motion";
import { Clock, MapPin, MessageCircle, Navigation, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { Reveal, SectionHeading } from "@/components/ui";
import { getOpenStatus, type OpenStatus } from "@/lib/open-status";
import { MAPS_DIRECTIONS_URL, MAPS_EMBED_URL, MAPS_VIEW_URL, SITE, WEEKDAYS_TR, whatsappLink } from "@/lib/site";
import { shopNow } from "@/lib/time";
import type { WorkingHour } from "@/lib/types";

export function Contact({ hours }: { hours: WorkingHour[] }) {
  const [status, setStatus] = useState<OpenStatus | null>(null);
  const [today, setToday] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      setStatus(getOpenStatus(hours));
      setToday(shopNow().weekday);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [hours]);

  // Pazartesi'den başlayan sıra
  const ordered = [1, 2, 3, 4, 5, 6, 0].map((wd) => hours.find((h) => h.weekday === wd)).filter((h): h is WorkingHour => !!h);

  return (
    <section id="iletisim" className="relative z-10 scroll-mt-20 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading eyebrow="İletişim" title="Bize" accent="Ulaşın" description="Arayın, WhatsApp'tan yazın ya da doğrudan dükkana uğrayın." />

        <div className="mt-14 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid content-start gap-4">
            {/* Telefon */}
            <Reveal className="glass rounded-3xl p-6">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gold-400/15 text-gold-300">
                  <Phone size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Telefon</p>
                  <a href={SITE.phoneTel} className="font-display text-3xl font-semibold tracking-wide text-white transition hover:text-gold-300">
                    {SITE.phoneDisplay}
                  </a>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <a href={SITE.phoneTel} className="btn-gold !px-5 !py-3 text-sm">
                      <Phone size={17} /> Hemen Ara
                    </a>
                    <a href={whatsappLink("Merhaba BERBERADAM, randevu / bilgi almak istiyorum.")} target="_blank" rel="noopener noreferrer" className="btn-ghost !px-5 !py-3 text-sm">
                      <MessageCircle size={17} className="text-neon-green" /> WhatsApp Randevu / Destek
                    </a>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Adres */}
            <Reveal delay={0.08} className="glass rounded-3xl p-6">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gold-400/15 text-gold-300">
                  <MapPin size={22} />
                </span>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Adres</p>
                  <address className="mt-1 not-italic leading-relaxed text-white">{SITE.address}</address>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <a href={MAPS_DIRECTIONS_URL} target="_blank" rel="noopener noreferrer" className="btn-gold !px-5 !py-3 text-sm">
                      <Navigation size={17} /> Yol Tarifi Al
                    </a>
                    <a href={MAPS_VIEW_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost !px-5 !py-3 text-sm">
                      Haritada Aç
                    </a>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Çalışma saatleri */}
            <Reveal delay={0.16} className="glass rounded-3xl p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold-400/15 text-gold-300">
                    <Clock size={22} />
                  </span>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Çalışma Saatleri</p>
                </div>
                {status && (
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${status.open ? "bg-neon-green/15 text-neon-green" : "bg-neon-red/15 text-red-300"}`}>
                    <span className={`h-2 w-2 rounded-full ${status.open ? "animate-pulse bg-neon-green" : "bg-neon-red"}`} />
                    {status.label} · {status.detail}
                  </span>
                )}
              </div>
              <ul className="divide-y divide-white/5 text-sm">
                {ordered.map((h) => {
                  const isToday = today === h.weekday;
                  return (
                    <li key={h.weekday} className={`flex items-center justify-between py-2.5 ${isToday ? "font-semibold text-gold-300" : "text-ink-200"}`}>
                      <span className="flex items-center gap-2">
                        {isToday && <motion.span layoutId="today-dot" className="h-1.5 w-1.5 rounded-full bg-gold-400 shadow-[0_0_8px_rgba(242,195,90,0.9)]" />}
                        {WEEKDAYS_TR[h.weekday]}
                      </span>
                      <span className={h.isOpen ? "" : "text-ink-500"}>{h.isOpen ? `${h.openTime} - ${h.closeTime}` : "Kapalı"}</span>
                    </li>
                  );
                })}
              </ul>
            </Reveal>
          </div>

          {/* Harita */}
          <Reveal delay={0.1} className="h-full">
            <div className="relative h-full min-h-[420px] overflow-hidden rounded-3xl border border-gold-500/30 shadow-[0_30px_80px_rgba(0,0,0,0.5),0_0_50px_rgba(242,195,90,0.1)]">
              <iframe
                title="BERBERADAM konumu - Google Haritalar"
                src={MAPS_EMBED_URL}
                className="absolute inset-0 h-full w-full border-0 [filter:grayscale(0.85)_invert(0.92)_contrast(0.9)_hue-rotate(180deg)]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
              <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10" />
              <a
                href={MAPS_DIRECTIONS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold absolute bottom-4 left-4 !px-5 !py-3 text-sm"
              >
                <Navigation size={17} /> Yol Tarifi Al
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
