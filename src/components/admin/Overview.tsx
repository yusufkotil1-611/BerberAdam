"use client";

import { motion } from "framer-motion";
import { Bell, CalendarClock, CalendarDays, Hourglass, MessageSquare, RefreshCw, TrendingUp, Trophy, Users, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { formatDateTR, formatPrice } from "@/lib/time";
import type { AdminStats, DayRevenue, MonthRevenue } from "@/lib/types";
import { formatCreatedAt } from "./api";
import { useCountUp, useFetch, useStatusChange } from "./hooks";
import { AppointmentCard, Card, Empty, PageTitle, Spinner } from "./ui";

function Kpi({ icon, label, value, sub, money, accent, className = "" }: { icon: ReactNode; label: string; value: number; sub?: ReactNode; money?: boolean; accent?: boolean; className?: string }) {
  const shown = useCountUp(value);
  return (
    <motion.div whileHover={{ y: -4 }} className={`glass relative overflow-hidden rounded-2xl p-5 ${accent ? "border-gold-500/40" : ""} ${className}`}>
      {accent && <div aria-hidden className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gold-500/20 blur-2xl" />}
      <div className="relative flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-300">{label}</p>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gold-400/15 text-gold-300">{icon}</span>
      </div>
      <p className="relative mt-3 font-display text-4xl font-semibold text-white">{money ? formatPrice(shown) : shown}</p>
      {sub && <p className="relative mt-1 text-xs text-ink-400">{sub}</p>}
    </motion.div>
  );
}

type ChartItem = { key: string; label: string; estimated: number; realized: number; count: number; title: string; highlight?: boolean };

function RevenueChart({ items }: { items: ChartItem[] }) {
  const max = Math.max(1, ...items.map((i) => i.estimated));
  return (
    <div>
      <div className="flex h-44 items-end gap-2 sm:gap-3">
        {items.map((it, i) => {
          const hEst = (it.estimated / max) * 100;
          const hReal = it.estimated ? (it.realized / it.estimated) * 100 : 0;
          return (
            <div key={it.key} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5" title={it.title}>
              <span className="text-[10px] font-medium text-ink-300 opacity-0 transition group-hover:opacity-100 sm:text-xs">{it.estimated ? formatPrice(it.estimated) : ""}</span>
              <div className="relative flex w-full flex-1 items-end">
                <motion.div
                  className={`relative w-full overflow-hidden rounded-t-lg border border-b-0 ${it.highlight ? "border-gold-300 bg-gold-400/25" : "border-gold-500/40 bg-gold-500/15"}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(hEst, it.estimated ? 3 : 0)}%` }}
                  transition={{ duration: 0.8, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                >
                  <motion.div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gold-600 to-gold-300" initial={{ height: 0 }} animate={{ height: `${hReal}%` }} transition={{ duration: 0.9, delay: 0.3 + i * 0.06 }} />
                </motion.div>
              </div>
              <span className={`text-[11px] font-medium sm:text-xs ${it.highlight ? "text-gold-300" : "text-ink-400"}`}>{it.label}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-ink-400">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-gold-400" /> Gerçekleşen (tamamlanan)</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-gold-500/50 bg-gold-500/20" /> Tahmini toplam (iptaller hariç)</span>
      </div>
    </div>
  );
}

const dayItems = (days: DayRevenue[], today: string): ChartItem[] =>
  days.map((d) => ({ key: d.date, label: d.label, estimated: d.estimated, realized: d.realized, count: d.count, highlight: d.date === today, title: `${formatDateTR(d.date)} — ${d.count} randevu, tahmini ${formatPrice(d.estimated)}, gerçekleşen ${formatPrice(d.realized)}` }));

const monthItems = (months: MonthRevenue[], current: string): ChartItem[] =>
  months.map((m) => ({ key: m.month, label: m.label, estimated: m.estimated, realized: m.realized, count: m.count, highlight: m.month === current, title: `${m.label} — ${m.count} randevu, tahmini ${formatPrice(m.estimated)}, gerçekleşen ${formatPrice(m.realized)}` }));

export function Overview({ goTo }: { goTo: (tab: "appointments" | "settings") => void }) {
  const { data, loading, error, reload } = useFetch<AdminStats>("/api/admin/stats");
  const { change, busyId } = useStatusChange(reload);

  if (!data) return error ? <Empty>{error}</Empty> : <Spinner />;
  const s = data;
  const isEmpty = s.totalCustomers === 0 && s.upcoming.length === 0 && s.months.every((m) => m.count === 0);

  return (
    <>
      <PageTitle
        title="Genel Bakış"
        subtitle={formatDateTR(s.today.date)}
        actions={
          <button onClick={reload} className="btn-ghost !px-4 !py-2 text-sm" disabled={loading}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Yenile
          </button>
        }
      />

      {isEmpty && (
        <Card className="mb-6 border-gold-500/30">
          <p className="text-sm text-ink-200">
            Henüz randevu veya müşteri yok. Panelin nasıl göründüğünü görmek için <b className="text-gold-300">Ayarlar → Demo verisi</b> bölümünden örnek veri yükleyebilirsiniz.
          </p>
          <button onClick={() => goTo("settings")} className="btn-gold mt-3 !px-4 !py-2 text-sm">Ayarlara Git</button>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6 xl:grid-cols-5">
        <Kpi icon={<CalendarDays size={18} />} label="Bugünkü Randevu" className="lg:col-span-2 xl:col-span-1" value={s.today.total} accent sub={`${s.today.pending} bekleyen · ${s.today.confirmed} onaylı · ${s.today.completed} tamam`} />
        <Kpi icon={<Hourglass size={18} />} label="Onay Bekleyen" className="lg:col-span-2 xl:col-span-1" value={s.pendingAll} sub="Bugün ve sonrası" />
        <Kpi icon={<Users size={18} />} label="Toplam Müşteri" className="lg:col-span-2 xl:col-span-1" value={s.totalCustomers} />
        <Kpi icon={<TrendingUp size={18} />} label="Haftalık Gelir (tahmini)" className="lg:col-span-3 xl:col-span-1" value={s.weekRevenue.estimated} money sub={`Gerçekleşen: ${formatPrice(s.weekRevenue.realized)}`} />
        <Kpi icon={<Wallet size={18} />} label="Aylık Gelir (tahmini)" className="lg:col-span-3 xl:col-span-1" value={s.monthRevenue.estimated} money sub={`Gerçekleşen: ${formatPrice(s.monthRevenue.realized)}`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold uppercase tracking-wide text-white"><TrendingUp size={18} className="text-gold-400" /> Bu Hafta</h2>
          <RevenueChart items={dayItems(s.days, s.today.date)} />
        </Card>
        <Card>
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold uppercase tracking-wide text-white"><Wallet size={18} className="text-gold-400" /> Son 6 Ay</h2>
          <RevenueChart items={monthItems(s.months, s.today.date.slice(0, 7))} />
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold uppercase tracking-wide text-white"><CalendarClock size={18} className="text-gold-400" /> Yaklaşan Randevular</h2>
            <button onClick={() => goTo("appointments")} className="text-xs font-semibold uppercase tracking-wider text-gold-400 hover:text-gold-200">Tümü →</button>
          </div>
          {s.upcoming.length === 0 ? (
            <Empty>Yaklaşan randevu yok.</Empty>
          ) : (
            <div className="grid gap-3">
              {s.upcoming.map((a) => (
                <div key={a.id}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-400">{a.date === s.today.date ? "Bugün" : formatDateTR(a.date)}</p>
                  <AppointmentCard a={a} onStatus={change} busy={busyId === a.id} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="grid content-start gap-4">
          <Card>
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold uppercase tracking-wide text-white"><Trophy size={18} className="text-gold-400" /> Popüler Hizmetler</h2>
            {s.topServices.length === 0 ? (
              <Empty>Veri yok.</Empty>
            ) : (
              <ul className="grid gap-3">
                {s.topServices.map((t, i) => {
                  const pct = (t.count / s.topServices[0].count) * 100;
                  return (
                    <li key={t.name}>
                      <div className="mb-1 flex items-baseline justify-between text-sm">
                        <span className="text-white">{i + 1}. {t.name}</span>
                        <span className="text-xs text-ink-400">{t.count} adet · {formatPrice(t.revenue)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <motion.div className="h-full rounded-full bg-gradient-to-r from-gold-600 to-gold-300" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: i * 0.08 }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold uppercase tracking-wide text-white"><Bell size={18} className="text-gold-400" /> Bildirim Günlüğü</h2>
            <p className="-mt-2 mb-3 text-xs text-ink-400">SMS / WhatsApp simülasyonu — gerçek mesaj gönderilmez.</p>
            {s.notifications.length === 0 ? (
              <Empty>Henüz bildirim yok.</Empty>
            ) : (
              <ul className="grid max-h-80 gap-2.5 overflow-y-auto pr-1">
                {s.notifications.map((n) => (
                  <li key={n.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs">
                    <div className="mb-1 flex items-center justify-between text-ink-400">
                      <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-gold-400"><MessageSquare size={12} /> {n.channel === "sms" ? "SMS" : "WhatsApp"} → {n.recipient}</span>
                      <span>{formatCreatedAt(n.createdAt)}</span>
                    </div>
                    <p className="line-clamp-3 whitespace-pre-line leading-relaxed text-ink-200">{n.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
