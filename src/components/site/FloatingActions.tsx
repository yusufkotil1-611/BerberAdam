"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarCheck, MessageCircle, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { useBooking } from "@/components/booking/BookingProvider";
import { SITE, whatsappLink } from "@/lib/site";

/** Sağ altta WhatsApp düğmesi; mobilde altta sabit "Ara / Randevu Al" çubuğu. */
export function FloatingActions() {
  const { openBooking } = useBooking();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 500);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <a
        href={whatsappLink("Merhaba BERBERADAM, randevu almak istiyorum.")}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp ile yaz"
        className="fixed bottom-24 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25d366] text-white shadow-[0_8px_30px_rgba(37,211,102,0.5)] transition hover:scale-110 sm:bottom-6 sm:right-6"
      >
        <span className="absolute inset-0 animate-pulse-ring rounded-full" style={{ boxShadow: "0 0 0 0 rgba(37,211,102,0.5)" }} />
        <MessageCircle size={28} />
      </a>

      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ y: 90 }}
            animate={{ y: 0 }}
            exit={{ y: 90 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink-950/90 p-3 backdrop-blur-xl sm:hidden"
          >
            <div className="mx-auto flex max-w-md gap-3">
              <a href={SITE.phoneTel} className="btn-ghost flex-1 !py-3 text-sm">
                <Phone size={17} /> Ara
              </a>
              <button onClick={() => openBooking()} className="btn-gold flex-[2] !py-3 text-sm">
                <CalendarCheck size={17} /> Randevu Al
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
