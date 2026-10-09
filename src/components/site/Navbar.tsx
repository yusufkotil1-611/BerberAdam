"use client";

import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { CalendarCheck, ChevronRight, Menu, Phone, ShieldCheck, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useBooking } from "@/components/booking/BookingProvider";
import { useSound } from "@/components/SoundProvider";
import { Logo } from "@/components/ui";
import { SITE } from "@/lib/site";

const LINKS = [
  { href: "#hizmetler", label: "Hizmetler" },
  { href: "#ekip", label: "Ekibimiz" },
  { href: "#galeri", label: "Galeri" },
  { href: "#sadakat", label: "Sadakat" },
  { href: "#yorumlar", label: "Yorumlar" },
  { href: "#iletisim", label: "İletişim" },
];

/** adminUrl: Admin Paneli girişinin adresi (aynı sitede "/admin"; yönetim ayrı alan adındaysa o adres). */
export function Navbar({ adminUrl = "/admin" }: { adminUrl?: string }) {
  const { openBooking } = useBooking();
  const { enabled, toggle } = useSound();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 24 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mobil menü açıkken sayfa kaydırmasını kilitle
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          scrolled ? "border-b border-white/10 bg-ink-950/75 py-2.5 backdrop-blur-xl" : "bg-transparent py-4"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <a href="#top" aria-label="BERBERADAM ana sayfa" className="shrink-0">
            <Logo />
          </a>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Ana menü">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className="group relative rounded-lg px-3.5 py-2 text-sm font-medium text-ink-200 transition hover:text-white">
                {l.label}
                <span className="absolute inset-x-3.5 -bottom-0.5 h-px origin-left scale-x-0 bg-gradient-to-r from-gold-300 to-gold-600 transition-transform duration-300 group-hover:scale-x-100" />
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              data-sfx="none"
              onClick={toggle}
              aria-label={enabled ? "Sesleri kapat" : "Sesleri aç"}
              aria-pressed={enabled}
              title={enabled ? "Sesleri kapat" : "Sesleri aç"}
              className="hidden h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-ink-200 transition hover:border-gold-500/60 hover:text-gold-300 sm:grid"
            >
              {enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <a href={SITE.phoneTel} className="hidden h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-sm font-medium text-ink-100 transition hover:border-gold-500/60 hover:text-gold-300 md:inline-flex">
              <Phone size={16} className="text-gold-400" /> {SITE.phoneDisplay}
            </a>
            <button onClick={() => openBooking()} className="btn-gold !px-5 !py-2.5 text-sm">
              <CalendarCheck size={17} /> <span className="hidden sm:inline">Randevu Al</span>
              <span className="sm:hidden">Randevu</span>
            </button>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Menüyü kapat" : "Menüyü aç"}
              aria-expanded={menuOpen}
              className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 transition hover:border-gold-500/60 hover:text-gold-300"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Kaydırma ilerleme çubuğu */}
        <motion.div style={{ scaleX: progress }} className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-gradient-to-r from-gold-600 via-gold-300 to-gold-600 shadow-[0_0_10px_rgba(242,195,90,0.8)]" />
      </motion.header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed inset-0 z-40 overflow-y-auto bg-ink-950/95 pb-10 pt-20 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <nav className="mx-auto flex max-w-md flex-col gap-1 px-6" aria-label="Mobil menü">
              {LINKS.map((l, i) => (
                <motion.a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="border-b border-white/10 py-3 font-display text-2xl uppercase tracking-wide text-white transition hover:pl-3 hover:text-gold-300"
                >
                  {l.label}
                </motion.a>
              ))}
              {/* Yönetici girişinin tek kapısı: Admin Paneli */}
              <motion.a
                href={adminUrl}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * LINKS.length + 0.1 }}
                className="group mt-6 flex items-center gap-3 rounded-2xl border border-gold-500/30 bg-gold-400/[0.06] px-4 py-3.5 transition hover:border-gold-400 hover:bg-gold-400/10"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-400/15 text-gold-300">
                  <ShieldCheck size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-white">Admin Paneli</span>
                  <span className="block text-xs text-ink-300">Yönetici girişi</span>
                </span>
                <ChevronRight size={18} className="text-gold-400 transition group-hover:translate-x-1" />
              </motion.a>

              <a href={SITE.phoneTel} className="btn-ghost mt-3">
                <Phone size={18} /> {SITE.phoneDisplay}
              </a>
              <button data-sfx="none" onClick={toggle} aria-pressed={enabled} className="btn-ghost mt-3">
                {enabled ? <Volume2 size={18} /> : <VolumeX size={18} />} Sesler: {enabled ? "Açık" : "Kapalı"}
              </button>

            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
