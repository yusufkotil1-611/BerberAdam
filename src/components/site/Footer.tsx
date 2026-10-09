"use client";

import { motion } from "framer-motion";
import { CalendarCheck, MapPin, MessageCircle, Phone } from "lucide-react";
import { useBooking } from "@/components/booking/BookingProvider";
import { Logo } from "@/components/ui";
import { MAPS_DIRECTIONS_URL, SITE, whatsappLink } from "@/lib/site";

export function Footer({ showAdminLink = true }: { showAdminLink?: boolean }) {
  const { openBooking } = useBooking();
  return (
    <footer className="relative z-10 border-t border-white/10 bg-ink-950/80 pb-28 pt-14 backdrop-blur sm:pb-10">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 md:grid-cols-3">
        <div>
          <Logo size="lg" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-300">{SITE.description}</p>
        </div>

        <nav aria-label="Alt menü" className="text-sm">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">Hızlı Bağlantılar</p>
          <ul className="grid grid-cols-2 gap-2 text-ink-300">
            {[["#hizmetler", "Hizmetler"], ["#ekip", "Ekibimiz"], ["#galeri", "Önce / Sonra"], ["#sadakat", "Sadakat Programı"], ["#yorumlar", "Yorumlar"], ["#iletisim", "İletişim"]].map(([href, label]) => (
              <li key={href}>
                <a href={href} className="transition hover:text-gold-300">{label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="text-sm">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">İletişim</p>
          <ul className="space-y-3 text-ink-300">
            <li>
              <a href={SITE.phoneTel} className="inline-flex items-center gap-2 transition hover:text-gold-300"><Phone size={16} className="text-gold-400" /> {SITE.phoneDisplay}</a>
            </li>
            <li>
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 transition hover:text-gold-300"><MessageCircle size={16} className="text-gold-400" /> WhatsApp</a>
            </li>
            <li>
              <a href={MAPS_DIRECTIONS_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-2 transition hover:text-gold-300"><MapPin size={16} className="mt-0.5 shrink-0 text-gold-400" /> {SITE.address}</a>
            </li>
          </ul>
          <button onClick={() => openBooking()} className="btn-gold mt-5 !px-5 !py-2.5 text-sm"><CalendarCheck size={16} /> Randevu Al</button>
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-7xl px-4 sm:px-6">
        <div className="gold-rule" />
        <div className="mt-6 flex flex-col items-center justify-between gap-3 text-xs text-ink-400 sm:flex-row">
          <p>© {new Date().getFullYear()} {SITE.name}. Tüm hakları saklıdır.</p>
          {showAdminLink && <a href="/admin" className="inline-flex items-center gap-1.5 transition hover:text-gold-300">Yönetim Paneli</a>}
        </div>
      </div>

      <motion.div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" />
    </footer>
  );
}
