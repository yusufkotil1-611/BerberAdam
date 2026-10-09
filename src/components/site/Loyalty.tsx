"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Gift, Loader2, Scissors, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { useBooking } from "@/components/booking/BookingProvider";
import { useSound } from "@/components/SoundProvider";
import { Reveal } from "@/components/ui";
import { LOYALTY_TARGET } from "@/lib/site";

interface LoyaltyResult {
  completed: number;
  stamps: number;
  rewardsEarned: number;
}

/** Sadakat programı: 5 tıraşa 1 cilt bakımı hediye. Telefon numarasıyla gerçek damga sayısı sorgulanabilir. */
export function Loyalty() {
  const { openBooking } = useBooking();
  const { play } = useSound();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LoyaltyResult | null>(null);

  // Sorgu yapılmadıysa örnek bir kart gösterilir (3 damga)
  const stamps = result ? result.stamps : 3;
  const isDemo = !result;
  const rewardReady = !!result && result.completed > 0 && result.stamps === 0;

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/loyalty?phone=${encodeURIComponent(phone)}`, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Sorgulanamadı.");
      setResult(body);
      play(body.completed > 0 ? "success" : "pop");
    } catch (err) {
      setResult(null);
      setError((err as Error).message);
      play("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="sadakat" className="relative z-10 scroll-mt-20 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <div className="glass relative overflow-hidden rounded-[2rem] p-6 sm:p-10 lg:p-12">
            <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold-500/20 blur-[90px]" />
            <div aria-hidden className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-neon-red/10 blur-[90px]" />

            <div className="relative grid items-center gap-10 lg:grid-cols-2">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-gold-400/15 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.25em] text-gold-300">
                  <Gift size={14} /> Sadakat Programı
                </span>
                <h2 className="mt-5 font-display text-4xl font-semibold uppercase leading-tight text-white sm:text-5xl">
                  {LOYALTY_TARGET} Tıraşa <span className="text-gold-gradient">1 Cilt Bakımı</span> Hediye
                </h2>
                <p className="mt-4 max-w-md text-ink-300">
                  Her tamamlanan randevu kartına bir damga ekler. {LOYALTY_TARGET}. damgada cilt bakımın bizden. Damgaların için kayıtlı telefon numaranı gir.
                </p>

                <form onSubmit={lookup} className="mt-6 flex max-w-md flex-col gap-3 sm:flex-row">
                  <input
                    className="field"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s()-]/g, ""))}
                    placeholder="05XX XXX XX XX"
                    inputMode="tel"
                    autoComplete="tel"
                    aria-label="Telefon numarası"
                    maxLength={20}
                  />
                  <button type="submit" disabled={loading || phone.trim().length < 10} className="btn-gold shrink-0 !px-6">
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />} Damgalarımı Gör
                  </button>
                </form>
                {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
                {result && !error && (
                  <p className="mt-3 text-sm text-ink-200">
                    Toplam <b className="text-gold-300">{result.completed}</b> tamamlanan randevu
                    {result.rewardsEarned > 0 && <> · <b className="text-gold-300">{result.rewardsEarned}</b> hediye hakkı kazandın</>}.
                  </p>
                )}
              </div>

              {/* Damga kartı */}
              <div className="relative mx-auto w-full max-w-md" style={{ perspective: 1000 }}>
                <motion.div
                  whileHover={{ rotateX: 4, rotateY: -6, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 200, damping: 18 }}
                  className="relative overflow-hidden rounded-3xl border border-gold-400/40 bg-gradient-to-br from-ink-700 via-ink-800 to-ink-900 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.55),0_0_50px_rgba(242,195,90,0.15)]"
                >
                  <div className="grain absolute inset-0" aria-hidden />
                  <div className="relative flex items-center justify-between">
                    <p className="font-display text-xl font-semibold uppercase tracking-[0.2em] text-gold-300">BERBERADAM</p>
                    <span className="text-[11px] uppercase tracking-widest text-ink-400">{isDemo ? "Örnek Kart" : "Kartın"}</span>
                  </div>

                  <div className="relative mt-6 grid grid-cols-5 gap-3">
                    {Array.from({ length: LOYALTY_TARGET }, (_, i) => {
                      const filled = i < stamps;
                      return (
                        <motion.div
                          key={`${isDemo}-${stamps}-${i}`}
                          initial={{ scale: 0.6, rotate: -30, opacity: 0.3 }}
                          whileInView={{ scale: 1, rotate: 0, opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.15 * i + 0.2, type: "spring", stiffness: 260, damping: 16 }}
                          className={`grid aspect-square place-items-center rounded-full border-2 ${
                            filled
                              ? "border-gold-300 bg-gradient-to-br from-gold-300 to-gold-600 text-ink-950 shadow-[0_0_20px_rgba(242,195,90,0.55)]"
                              : "border-dashed border-ink-500 text-ink-500"
                          }`}
                        >
                          <Scissors size={18} className={filled ? "-rotate-45" : ""} />
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="relative mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                    <div>
                      <p className="text-xs text-ink-400">Hediye</p>
                      <p className="font-semibold text-white">Ücretsiz Cilt Bakımı</p>
                    </div>
                    <p className="font-display text-2xl text-gold-300">
                      {stamps}/{LOYALTY_TARGET}
                    </p>
                  </div>
                </motion.div>

                <AnimatePresence>
                  {rewardReady && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute -top-4 right-2 flex items-center gap-2 rounded-full bg-gradient-to-r from-neon-green to-emerald-400 px-4 py-2 text-sm font-bold text-ink-950 shadow-[0_0_30px_rgba(52,232,160,0.6)]"
                    >
                      <Sparkles size={16} /> Hediye hakkın hazır!
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-5 text-center">
                  <button onClick={() => openBooking()} className="btn-ghost text-sm">
                    Randevu al, damgayı kap
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
