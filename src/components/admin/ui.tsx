"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, CheckCheck, CheckCircle2, Info, Loader2, MessageCircle, Phone, Trash2, X, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useSound } from "@/components/SoundProvider";
import { STATUS_LABELS, type AppointmentStatus } from "@/lib/site";
import { formatDateTR, formatDuration, formatPhone, formatPrice } from "@/lib/time";
import type { AppointmentView } from "@/lib/types";
import { customerWhatsapp } from "./api";

// ---------------------------------------------------------------------------
// Bildirimler (toast)
// ---------------------------------------------------------------------------
type Tone = "success" | "error" | "info";
const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { play } = useSound();
  const [items, setItems] = useState<{ id: number; message: string; tone: Tone }[]>([]);
  const counter = useRef(0);

  const toast = useCallback(
    (message: string, tone: Tone = "success") => {
      const id = ++counter.current;
      setItems((cur) => [...cur.slice(-3), { id, message, tone }]);
      play(tone === "error" ? "error" : "pop");
      setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), 4200);
    },
    [play],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              role="status"
              className={`pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl ${
                t.tone === "success"
                  ? "border-neon-green/40 bg-emerald-950/90 text-emerald-100"
                  : t.tone === "error"
                    ? "border-neon-red/40 bg-red-950/90 text-red-100"
                    : "border-gold-500/40 bg-ink-800/95 text-gold-100"
              }`}
            >
              {t.tone === "success" ? <CheckCircle2 size={18} /> : t.tone === "error" ? <XCircle size={18} /> : <Info size={18} />}
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Temel parçalar
// ---------------------------------------------------------------------------
export function Card({ children, className = "", ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`glass rounded-2xl p-5 ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function PageTitle({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-semibold uppercase tracking-wide text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-300">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Spinner({ label = "Yükleniyor…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-ink-300">
      <Loader2 className="animate-spin text-gold-400" size={20} /> {label}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-white/10 px-4 py-12 text-center text-sm text-ink-400">{children}</div>;
}

export const STATUS_STYLES: Record<AppointmentStatus, { badge: string; bar: string; dot: string }> = {
  pending: { badge: "bg-amber-400/15 text-amber-300 border-amber-400/30", bar: "border-l-amber-400", dot: "bg-amber-400" },
  confirmed: { badge: "bg-neon-blue/15 text-blue-300 border-neon-blue/30", bar: "border-l-neon-blue", dot: "bg-neon-blue" },
  completed: { badge: "bg-neon-green/15 text-emerald-300 border-neon-green/30", bar: "border-l-neon-green", dot: "bg-neon-green" },
  cancelled: { badge: "bg-neon-red/15 text-red-300 border-neon-red/30", bar: "border-l-neon-red", dot: "bg-neon-red" },
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status].badge}`}>{STATUS_LABELS[status]}</span>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-ink-200">
        {label} {hint && <span className="text-ink-400">({hint})</span>}
      </span>
      {children}
    </label>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${checked ? "border-gold-400 bg-gold-500" : "border-white/15 bg-white/10"}`}
    >
      <motion.span className="absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow" animate={{ left: checked ? 22 : 2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[150] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`glass-strong flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl ${wide ? "max-w-2xl" : "max-w-lg"}`}
        initial={{ y: 40, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 30, opacity: 0, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="font-display text-xl font-semibold uppercase tracking-wide text-white">{title}</h2>
          <button onClick={onClose} aria-label="Kapat" className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-ink-200 hover:border-gold-500/60">
            <X size={17} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </motion.div>
    </motion.div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Onayla",
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="flex gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${danger ? "bg-neon-red/15 text-neon-red" : "bg-gold-400/15 text-gold-300"}`}>
          <AlertTriangle size={20} />
        </span>
        <div className="text-sm leading-relaxed text-ink-200">{message}</div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-ghost !px-5 !py-2.5 text-sm" onClick={onCancel} disabled={busy}>
          Vazgeç
        </button>
        <button
          className={`!px-5 !py-2.5 text-sm ${danger ? "inline-flex items-center justify-center gap-2 rounded-xl bg-neon-red px-5 font-bold text-white transition hover:brightness-110 disabled:opacity-50" : "btn-gold"}`}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy && <Loader2 size={16} className="animate-spin" />} {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Randevu kartı + durum aksiyonları (dashboard ve randevu listesinde ortak)
// ---------------------------------------------------------------------------
export function StatusActions({ a, onStatus, busy, size = "md" }: { a: AppointmentView; onStatus: (a: AppointmentView, s: AppointmentStatus) => void; busy?: boolean; size?: "sm" | "md" }) {
  const pad = size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-sm";
  const base = `inline-flex items-center gap-1.5 rounded-lg border font-semibold transition disabled:opacity-50 ${pad}`;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {a.status === "pending" && (
        <button disabled={busy} onClick={() => onStatus(a, "confirmed")} className={`${base} border-neon-blue/40 bg-neon-blue/15 text-blue-200 hover:bg-neon-blue/25`}>
          <Check size={14} /> Onayla
        </button>
      )}
      {(a.status === "pending" || a.status === "confirmed") && (
        <button disabled={busy} onClick={() => onStatus(a, "completed")} className={`${base} border-neon-green/40 bg-neon-green/15 text-emerald-200 hover:bg-neon-green/25`}>
          <CheckCheck size={14} /> Tamamlandı
        </button>
      )}
      {(a.status === "pending" || a.status === "confirmed") && (
        <button disabled={busy} onClick={() => onStatus(a, "cancelled")} className={`${base} border-neon-red/40 bg-neon-red/10 text-red-200 hover:bg-neon-red/20`}>
          <X size={14} /> İptal Et
        </button>
      )}
      {(a.status === "cancelled" || a.status === "completed") && (
        <button disabled={busy} onClick={() => onStatus(a, "pending")} className={`${base} border-white/15 bg-white/5 text-ink-200 hover:bg-white/10`}>
          Geri Al
        </button>
      )}
    </div>
  );
}

