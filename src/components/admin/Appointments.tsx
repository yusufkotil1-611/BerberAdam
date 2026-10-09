"use client";

import { AnimatePresence } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, List, MessageCircle, Phone, Search, Trash2, CalendarRange } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { STATUS_LABELS, WEEKDAYS_SHORT_TR, type AppointmentStatus } from "@/lib/site";
import { addDays, formatDateTR, formatDuration, formatPhone, formatPrice, shopNow, weekdayOf } from "@/lib/time";
import type { AppointmentView } from "@/lib/types";
import { api, ApiError, formatCreatedAt } from "./api";
import { useFetch, useStatusChange } from "./hooks";
import { AppointmentCard, Card, ConfirmDialog, Empty, Modal, PageTitle, Spinner, StatusActions, StatusBadge, STATUS_STYLES, useToast, whatsappForAppointment } from "./ui";

type View = "day" | "week" | "list";
type Range = "upcoming" | "past" | "all";

const mondayOf = (date: string) => addDays(date, -((weekdayOf(date) + 6) % 7));

export function Appointments() {
  const toast = useToast();
  const today = useMemo(() => shopNow().date, []);
  const [view, setView] = useState<View>("day");
  const [anchor, setAnchor] = useState(today);
  const [range, setRange] = useState<Range>("upcoming");
  const [status, setStatus] = useState<AppointmentStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<AppointmentView | null>(null);
  const [deleting, setDeleting] = useState<AppointmentView | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQ(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const url = useMemo(() => {
    const p = new URLSearchParams();
    if (view === "day") {
      p.set("from", anchor);
      p.set("to", anchor);
    } else if (view === "week") {
      p.set("from", mondayOf(anchor));
      p.set("to", addDays(mondayOf(anchor), 6));
    } else {
      if (range === "upcoming") p.set("from", today);
      if (range === "past") p.set("to", addDays(today, -1));
    }
    if (q) p.set("q", q);
    return `/api/admin/appointments?${p}`;
  }, [view, anchor, range, q, today]);

  const { data, loading, error, reload } = useFetch<{ appointments: AppointmentView[] }>(url);
  const { change, busyId } = useStatusChange(async () => {
    await reload();
    setSelected(null);
  });

  const all = data?.appointments ?? [];
  const counts = useMemo(() => {
    const c = { all: all.length, pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
    for (const a of all) c[a.status]++;
    return c;
  }, [all]);
  const items = useMemo(() => {
    const filtered = status === "all" ? all : all.filter((a) => a.status === status);
    return view === "list" && range === "past" ? [...filtered].reverse() : filtered;
  }, [all, status, view, range]);

  const step = view === "week" ? 7 : 1;
  const weekStart = mondayOf(anchor);
  const summaryTotal = items.filter((a) => a.status !== "cancelled").reduce((n, a) => n + a.totalPrice, 0);

  async function remove(a: AppointmentView) {
    try {
      await api(`/api/admin/appointments/${a.id}`, { method: "DELETE" });
      toast("Randevu silindi.");
      setDeleting(null);
      setSelected(null);
      await reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Silinemedi.", "error");
      setDeleting(null);
    }
  }

  const heading =
    view === "day"
      ? formatDateTR(anchor)
      : view === "week"
        ? `${formatDateTR(weekStart, false)} – ${formatDateTR(addDays(weekStart, 6), false)}`
        : range === "upcoming"
          ? "Bugün ve sonrası"
          : range === "past"
            ? "Geçmiş randevular"
            : "Tüm randevular";

  return (
    <>
      <PageTitle title="Randevular" subtitle="Günlük, haftalık veya liste görünümünde filtreleyin; tek tıkla onaylayın, tamamlayın veya iptal edin." />

      {/* Araç çubuğu */}
      <Card className="mb-4 !p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1" role="tablist" aria-label="Görünüm">
            {([["day", "Günlük", <CalendarDays key="d" size={15} />], ["week", "Haftalık", <CalendarRange key="w" size={15} />], ["list", "Liste", <List key="l" size={15} />]] as const).map(([id, label, icon]) => (
              <button key={id} role="tab" aria-selected={view === id} onClick={() => setView(id)} className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${view === id ? "bg-gold-400 text-ink-950" : "text-ink-300 hover:text-white"}`}>
                {icon} {label}
              </button>
            ))}
          </div>

          {view !== "list" ? (
            <div className="flex items-center gap-1.5">
              <button onClick={() => setAnchor(addDays(anchor, -step))} aria-label="Önceki" className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 hover:border-gold-500/60"><ChevronLeft size={17} /></button>
              <input type="date" className="field !w-auto !py-1.5 text-sm" value={anchor} onChange={(e) => e.target.value && setAnchor(e.target.value)} aria-label="Tarih seç" />
              <button onClick={() => setAnchor(addDays(anchor, step))} aria-label="Sonraki" className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 hover:border-gold-500/60"><ChevronRight size={17} /></button>
              <button onClick={() => setAnchor(today)} className="btn-ghost !px-3.5 !py-1.5 text-sm">Bugün</button>
            </div>
          ) : (
            <select className="field !w-auto !py-1.5 text-sm" value={range} onChange={(e) => setRange(e.target.value as Range)} aria-label="Zaman aralığı">
              <option value="upcoming">Bugün ve sonrası</option>
              <option value="past">Geçmiş</option>
              <option value="all">Tümü</option>
            </select>
          )}

          <div className="relative ml-auto w-full sm:w-64">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input className="field !py-2 !pl-9 text-sm" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ad, telefon veya kod ara…" aria-label="Ara" />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(["all", "pending", "confirmed", "completed", "cancelled"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              aria-pressed={status === s}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${status === s ? "border-gold-400 bg-gold-400/15 text-gold-200" : "border-white/10 bg-white/5 text-ink-300 hover:border-white/25"}`}
            >
              {s !== "all" && <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[s].dot}`} />}
              {s === "all" ? "Tümü" : STATUS_LABELS[s]}
              <span className="rounded-full bg-black/30 px-1.5 text-[10px]">{counts[s]}</span>
            </button>
          ))}
        </div>
      </Card>

      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-semibold uppercase tracking-wide text-white">{heading}</h2>
        <p className="text-sm text-ink-400">
          {items.length} randevu · iptaller hariç <b className="text-gold-300">{formatPrice(summaryTotal)}</b>
        </p>
      </div>

      {!data ? (
        error ? <Empty>{error}</Empty> : <Spinner />
      ) : items.length === 0 ? (
        <Empty>Bu görünümde gösterilecek randevu yok.</Empty>
      ) : view === "week" ? (
        <WeekGrid items={items} start={weekStart} today={today} onOpen={setSelected} onDay={(d) => { setAnchor(d); setView("day"); }} />
      ) : (
        <div className={`grid gap-3 ${loading ? "opacity-60" : ""}`}>
          {items.map((a, i) => (
            <div key={a.id}>
              {view === "list" && (i === 0 || items[i - 1].date !== a.date) && (
                <p className="mb-1.5 mt-3 text-xs font-semibold uppercase tracking-wider text-gold-400">{formatDateTR(a.date)}</p>
              )}
              <AppointmentCard a={a} onStatus={change} onOpen={setSelected} busy={busyId === a.id} />
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <Modal title="Randevu Detayı" onClose={() => setSelected(null)} wide>
            <Detail a={selected} onStatus={change} busy={busyId === selected.id} onDelete={() => setDeleting(selected)} />
          </Modal>
        )}
        {deleting && (
          <ConfirmDialog
            title="Randevuyu sil"
            danger
            confirmLabel="Kalıcı Olarak Sil"
            message={<>{deleting.customerName} adına {formatDateTR(deleting.date)} {deleting.startTime} randevusu kalıcı olarak silinecek. Bu işlem geri alınamaz.</>}
            onConfirm={() => remove(deleting)}
            onCancel={() => setDeleting(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function WeekGrid({ items, start, today, onOpen, onDay }: { items: AppointmentView[]; start: string; today: string; onOpen: (a: AppointmentView) => void; onDay: (d: string) => void }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="grid gap-3 md:grid-cols-7">
      {days.map((d) => {
        const list = items.filter((a) => a.date === d);
        const isToday = d === today;
        return (
          <div key={d} className={`rounded-2xl border p-2.5 ${isToday ? "border-gold-500/50 bg-gold-400/[0.06]" : "border-white/10 bg-white/[0.03]"}`}>
            <button onClick={() => onDay(d)} className="mb-2 flex w-full items-baseline justify-between px-1 text-left" aria-label={`${formatDateTR(d)} günlük görünüm`}>
              <span className={`font-display text-lg ${isToday ? "text-gold-300" : "text-white"}`}>{WEEKDAYS_SHORT_TR[weekdayOf(d)]} {Number(d.slice(8))}</span>
              <span className="text-[11px] text-ink-400">{list.length}</span>
            </button>
            <div className="grid gap-1.5">
              {list.length === 0 && <p className="px-1 py-3 text-center text-[11px] text-ink-500">—</p>}
              {list.map((a) => (
                <button key={a.id} onClick={() => onOpen(a)} className={`rounded-lg border border-white/10 border-l-4 bg-white/[0.04] px-2.5 py-1.5 text-left transition hover:bg-white/10 ${STATUS_STYLES[a.status].bar}`}>
                  <span className="block text-xs font-bold text-gold-300">{a.startTime}</span>
                  <span className="block truncate text-xs font-medium text-white">{a.customerName}</span>
                  <span className="block truncate text-[10px] text-ink-400">{a.staffName}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Detail({ a, onStatus, busy, onDelete }: { a: AppointmentView; onStatus: (a: AppointmentView, s: AppointmentStatus) => void; busy: boolean; onDelete: () => void }) {
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-2xl text-gold-300">{formatDateTR(a.date)} · {a.startTime}–{a.endTime}</p>
          <p className="mt-1 text-xs text-ink-400">Kod: <span className="font-mono text-ink-200">{a.code}</span> · Oluşturulma: {formatCreatedAt(a.createdAt)}</p>
        </div>
        <StatusBadge status={a.status} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gold-400">Müşteri</p>
          <p className="font-semibold text-white">{a.customerName}</p>
          <p className="mt-1 text-ink-300">{formatPhone(a.customerPhone)}</p>
          {a.customerEmail && <p className="text-ink-300">{a.customerEmail}</p>}
          <div className="mt-3 flex gap-2">
            <a href={`tel:${a.customerPhone}`} className="btn-ghost !px-3 !py-1.5 text-xs"><Phone size={14} /> Ara</a>
            <a href={whatsappForAppointment(a)} target="_blank" rel="noopener noreferrer" className="btn-ghost !px-3 !py-1.5 text-xs"><MessageCircle size={14} className="text-neon-green" /> WhatsApp</a>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gold-400">Hizmetler · {a.staffName}</p>
          <ul className="grid gap-1.5">
            {a.services.map((s, i) => (
              <li key={i} className="flex justify-between gap-3 text-ink-200"><span>{s.name} <span className="text-ink-500">({formatDuration(s.duration)})</span></span><span>{formatPrice(s.price)}</span></li>
            ))}
          </ul>
          <p className="mt-3 flex justify-between border-t border-white/10 pt-2 font-semibold text-white"><span>Toplam · {formatDuration(a.duration)}</span><span className="font-display text-lg text-gold-300">{formatPrice(a.totalPrice)}</span></p>
        </div>
      </div>

      {a.note && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gold-400">Müşteri Notu</p>
          <p className="text-ink-200">{a.note}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <StatusActions a={a} onStatus={onStatus} busy={busy} />
        {a.status === "cancelled" && (
          <button onClick={onDelete} className="inline-flex items-center gap-1.5 rounded-lg border border-neon-red/40 px-3 py-2 text-sm text-red-300 hover:bg-neon-red/10"><Trash2 size={14} /> Kalıcı Sil</button>
        )}
      </div>
    </div>
  );
}
