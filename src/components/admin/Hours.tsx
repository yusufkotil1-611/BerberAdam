"use client";

import { CalendarOff, Clock, Loader2, Plus, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { WEEKDAYS_TR } from "@/lib/site";
import { formatDateTR, shopNow } from "@/lib/time";
import type { BookingSettings, Closure, Staff, WorkingHour } from "@/lib/types";
import { api, ApiError } from "./api";
import { useFetch } from "./hooks";
import { Card, DeleteIconButton, Empty, Field, PageTitle, Spinner, Toggle, useToast } from "./ui";

const ORDER = [1, 2, 3, 4, 5, 6, 0]; // Pazartesi'den başla

export function Hours() {
  const toast = useToast();
  const hoursRes = useFetch<{ hours: WorkingHour[]; settings: BookingSettings }>("/api/admin/hours");
  const closuresRes = useFetch<{ closures: Closure[] }>("/api/admin/closures");
  const staffRes = useFetch<{ staff: Staff[] }>("/api/admin/staff");

  const [hours, setHours] = useState<WorkingHour[]>([]);
  const [settings, setSettings] = useState<BookingSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (hoursRes.data) {
      setHours(hoursRes.data.hours);
      setSettings(hoursRes.data.settings);
    }
  }, [hoursRes.data]);

  const dirty = useMemo(() => !!hoursRes.data && (JSON.stringify(hours) !== JSON.stringify(hoursRes.data.hours) || JSON.stringify(settings) !== JSON.stringify(hoursRes.data.settings)), [hours, settings, hoursRes.data]);

  const patch = (weekday: number, p: Partial<WorkingHour>) => setHours((cur) => cur.map((h) => (h.weekday === weekday ? { ...h, ...p } : h)));

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await api<{ hours: WorkingHour[]; settings: BookingSettings }>("/api/admin/hours", { method: "PUT", body: { hours, settings } });
      hoursRes.setData(res);
      toast("Çalışma saatleri ve doluluk ayarları kaydedildi.");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Kaydedilemedi.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!hoursRes.data || !settings) return hoursRes.error ? <Empty>{hoursRes.error}</Empty> : <Spinner />;

  return (
    <>
      <PageTitle
        title="Saatler & Doluluk"
        subtitle="Haftalık çalışma saatleri, randevu aralığı ve tatil / özel kapalı günler."
        actions={
          <button onClick={save} disabled={!dirty || saving} className="btn-gold !px-5 !py-2.5 text-sm" data-sfx="none">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Değişiklikleri Kaydet
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold uppercase tracking-wide text-white"><Clock size={18} className="text-gold-400" /> Haftalık Çalışma Saatleri</h2>
          <ul className="divide-y divide-white/5">
            {ORDER.map((wd) => {
              const h = hours.find((x) => x.weekday === wd);
              if (!h) return null;
              return (
                <li key={wd} className="flex flex-wrap items-center gap-3 py-3">
                  <label className="flex w-36 items-center gap-3 text-sm font-medium text-white">
                    <Toggle checked={h.isOpen} onChange={(v) => patch(wd, { isOpen: v })} label={`${WEEKDAYS_TR[wd]} açık`} />
                    {WEEKDAYS_TR[wd]}
                  </label>
                  {h.isOpen ? (
                    <div className="flex items-center gap-2">
                      <input type="time" className="field !w-auto !py-1.5 text-sm" value={h.openTime} onChange={(e) => patch(wd, { openTime: e.target.value })} aria-label={`${WEEKDAYS_TR[wd]} açılış`} />
                      <span className="text-ink-500">–</span>
                      <input type="time" className="field !w-auto !py-1.5 text-sm" value={h.closeTime} onChange={(e) => patch(wd, { closeTime: e.target.value })} aria-label={`${WEEKDAYS_TR[wd]} kapanış`} />
                    </div>
                  ) : (
                    <span className="text-sm text-ink-500">Kapalı</span>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="content-start">
          <h2 className="mb-4 font-display text-lg font-semibold uppercase tracking-wide text-white">Randevu Ayarları</h2>
          <div className="grid gap-4">
            <Field label="Randevu saat aralığı" hint="dakika">
              <select className="field" value={settings.slotStep} onChange={(e) => setSettings({ ...settings, slotStep: Number(e.target.value) })}>
                {[10, 15, 20, 30, 45, 60].map((n) => <option key={n} value={n}>{n} dakikada bir</option>)}
              </select>
            </Field>
            <Field label="En erken randevu" hint="bugün için, şu andan kaç dk sonra">
              <input className="field" type="number" min={0} max={1440} step={5} value={settings.minNoticeMinutes} onChange={(e) => setSettings({ ...settings, minNoticeMinutes: Math.max(0, Number(e.target.value) || 0) })} />
            </Field>
            <Field label="Kaç gün ilerisine randevu alınabilir">
              <input className="field" type="number" min={1} max={180} value={settings.horizonDays} onChange={(e) => setSettings({ ...settings, horizonDays: Math.min(180, Math.max(1, Number(e.target.value) || 1)) })} />
            </Field>
          </div>
        </Card>
      </div>

      <Closures closuresRes={closuresRes} staff={(staffRes.data?.staff ?? []).filter((s) => s.active)} />
    </>
  );
}

function Closures({ closuresRes, staff }: { closuresRes: ReturnType<typeof useFetch<{ closures: Closure[] }>>; staff: Staff[] }) {
  const toast = useToast();
  const today = useMemo(() => shopNow().date, []);
  const [date, setDate] = useState(today);
  const [allDay, setAllDay] = useState(true);
  const [start, setStart] = useState("12:00");
  const [end, setEnd] = useState("14:00");
  const [staffId, setStaffId] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api<{ closures: Closure[]; conflictingAppointments: number }>("/api/admin/closures", {
        method: "POST",
        body: { date, startTime: allDay ? null : start, endTime: allDay ? null : end, staffId: staffId ? Number(staffId) : null, reason },
      });
      closuresRes.setData({ closures: res.closures });
      setReason("");
      if (res.conflictingAppointments > 0) {
        toast(`Kapalı gün eklendi, ancak bu aralıkta ${res.conflictingAppointments} aktif randevu var. Lütfen bu müşterilerle iletişime geçin.`, "info");
      } else {
        toast("Kapalı gün eklendi; bu tarih/saat için randevu alınamaz.");
      }
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Eklenemedi.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(c: Closure) {
    try {
      await api(`/api/admin/closures/${c.id}`, { method: "DELETE" });
      closuresRes.setData({ closures: (closuresRes.data?.closures ?? []).filter((x) => x.id !== c.id) });
      toast("Kapalı gün kaldırıldı.", "info");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Silinemedi.", "error");
    }
  }

  const closures = closuresRes.data?.closures ?? [];

  return (
    <Card className="mt-4">
      <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold uppercase tracking-wide text-white"><CalendarOff size={18} className="text-gold-400" /> Tatil & Özel Kapalı Günler</h2>
      <p className="mb-5 text-sm text-ink-400">Bayram, izin veya özel durumlarda tüm günü ya da belirli bir saat aralığını (tüm dükkan veya tek personel için) randevuya kapatın.</p>

      <form onSubmit={add} className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Tarih"><input type="date" className="field" min={today} value={date} onChange={(e) => setDate(e.target.value)} required /></Field>
        <Field label="Kapsam">
          <select className="field" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
            <option value="">Tüm dükkan</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <div className="grid gap-1.5 text-sm">
          <span className="text-ink-200">Süre</span>
          <label className="flex h-[46px] items-center gap-3 text-ink-200"><Toggle checked={allDay} onChange={setAllDay} label="Tüm gün" /> Tüm gün kapalı</label>
        </div>
        <Field label="Sebep" hint="isteğe bağlı"><input className="field" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Örn. Kurban Bayramı" maxLength={100} /></Field>
        {!allDay && (
          <div className="grid grid-cols-2 gap-3 sm:col-span-2 lg:col-span-4 lg:max-w-md">
            <Field label="Başlangıç"><input type="time" className="field" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
            <Field label="Bitiş"><input type="time" className="field" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
          </div>
        )}
        <div className="sm:col-span-2 lg:col-span-4">
          <button type="submit" disabled={saving} className="btn-gold !px-5 !py-2.5 text-sm" data-sfx="none">{saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Kapalı Gün Ekle</button>
        </div>
      </form>

      <div className="mt-5">
        {closuresRes.loading && !closuresRes.data ? (
          <Spinner label="" />
        ) : closures.length === 0 ? (
          <Empty>Planlanmış kapalı gün yok.</Empty>
        ) : (
          <ul className="grid gap-2">
            {closures.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="min-w-0 text-sm">
                  <p className="font-semibold text-white">
                    {formatDateTR(c.date)}
                    <span className="ml-2 font-normal text-ink-300">{c.startTime ? `${c.startTime} – ${c.endTime}` : "Tüm gün"}</span>
                  </p>
                  <p className="truncate text-xs text-ink-400">{c.staffName ?? "Tüm dükkan"}{c.reason ? ` · ${c.reason}` : ""}{c.date < today ? " · geçmiş" : ""}</p>
                </div>
                <DeleteIconButton onClick={() => remove(c)} label="Kapalı günü kaldır" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