export function whatsappForAppointment(a: AppointmentView): string {
  const when = `${formatDateTR(a.date)} ${a.startTime}`;
  const text =
    a.status === "confirmed"
      ? `Merhaba ${a.customerName}, BERBERADAM ${when} randevunuz onaylandı. Sizi bekliyoruz!`
      : a.status === "cancelled"
        ? `Merhaba ${a.customerName}, BERBERADAM ${when} randevunuz iptal edilmiştir. Yeni randevu için bize yazabilirsiniz.`
        : `Merhaba ${a.customerName}, BERBERADAM ${when} randevunuz hakkında yazıyoruz.`;
  return customerWhatsapp(a.customerPhone, text);
}

export function AppointmentCard({ a, onStatus, onOpen, busy, compact }: { a: AppointmentView; onStatus: (a: AppointmentView, s: AppointmentStatus) => void; onOpen?: (a: AppointmentView) => void; busy?: boolean; compact?: boolean }) {
  return (
    <div className={`rounded-xl border border-white/10 border-l-4 bg-white/[0.03] p-4 ${STATUS_STYLES[a.status].bar}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <button onClick={() => onOpen?.(a)} className="min-w-0 text-left" disabled={!onOpen}>
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-display text-xl font-semibold text-gold-300">
              {a.startTime}–{a.endTime}
            </span>
            <StatusBadge status={a.status} />
            {a.isDemo && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase text-ink-400">demo</span>}
          </p>
          <p className="mt-1 truncate font-semibold text-white">{a.customerName}</p>
          <p className="truncate text-xs text-ink-300">
            {a.services.map((s) => s.name).join(" + ") || "—"} · {a.staffName}
          </p>
        </button>
        <div className="text-right">
          <p className="font-display text-lg text-white">{formatPrice(a.totalPrice)}</p>
          <p className="text-xs text-ink-400">{formatDuration(a.duration)}</p>
        </div>
      </div>
      {!compact && a.note && <p className="mt-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs italic text-ink-300">“{a.note}”</p>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <StatusActions a={a} onStatus={onStatus} busy={busy} size="sm" />
        <div className="flex items-center gap-1.5">
          <a href={`tel:${a.customerPhone}`} aria-label="Ara" className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-ink-200 hover:border-gold-500/60 hover:text-gold-300" title={formatPhone(a.customerPhone)}>
            <Phone size={14} />
          </a>
          <a href={whatsappForAppointment(a)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp ile yaz" className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-ink-200 hover:border-neon-green/60 hover:text-neon-green">
            <MessageCircle size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}

export function DeleteIconButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-ink-300 transition hover:border-neon-red/60 hover:text-neon-red">
      <Trash2 size={14} />
    </button>
  );
}
