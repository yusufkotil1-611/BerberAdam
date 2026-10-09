"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Quote, Send, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { useSound } from "@/components/SoundProvider";
import { Reveal, SectionHeading, Stars } from "@/components/ui";
import type { Review } from "@/lib/types";

interface ReviewsPayload {
  reviews: Review[];
  stats: { average: number; count: number };
}

function formatReviewDate(sqlDate: string): string {
  // SQLite 'YYYY-MM-DD HH:MM:SS' (UTC) → "Eylül 2026"
  const d = new Date(sqlDate.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric", timeZone: "Europe/Istanbul" }).format(d);
}

export function Reviews({ initial }: { initial: ReviewsPayload }) {
  const { play } = useSound();
  const [data, setData] = useState(initial);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thanks, setThanks] = useState(false);

  const distribution = useMemo(() => {
    const total = data.reviews.length || 1;
    return [5, 4, 3, 2, 1].map((star) => {
      const n = data.reviews.filter((r) => r.rating === star).length;
      return { star, n, pct: (n / total) * 100 };
    });
  }, [data.reviews]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (rating < 1) {
      setError("Lütfen yıldız vererek puanlayın.");
      play("error");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, rating, comment }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Yorum gönderilemedi.");
      setData(body as ReviewsPayload);
      setName("");
      setComment("");
      setRating(0);
      setThanks(true);
      play("success");
      setTimeout(() => setThanks(false), 5000);
    } catch (err) {
      setError((err as Error).message);
      play("error");
    } finally {
      setSending(false);
    }
  }

  return (
    <section id="yorumlar" className="relative z-10 scroll-mt-20 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading eyebrow="Müşteri Yorumları" title="Müşterilerimiz" accent="Ne Diyor?" />

        <div className="mt-14 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          {/* Özet + form */}
          <div className="grid content-start gap-6">
            <Reveal className="glass rounded-3xl p-6">
              {data.stats.count > 0 ? (
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="font-display text-6xl font-semibold text-gold-gradient">{data.stats.average.toFixed(1)}</p>
                    <Stars value={data.stats.average} size={15} />
                    <p className="mt-1 text-xs text-ink-400">{data.stats.count} yorum</p>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {distribution.map((d) => (
                      <div key={d.star} className="flex items-center gap-2 text-xs text-ink-300">
                        <span className="w-3">{d.star}</span>
                        <Star size={11} className="fill-gold-400 text-gold-400" />
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-gold-600 to-gold-300"
                            initial={{ width: 0 }}
                            whileInView={{ width: `${d.pct}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.9, delay: 0.1 }}
                          />
                        </div>
                        <span className="w-4 text-right">{d.n}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-center text-ink-300">Henüz yorum yok. İlk yorumu sen yaz!</p>
              )}
            </Reveal>

            <Reveal delay={0.1}>
              <form onSubmit={submit} className="glass grid gap-4 rounded-3xl p-6" noValidate>
                <h3 className="font-display text-2xl font-semibold uppercase text-white">Deneyimini Paylaş</h3>
                <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Puan">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <motion.button
                      key={i}
                      type="button"
                      role="radio"
                      aria-checked={rating === i}
                      aria-label={`${i} yıldız`}
                      data-sfx="pop"
                      whileHover={{ scale: 1.25, rotate: 8 }}
                      whileTap={{ scale: 0.9 }}
                      onMouseEnter={() => setHover(i)}
                      onClick={() => setRating(i)}
                      className="p-0.5"
                    >
                      <Star size={30} strokeWidth={1.6} className={`transition-colors ${i <= (hover || rating) ? "fill-gold-400 text-gold-400 drop-shadow-[0_0_8px_rgba(242,195,90,0.7)]" : "text-ink-500"}`} />
                    </motion.button>
                  ))}
                </div>
                <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Adınız (örn. Ali K.)" maxLength={40} autoComplete="given-name" />
                <textarea className="field min-h-[100px] resize-y" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Yorumunuz…" maxLength={500} />
                {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
                <AnimatePresence>
                  {thanks && (
                    <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl bg-neon-green/10 px-4 py-2 text-sm text-emerald-200">
                      Teşekkürler! Yorumun yayınlandı ✨
                    </motion.p>
                  )}
                </AnimatePresence>
                <button type="submit" disabled={sending} className="btn-gold" data-sfx="none">
                  {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Yorumu Gönder
                </button>
              </form>
            </Reveal>
          </div>

          {/* Yorum listesi */}
          <div className="grid content-start gap-4 sm:grid-cols-2">
            <AnimatePresence initial={false}>
              {data.reviews.slice(0, 12).map((r, i) => (
                <motion.article
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 30, scale: 0.96 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-40px" }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5, delay: (i % 2) * 0.08 }}
                  whileHover={{ y: -4 }}
                  className="glass relative flex flex-col rounded-3xl p-5 hover:border-gold-500/40"
                >
                  <Quote size={28} className="absolute right-4 top-4 text-gold-500/20" />
                  <Stars value={r.rating} size={15} />
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-100">{r.comment}</p>
                  <div className="mt-4 flex items-center gap-3 border-t border-white/10 pt-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-gold-300 to-gold-600 font-display text-sm font-semibold text-ink-950">
                      {r.name.trim().charAt(0).toUpperCase()}
                    </span>
                    <div className="text-sm">
                      <p className="font-semibold text-white">{r.name}</p>
                      <p className="text-xs text-ink-400">{formatReviewDate(r.createdAt)}</p>
                    </div>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
