"use client";

import { AnimatePresence, animate, motion, useInView } from "framer-motion";
import { ChevronsLeftRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { useSound } from "@/components/SoundProvider";
import { Reveal, SectionHeading } from "@/components/ui";
import { Portrait, type BeardStyle, type HairStyle } from "./Portrait";

/**
 * Önce/Sonra galerisi.
 * Gerçek fotoğraf eklemek için görselleri public/gallery/ klasörüne koyup ilgili kayda
 * `beforeSrc` ve `afterSrc` alanlarını yazın (örn. "/gallery/fade-once.jpg"). Verilmezse stilize çizim gösterilir.
 */
interface GalleryItem {
  id: string;
  title: string;
  caption: string;
  skin: string;
  hairColor: string;
  before: { hair: HairStyle; beard: BeardStyle };
  after: { hair: HairStyle; beard: BeardStyle };
  beforeSrc?: string;
  afterSrc?: string;
}

const GALLERY: GalleryItem[] = [
  {
    id: "fade",
    title: "Fade & Sakal Tasarımı",
    caption: "Dağınık saç ve düzensiz sakal → keskin skin fade ve çizgisi net sakal.",
    skin: "#cf9f7a",
    hairColor: "#1c150f",
    before: { hair: "messy", beard: "patchy" },
    after: { hair: "fade", beard: "sculpted" },
  },
  {
    id: "klasik",
    title: "Klasik Kesim",
    caption: "Uzamış saç → yandan taramalı, dolgun ve şık klasik kesim.",
    skin: "#e0b08c",
    hairColor: "#3a2616",
    before: { hair: "long", beard: "none" },
    after: { hair: "classic", beard: "none" },
  },
  {
    id: "sakal",
    title: "Sakal Bakımı",
    caption: "Gür ve bakımsız sakal → şekillendirilmiş, ustura detaylı temiz hatlar.",
    skin: "#b98862",
    hairColor: "#15110d",
    before: { hair: "fade", beard: "overgrown" },
    after: { hair: "fade", beard: "sculpted" },
  },
];

function Compare({ before, after }: { before: ReactNode; after: ReactNode }) {
  const { play } = useSound();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [pos, setPos] = useState(50);
  const dragging = useRef(false);
  const touched = useRef(false);
  const lastSound = useRef({ t: 0, pos: 50 });

  // Kullanıcıya sürgüyü ipucu olarak göster: sola, sağa, ortaya
  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    (async () => {
      for (const to of [22, 78, 50]) {
        if (cancelled || touched.current) return;
        await new Promise<void>((resolve) => {
          const c = animate(pos, to, { duration: 0.9, ease: "easeInOut", onUpdate: (v) => !touched.current && setPos(v), onComplete: resolve });
          if (touched.current) c.stop();
        });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  const move = useCallback(
    (clientX: number) => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const p = Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100));
      setPos(p);
      const now = performance.now();
      if (now - lastSound.current.t > 220 && Math.abs(p - lastSound.current.pos) > 12) {
        play("swipe");
        lastSound.current = { t: now, pos: p };
      }
    },
    [play],
  );

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    touched.current = true;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    move(e.clientX);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => dragging.current && move(e.clientX);
  const onUp = () => (dragging.current = false);
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      touched.current = true;
      setPos((p) => Math.min(100, Math.max(0, p + (e.key === "ArrowLeft" ? -5 : 5))));
    }
  };

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label="Önce sonra karşılaştırma sürgüsü"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pos)}
      data-cursor="hover"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onKeyDown={onKey}
      className="relative mx-auto aspect-[4/5] w-full max-w-md cursor-ew-resize touch-pan-y select-none overflow-hidden rounded-3xl border border-gold-500/30 shadow-[0_30px_80px_rgba(0,0,0,0.6),0_0_50px_rgba(242,195,90,0.12)]"
    >
      <div className="absolute inset-0">{after}</div>
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {before}
      </div>

      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-100 backdrop-blur">Önce</span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-gold-400 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-950">Sonra</span>

      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-gold-300 shadow-[0_0_14px_rgba(242,195,90,0.9)]" style={{ left: `${pos}%` }}>
        <div className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-gold-200 bg-ink-950/80 text-gold-300 shadow-[0_0_24px_rgba(242,195,90,0.6)] backdrop-blur">
          <ChevronsLeftRight size={22} />
        </div>
      </div>
    </div>
  );
}

function Visual({ item, side }: { item: GalleryItem; side: "before" | "after" }) {
  const src = side === "before" ? item.beforeSrc : item.afterSrc;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={side === "before" ? `${item.title} - önce` : `${item.title} - sonra`} draggable={false} className="h-full w-full object-cover" />;
  }
  const cfg = item[side];
  return <Portrait id={`${item.id}-${side}`} mood={side} hair={cfg.hair} beard={cfg.beard} skin={item.skin} hairColor={item.hairColor} />;
}

export function Gallery() {
  const [active, setActive] = useState(0);
  const item = GALLERY[active];

  return (
    <section id="galeri" className="relative z-10 scroll-mt-20 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading eyebrow="Önce / Sonra" title="Değişimi" accent="Kendin Gör" description="Sürgüyü sağa sola kaydır; ustalarımızın dokunuşuyla ortaya çıkan farkı karşılaştır." />

        <div className="mt-14 grid items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
          <Reveal>
            <AnimatePresence mode="wait">
              <motion.div key={item.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.3 }}>
                <Compare before={<Visual item={item} side="before" />} after={<Visual item={item} side="after" />} />
              </motion.div>
            </AnimatePresence>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="grid gap-3">
              {GALLERY.map((g, i) => (
                <button
                  key={g.id}
                  onClick={() => setActive(i)}
                  aria-pressed={i === active}
                  className={`rounded-2xl border p-5 text-left transition-all duration-300 ${
                    i === active ? "border-gold-400 bg-gold-400/10 shadow-[0_0_30px_rgba(242,195,90,0.18)]" : "border-white/10 bg-white/[0.03] hover:border-gold-500/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-xl font-semibold uppercase tracking-wide text-white">{g.title}</h3>
                    <span className={`font-display text-sm ${i === active ? "text-gold-300" : "text-ink-500"}`}>0{i + 1}</span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-ink-300">{g.caption}</p>
                </button>
              ))}
              <p className="mt-2 text-xs leading-relaxed text-ink-400">Görseller temsilidir. Gerçek müşteri fotoğrafları eklendiğinde bu alanda otomatik gösterilir.</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
