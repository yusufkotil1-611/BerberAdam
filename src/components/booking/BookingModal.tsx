"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MessageCircle,
  Phone,
  Shuffle,
  Smartphone,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ServiceIcon } from "@/components/ServiceIcon";
import { useSound } from "@/components/SoundProvider";
import { SITE, WEEKDAYS_SHORT_TR, MONTHS_TR, whatsappLink } from "@/lib/site";
import { addDays, formatDateTR, formatDuration, formatPrice, normalizePhone, shopNow, weekdayOf } from "@/lib/time";
import type { AvailabilityResult, BookingConfirmation } from "@/lib/types";
import type { BookingData } from "./BookingProvider";

type Step = 1 | 2 | 3 | 4 | 5;
const STEPS = ["Hizmet", "Berber", "Tarih & Saat", "Bilgiler", "Onay"] as const;

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 36 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -36 }),
};

export function BookingModal({ data, preselect, onClose }: { data: BookingData; preselect: number[]; onClose: () => void }) {
  const { play } = useSound();
  const services = useMemo(() => data.services.filter((s) => s.active), [data.services]);
  const staff = useMemo(() => data.staff.filter((s) => s.active), [data.staff]);

  const [step, setStep] = useState<Step>(1);
  const [dir, setDir] = useState(1);
  const [selected, setSelected] = useState<number[]>(() => preselect.filter((id) => services.some((s) => s.id === id)));
  const [staffId, setStaffId] = useState<number | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const userPickedDate = useRef(false);

  // ---- Toplamlar ----
  const chosen = useMemo(() => services.filter((s) => selected.includes(s.id)), [services, selected]);
  const totalDuration = chosen.reduce((n, s) => n + s.duration, 0);
  const totalPrice = chosen.reduce((n, s) => n + s.price, 0);

  // ---- Tarih şeridi ----
  const today = useMemo(() => shopNow().date, []);
  const closedMap = useMemo(() => new Map(data.closedDates.map((c) => [c.date, c.reason])), [data.closedDates]);
  const days = useMemo(() => {
    const open = new Map(data.hours.map((h) => [h.weekday, h.isOpen]));
    return Array.from({ length: data.settings.horizonDays + 1 }, (_, i) => {
      const d = addDays(today, i);
      const wd = weekdayOf(d);
      const dt = new Date(`${d}T00:00:00Z`);
      const closedReason = closedMap.get(d);
      return {
        date: d,
        weekday: WEEKDAYS_SHORT_TR[wd],
        day: dt.getUTCDate(),
        month: MONTHS_TR[dt.getUTCMonth()].slice(0, 3),
        isToday: i === 0,
        disabled: !open.get(wd) || closedReason !== undefined,
        label: !open.get(wd) ? "Kapalı" : closedReason !== undefined ? "Tatil" : "",
      };
    });
  }, [data.hours, data.settings.horizonDays, today, closedMap]);

  // ---- Gövde kaydırmayı kilitle, ESC ile kapat ----
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // ---- Doluluk sorgusu ----
  const servicesKey = selected.slice().sort((a, b) => a - b).join(",");
  const fetchSlots = useCallback(
    async (signal?: AbortSignal) => {
      if (!date || !servicesKey) return;
      setLoadingSlots(true);
      setSlotError(null);
      try {
        const res = await fetch(`/api/availability?date=${date}&services=${servicesKey}&staffId=${staffId ?? "any"}`, { signal, cache: "no-store" });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Saatler yüklenemedi.");
        const result = body as AvailabilityResult;
        // Bugün için uygun saat kalmadıysa (ve kullanıcı kendi seçmediyse) bir sonraki açık güne geç
        if (!userPickedDate.current && date === today && result.slots.every((s) => !s.available)) {
          const next = days.find((d) => d.date > today && !d.disabled);
          if (next) {
            setDate(next.date);
            setTime(null);
            return;
          }
        }
        setAvailability(result);
        // Seçili saat artık müsait değilse temizle
        setTime((t) => (t && result.slots.some((s) => s.time === t && s.available) ? t : null));
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setAvailability(null);
        setSlotError((e as Error).message || "Saatler yüklenemedi.");
      } finally {
        if (!signal?.aborted) setLoadingSlots(false);
      }
    },
    [date, servicesKey, staffId, today, days],
  );

  useEffect(() => {
    if (step !== 3 || !date) return;
    const ctrl = new AbortController();
    void fetchSlots(ctrl.signal);
    return () => ctrl.abort();
  }, [step, date, fetchSlots]);

  // ---- Gezinme ----
  const go = useCallback(
    (next: Step) => {
      setDir(next > step ? 1 : -1);
      setStep(next);
      play("swipe");
      requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>("[data-scroll]")?.scrollTo({ top: 0 }));
    },
    [step, play],
  );

  const toggleService = (id: number) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const goToStep3 = () => {
    if (!date) {
      const first = days.find((d) => !d.disabled);
      if (first) setDate(first.date);
    }
    go(3);
  };

  const canNext =
    step === 1 ? selected.length > 0 : step === 2 ? true : step === 3 ? !!date && !!time : step === 4 ? true : false;

  const onNext = () => {
    if (!canNext) return;
    if (step === 2) goToStep3();
    else if (step === 4) void submit();
    else go((step + 1) as Step);
  };

  // ---- Gönderim ----
  async function submit() {
    setFormError(null);
    const cleanName = name.trim();
    if (cleanName.length < 3) return failForm("Lütfen adınızı ve soyadınızı girin.");
    if (!normalizePhone(phone)) return failForm("Geçerli bir cep telefonu girin (05XX XXX XX XX).");
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return failForm("Geçerli bir e-posta adresi girin.");
    if (!consent) return failForm("Devam etmek için kişisel veri onayını işaretleyin.");
    if (!date || !time) return failForm("Lütfen tarih ve saat seçin.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceIds: selected, staffId, date, time, name: cleanName, phone, email: email.trim(), note: note.trim() }),
      });
      const body = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          // Saat az önce doldu → saat seçimine dön ve güncel durumu göster
          setTime(null);
          go(3);
          void fetchSlots();
          setSlotError(body.error);
          play("error");
          return;
        }
        return failForm(body.error || "Randevu oluşturulamadı.");
      }
      setConfirmation(body as BookingConfirmation);
      setDir(1);
      setStep(5);
      play("success");
    } catch {
      failForm("Bağlantı hatası. Lütfen internetinizi kontrol edip tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  }

  function failForm(msg: string) {
    setFormError(msg);
    play("error");
  }

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Randevu al"
        className="glass-strong relative flex max-h-[100dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl outline-none sm:max-h-[92vh] sm:rounded-3xl"
        initial={{ y: 60, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
      >
        {/* Başlık + adım göstergesi */}
        <div className="relative border-b border-white/10 px-5 pb-4 pt-5 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-400">Online Randevu</p>
              <h2 className="font-display text-2xl font-semibold uppercase text-white sm:text-3xl">
                {step === 5 ? "Randevun Alındı!" : STEPS[step - 1]}
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Pencereyi kapat"
              className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-ink-200 transition hover:rotate-90 hover:border-gold-500/60 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          <ol className="mt-4 flex items-center justify-between text-[11px] font-medium text-ink-400">
            {STEPS.map((label, i) => {
              const n = i + 1;
              const done = step > n;
              const active = step === n;
              return (
                <li key={label} className="flex flex-1 flex-col items-center gap-1.5">
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-full border text-xs font-bold transition-all duration-300 ${
                      done
                        ? "border-gold-400 bg-gold-400 text-ink-950"
                        : active
                          ? "border-gold-400 bg-gold-400/15 text-gold-300 shadow-[0_0_14px_rgba(242,195,90,0.5)]"
                          : "border-white/15 text-ink-400"
                    }`}
                  >
                    {done ? <Check size={14} strokeWidth={3} /> : n}
                  </span>
                  <span className={`hidden sm:block ${active ? "text-gold-300" : ""}`}>{label}</span>
                </li>
              );
            })}
          </ol>
          <div className="absolute inset-x-0 bottom-0 h-px bg-white/10">
            <motion.div className="h-full bg-gradient-to-r from-gold-600 to-gold-300 shadow-[0_0_10px_rgba(242,195,90,0.8)]" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
          </div>
        </div>

        {/* İçerik */}
        <div data-scroll className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {step === 1 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <p className="text-sm text-ink-300 sm:col-span-2">Bir veya birden fazla hizmet seçebilirsiniz.</p>
                  {services.map((s) => {
                    const on = selected.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        data-sfx="snip"
                        onClick={() => toggleService(s.id)}
                        aria-pressed={on}
                        className={`group relative flex items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-300 ${
                          on
                            ? "border-gold-400 bg-gold-400/10 shadow-[0_0_26px_rgba(242,195,90,0.22)]"
                            : "border-white/10 bg-white/[0.03] hover:border-gold-500/50 hover:bg-white/[0.06]"
                        }`}
                      >
                        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition ${on ? "bg-gold-400 text-ink-950" : "bg-white/5 text-gold-400"}`}>
                          <ServiceIcon name={s.icon} size={20} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-white">{s.name}</span>
                            <span className="font-display text-lg text-gold-300">{formatPrice(s.price)}</span>
                          </span>
                          <span className="mt-0.5 block text-xs leading-snug text-ink-300">{s.description}</span>
                          <span className="mt-2 inline-flex items-center gap-1 text-xs text-ink-400">
                            <Clock size={12} /> {formatDuration(s.duration)}
                          </span>
                        </span>
                        <span
                          className={`absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full border transition ${
                            on ? "scale-100 border-gold-400 bg-gold-400 text-ink-950" : "scale-0 border-transparent"
                          }`}
                        >
                          <Check size={12} strokeWidth={3.5} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <p className="text-sm text-ink-300 sm:col-span-2">Dilediğiniz ustayı seçin ya da sistem sizin için en uygun olanı atasın.</p>
                  <StaffCard active={staffId === null} onClick={() => setStaffId(null)} title="Fark Etmez" subtitle="En erken müsait usta atanır" icon={<Shuffle size={22} />} />
                  {staff.map((s) => (
                    <StaffCard
                      key={s.id}
                      active={staffId === s.id}
                      onClick={() => setStaffId(s.id)}
                      title={s.name}
                      subtitle={s.title || "Berber"}
                      icon={<span className="font-display text-lg font-semibold">{s.name.trim().charAt(0).toUpperCase()}</span>}
                    />
                  ))}
                </div>
              )}

              {step === 3 && (
                <div>
                  <DateStrip days={days} value={date} onChange={(d) => {
                      userPickedDate.current = true;
                      setDate(d);
                      setTime(null);
                    }} />

                  <div className="mt-6 min-h-[200px]">
                    {date && (
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-semibold text-white">{formatDateTR(date)}</h3>
                        <div className="flex items-center gap-3 text-[11px] text-ink-300">
                          <Legend className="border-white/20 bg-white/5" label="Müsait" />
                          <Legend className="border-neon-red/40 bg-neon-red/15" label="Dolu" />
                          <Legend className="border-gold-400 bg-gold-400" label="Seçili" />
                        </div>
                      </div>
                    )}

                    {loadingSlots && (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {Array.from({ length: 12 }, (_, i) => (
                          <div key={i} className="h-11 animate-pulse rounded-xl bg-white/5" />
                        ))}
                      </div>
                    )}

                    {!loadingSlots && slotError && (
                      <Notice tone="error">{slotError}</Notice>
                    )}

                    {!loadingSlots && availability && !availability.open && <Notice tone="info">{availability.message ?? "Bu gün randevu alınamıyor."}</Notice>}

                    {!loadingSlots && availability?.open && availability.slots.length === 0 && (
                      <Notice tone="info">{availability.message ?? "Bu gün için uygun saat bulunamadı."}</Notice>
                    )}

                    {!loadingSlots && availability?.open && availability.slots.length > 0 && availability.slots.every((s) => !s.available) && (
                      <div className="mb-4">
                        <Notice tone="info">Bu gün için müsait saat kalmadı. Lütfen başka bir gün seçin.</Notice>
                      </div>
                    )}

                    {!loadingSlots && availability?.open && availability.slots.length > 0 && (
                      <SlotGrid availability={availability} value={time} onChange={setTime} />
                    )}
                  </div>
                  <p className="mt-4 text-xs text-ink-400">
                    Toplam süre: <b className="text-ink-200">{formatDuration(totalDuration)}</b> — dolu saatler seçilemez.
                  </p>
                </div>
              )}

              {step === 4 && (
                <form
                  className="grid gap-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void submit();
                  }}
                  noValidate
                >
                  <div className="glass rounded-2xl p-4 text-sm">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-200">
                      <span className="inline-flex items-center gap-1.5"><CalendarCheck size={15} className="text-gold-400" /> {date && formatDateTR(date)} · {time}</span>
                      <span className="text-ink-400">|</span>
                      <span>{staffId ? staff.find((s) => s.id === staffId)?.name : "Fark etmez"}</span>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-1.5 text-sm">
                      <span className="text-ink-200">Ad Soyad *</span>
                      <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Adınız Soyadınız" autoComplete="name" maxLength={80} />
                    </label>
                    <label className="grid gap-1.5 text-sm">
                      <span className="text-ink-200">Telefon *</span>
                      <input className="field" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s()-]/g, ""))} placeholder="05XX XXX XX XX" inputMode="tel" autoComplete="tel" maxLength={20} />
                    </label>
                  </div>
                  <label className="grid gap-1.5 text-sm">
                    <span className="text-ink-200">E-posta <span className="text-ink-400">(isteğe bağlı)</span></span>
                    <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@mail.com" autoComplete="email" maxLength={120} />
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="text-ink-200">Özel Not <span className="text-ink-400">(isteğe bağlı)</span></span>
                    <textarea className="field min-h-[88px] resize-y" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Örn. yanlar 2 numara, üstten az alınsın…" maxLength={500} />
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-ink-300">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#f2c35a]" />
                    <span>Kişisel verilerimin randevu oluşturma ve bilgilendirme amacıyla işlenmesini kabul ediyorum.</span>
                  </label>
                  {formError && <Notice tone="error">{formError}</Notice>}
                  <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
                </form>
              )}

              {step === 5 && confirmation && <SuccessView c={confirmation} onClose={onClose} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Alt çubuk: özet + gezinme */}
        {step !== 5 && (
          <div className="border-t border-white/10 bg-black/30 px-5 py-4 sm:px-8">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 text-sm">
                {selected.length > 0 ? (
                  <>
                    <p className="truncate text-ink-200">
                      {chosen.length} hizmet · <span className="text-ink-300">{formatDuration(totalDuration)}</span>
                    </p>
                    <p className="font-display text-xl text-gold-300">{formatPrice(totalPrice)}</p>
                  </>
                ) : (
                  <p className="text-ink-400">Henüz hizmet seçilmedi</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {step > 1 && (
                  <button onClick={() => go((step - 1) as Step)} className="btn-ghost !px-4 !py-3" aria-label="Geri">
                    <ArrowLeft size={18} /> <span className="hidden sm:inline">Geri</span>
                  </button>
                )}
                <button onClick={onNext} disabled={!canNext || submitting} className="btn-gold !px-6 !py-3" data-sfx={step === 4 ? "none" : undefined}>
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Gönderiliyor…
                    </>
                  ) : step === 4 ? (
                    <>
                      <Check size={18} /> Randevuyu Onayla
                    </>
                  ) : (
                    <>
                      Devam <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Alt bileşenler
// ---------------------------------------------------------------------------
function StaffCard({ active, onClick, title, subtitle, icon }: { active: boolean; onClick: () => void; title: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-300 ${
        active ? "border-gold-400 bg-gold-400/10 shadow-[0_0_26px_rgba(242,195,90,0.22)]" : "border-white/10 bg-white/[0.03] hover:border-gold-500/50 hover:bg-white/[0.06]"
      }`}
    >
      <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-full ${active ? "bg-gradient-to-br from-gold-300 to-gold-600 text-ink-950" : "bg-white/5 text-gold-400"}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-white">{title}</span>
        <span className="block truncate text-xs text-ink-300">{subtitle}</span>
      </span>
      <span className={`grid h-6 w-6 place-items-center rounded-full border transition ${active ? "border-gold-400 bg-gold-400 text-ink-950" : "border-white/20"}`}>
        {active && <Check size={14} strokeWidth={3.5} />}
      </span>
    </button>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded border ${className}`} />
      {label}
    </span>
  );
}

function Notice({ tone, children }: { tone: "error" | "info"; children: React.ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
        tone === "error" ? "border-neon-red/40 bg-neon-red/10 text-red-200" : "border-gold-500/30 bg-gold-400/10 text-gold-200"
      }`}
    >
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

type DayItem = { date: string; weekday: string; day: number; month: string; isToday: boolean; disabled: boolean; label: string };

function DateStrip({ days, value, onChange }: { days: DayItem[]; value: string | null; onChange: (d: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const scrollBy = (dx: number) => ref.current?.scrollBy({ left: dx, behavior: "smooth" });

  // Seçili günü görünür alana getir
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("[aria-pressed='true']")?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [value]);

  return (
    <div className="relative flex items-center gap-2">
      <button onClick={() => scrollBy(-260)} aria-label="Önceki günler" className="hidden h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 hover:border-gold-500/60 sm:grid">
        <ChevronLeft size={18} />
      </button>
      <div ref={ref} className="flex flex-1 snap-x gap-2 overflow-x-auto pb-2">
        {days.map((d) => {
          const on = value === d.date;
          return (
            <button
              key={d.date}
              disabled={d.disabled}
              aria-pressed={on}
              onClick={() => onChange(d.date)}
              className={`relative flex w-[68px] shrink-0 snap-start flex-col items-center rounded-2xl border px-2 py-3 transition-all duration-300 ${
                on
                  ? "border-gold-400 bg-gradient-to-b from-gold-300 to-gold-500 text-ink-950 shadow-[0_0_22px_rgba(242,195,90,0.45)]"
                  : d.disabled
                    ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-ink-500"
                    : "border-white/10 bg-white/[0.04] text-ink-100 hover:border-gold-500/60 hover:bg-white/[0.08]"
              }`}
            >
              <span className={`text-[11px] font-semibold uppercase tracking-wide ${on ? "text-ink-900" : "text-ink-300"}`}>{d.isToday ? "Bugün" : d.weekday}</span>
              <span className="font-display text-2xl leading-none">{d.day}</span>
              <span className={`text-[11px] ${on ? "text-ink-800" : "text-ink-400"}`}>{d.month}</span>
              {d.disabled && <span className="mt-1 text-[9px] font-semibold uppercase text-neon-red/80">{d.label}</span>}
            </button>
          );
        })}
      </div>
      <button onClick={() => scrollBy(260)} aria-label="Sonraki günler" className="hidden h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 hover:border-gold-500/60 sm:grid">
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

function SlotGrid({ availability, value, onChange }: { availability: AvailabilityResult; value: string | null; onChange: (t: string) => void }) {
  const groups = [
    { label: "Sabah", test: (h: number) => h < 12 },
    { label: "Öğleden Sonra", test: (h: number) => h >= 12 && h < 17 },
    { label: "Akşam", test: (h: number) => h >= 17 },
  ];
  return (
    <div className="grid gap-5">
      {groups.map((g) => {
        const slots = availability.slots.filter((s) => g.test(Number(s.time.slice(0, 2))));
        if (slots.length === 0) return null;
        return (
          <div key={g.label}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-400">{g.label}</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {slots.map((s) => {
                const on = value === s.time;
                const busy = !s.available && s.reason === "busy";
                return (
                  <motion.button
                    key={s.time}
                    disabled={!s.available}
                    aria-pressed={on}
                    title={busy ? "Dolu" : s.reason === "closed" ? "Kapalı" : s.reason === "past" ? "Geçmiş saat" : "Müsait"}
                    onClick={() => onChange(s.time)}
                    whileHover={s.available ? { scale: 1.06 } : undefined}
                    whileTap={s.available ? { scale: 0.95 } : undefined}
                    className={`h-11 rounded-xl border text-sm font-semibold transition-colors ${
                      on
                        ? "border-gold-300 bg-gold-400 text-ink-950 shadow-[0_0_18px_rgba(242,195,90,0.55)]"
                        : s.available
                          ? "border-white/15 bg-white/[0.05] text-white hover:border-gold-400/70 hover:bg-gold-400/10"
                          : busy
                            ? "cursor-not-allowed border-neon-red/30 bg-neon-red/10 text-neon-red/70 line-through"
                            : "cursor-not-allowed border-white/5 bg-white/[0.02] text-ink-500"
                    }`}
                  >
                    {s.time}
                  </motion.button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Metni harf harf yazdıran küçük kanca (SMS simülasyonu için) */
function useTypewriter(text: string, speed = 14) {
  const [out, setOut] = useState("");
  useEffect(() => {
    setOut("");
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return out;
}

function buildIcs(c: BookingConfirmation): string {
  // Türkiye yıl boyunca UTC+3 kullanır (yaz/kış saati yok)
  const toUtc = (date: string, time: string) =>
    new Date(`${date}T${time}:00+03:00`).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BERBERADAM//Randevu//TR",
    "BEGIN:VEVENT",
    `UID:${c.code}@berberadam`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTSTART:${toUtc(c.date, c.startTime)}`,
    `DTEND:${toUtc(c.date, c.endTime)}`,
    `SUMMARY:BERBERADAM Randevu (${c.services.map((s) => s.name).join(" + ")})`,
    `LOCATION:${SITE.address.replace(/,/g, "\\,")}`,
    `DESCRIPTION:Randevu kodu: ${c.code}\\nBerber: ${c.staffName}\\nTel: ${SITE.phoneDisplay}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function SuccessView({ c, onClose }: { c: BookingConfirmation; onClose: () => void }) {
  const sms = useTypewriter(c.smsMessage);

  const downloadIcs = () => {
    const blob = new Blob([buildIcs(c)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `berberadam-randevu-${c.code}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-start">
      <div>
        <div className="relative mb-5 flex items-center gap-4">
          <div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-300 to-gold-600 text-ink-950 shadow-[0_0_40px_rgba(242,195,90,0.6)]">
            <motion.svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.2 }} />
            </motion.svg>
            {/* Parıltılar */}
            {Array.from({ length: 8 }, (_, i) => (
              <motion.span
                key={i}
                className="absolute h-1.5 w-1.5 rounded-full bg-gold-200"
                initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                animate={{ opacity: 0, x: Math.cos((i / 8) * Math.PI * 2) * 52, y: Math.sin((i / 8) * Math.PI * 2) * 52, scale: 0 }}
                transition={{ duration: 0.9, delay: 0.25 }}
              />
            ))}
          </div>
          <div>
            <p className="text-sm text-ink-300">Randevu talebiniz alındı. Onaylandığında SMS ile haber vereceğiz.</p>
            <p className="mt-1 text-sm text-ink-200">
              Kodunuz: <span className="rounded-md bg-gold-400/15 px-2 py-0.5 font-mono font-bold tracking-wider text-gold-300">{c.code}</span>
            </p>
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <dl className="grid gap-3 text-sm">
            <Row label="Tarih" value={`${formatDateTR(c.date)} · ${c.startTime} – ${c.endTime}`} />
            <Row label="Berber" value={c.staffName} />
            <Row label="Müşteri" value={`${c.customerName} · ${c.customerPhone}`} />
            <div className="gold-rule my-1" />
            {c.services.map((s) => (
              <Row key={s.name} label={s.name} value={formatPrice(s.price)} muted />
            ))}
            <div className="flex items-baseline justify-between border-t border-white/10 pt-3">
              <dt className="text-ink-300">Toplam ({formatDuration(c.duration)})</dt>
              <dd className="font-display text-2xl text-gold-300">{formatPrice(c.totalPrice)}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <a href={whatsappLink(c.whatsappMessage)} target="_blank" rel="noopener noreferrer" className="btn-gold">
            <MessageCircle size={18} /> WhatsApp ile Bildir
          </a>
          <button onClick={downloadIcs} className="btn-ghost">
            <CalendarPlus size={18} /> Takvime Ekle
          </button>
          <a href={SITE.phoneTel} className="btn-ghost">
            <Phone size={18} /> Ara
          </a>
        </div>
        <button onClick={onClose} className="mt-4 text-sm text-ink-400 underline-offset-4 hover:text-gold-300 hover:underline">
          Kapat
        </button>
      </div>

      {/* SMS / WhatsApp bildirim simülasyonu */}
      <div className="mx-auto w-full max-w-[280px]">
        <div className="mb-2 flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-ink-400">
          <Smartphone size={13} /> Bildirim simülasyonu
        </div>
        <div className="rounded-[2rem] border-[5px] border-ink-600 bg-ink-900 p-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-ink-700" />
          <p className="mb-2 text-center text-[10px] text-ink-400">SMS · {SITE.name}</p>
          <div className="min-h-[170px] rounded-2xl rounded-tl-md bg-ink-700 p-3 text-[12px] leading-snug text-ink-100">
            {sms}
            <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-gold-400 align-middle" />
          </div>
          <motion.div
            className="mt-3 flex items-center gap-2 rounded-xl bg-[#0b3b2c] px-3 py-2 text-[11px] text-emerald-100"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6 }}
          >
            <MessageCircle size={14} className="shrink-0 text-emerald-300" /> WhatsApp bildirimi hazır
          </motion.div>
        </div>
        <p className="mt-2 text-center text-[11px] leading-snug text-ink-400">Gerçek SMS gönderimi yoktur; mesajlar bir simülasyon olarak gösterilir.</p>
      </div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={muted ? "text-ink-300" : "text-ink-400"}>{label}</dt>
      <dd className={`text-right ${muted ? "text-ink-200" : "font-medium text-white"}`}>{value}</dd>
    </div>
  );
}
