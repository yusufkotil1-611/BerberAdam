"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Loader2, MessageCircle, Phone, Save, Search, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { formatDateTR, formatPhone, formatPrice } from "@/lib/time";
import type { AppointmentView, CustomerView } from "@/lib/types";
import { api, ApiError, customerWhatsapp } from "./api";
import { useFetch } from "./hooks";
import { Card, ConfirmDialog, Empty, Field, PageTitle, Spinner, StatusBadge, useToast } from "./ui";

export function Customers() {
  const toast = useToast();
  const { data, error, reload, setData } = useFetch<{ customers: CustomerView[] }>("/api/admin/customers");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<CustomerView | null>(null);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const all = data?.customers ?? [];
    if (!term) return all;
    return all.filter((c) => c.name.toLowerCase().includes(term) || c.phone.includes(term.replace(/\s/g, "")) || c.email.toLowerCase().includes(term));
  }, [data, q]);

  async function remove(c: CustomerView) {
    try {
      await api(`/api/admin/customers/${c.id}`, { method: "DELETE" });
      toast(`${c.name} ve randevu geçmişi silindi.`);
      setDeleting(null);
      setOpenId(null);
      await reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Silinemedi.", "error");
      setDeleting(null);
    }
  }

  return (
    <>
      <PageTitle
        title="Müşteriler"
        subtitle="Kim kaç kez gelmiş, telefon numaraları ve özel notlar."
        actions={
          <div className="relative w-full sm:w-72">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input className="field !py-2 !pl-9 text-sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad, telefon veya e-posta…" aria-label="Müşteri ara" />
          </div>
        }
      />

      {!data ? (
        error ? <Empty>{error}</Empty> : <Spinner />
      ) : list.length === 0 ? (
        <Empty>{data.customers.length === 0 ? "Henüz müşteri kaydı yok. Müşteriler randevu aldıkça burada otomatik oluşur." : "Aramanızla eşleşen müşteri yok."}</Empty>
      ) : (
        <Card className="!p-0 overflow-hidden">
          <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,0.7fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)_28px] gap-3 border-b border-white/10 bg-white/[0.03] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-ink-400 md:grid">
            <span>Müşteri</span><span>Telefon</span><span>Gelişi</span><span>Randevu</span><span>Harcama</span><span>Son Ziyaret</span><span />
          </div>
          <ul className="divide-y divide-white/5">
            {list.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setOpenId(openId === c.id ? null : c.id)}
                  aria-expanded={openId === c.id}
                  className="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-5 py-3.5 text-left transition hover:bg-white/[0.04] md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,0.7fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)_28px]"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 font-semibold text-white">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-300 to-gold-600 text-sm font-bold text-ink-950">{c.name.trim().charAt(0).toUpperCase()}</span>
                      <span className="truncate">{c.name}</span>
                      {c.isDemo && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase text-ink-400">demo</span>}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-400 md:hidden">{formatPhone(c.phone)} · {c.visitCount} kez geldi · {formatPrice(c.totalSpent)}</span>
                  </span>
                  <span className="hidden text-sm text-ink-200 md:block">{formatPhone(c.phone)}</span>
                  <span className="hidden text-sm md:block"><b className="text-gold-300">{c.visitCount}</b> <span className="text-ink-500">kez</span></span>
                  <span className="hidden text-sm text-ink-300 md:block">{c.totalAppointments}</span>
                  <span className="hidden text-sm text-ink-200 md:block">{formatPrice(c.totalSpent)}</span>
                  <span className="hidden text-sm text-ink-300 md:block">{c.lastVisit ? formatDateTR(c.lastVisit, false) : "—"}</span>
                  <ChevronDown size={18} className={`justify-self-end text-ink-400 transition ${openId === c.id ? "rotate-180 text-gold-300" : ""}`} />
                </button>
                <AnimatePresence initial={false}>
                  {openId === c.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <CustomerDetail
                        c={c}
                        onSaved={(updated) => setData((d) => (d ? { customers: d.customers.map((x) => (x.id === updated.id ? updated : x)) } : d))}
                        onDelete={() => setDeleting(c)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-500"><Users size={13} /> {list.length} müşteri listeleniyor.</p>

      <AnimatePresence>
        {deleting && (
          <ConfirmDialog
            title="Müşteriyi sil"
            danger
            confirmLabel="Müşteriyi ve Geçmişini Sil"
            message={<>{deleting.name} kaydı ve tüm randevu geçmişi kalıcı olarak silinecek (KVKK silme talebi için). Bu işlem geri alınamaz.</>}
            onConfirm={() => remove(deleting)}
            onCancel={() => setDeleting(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function CustomerDetail({ c, onSaved, onDelete }: { c: CustomerView; onSaved: (c: CustomerView) => void; onDelete: () => void }) {
  const toast = useToast();
  const { data, loading } = useFetch<{ appointments: AppointmentView[] }>(`/api/admin/customers/${c.id}`);
  const [notes, setNotes] = useState(c.notes);
  const [email, setEmail] = useState(c.email);
  const [saving, setSaving] = useState(false);
  const dirty = notes !== c.notes || email !== c.email;

  async function save() {
    setSaving(true);
    try {
      const res = await api<{ customer: CustomerView }>(`/api/admin/customers/${c.id}`, { method: "PATCH", body: { notes, email } });
      onSaved(res.customer);
      toast("Müşteri bilgileri kaydedildi.");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Kaydedilemedi.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5 border-t border-white/5 bg-black/20 px-5 py-5 lg:grid-cols-2">
      <div className="grid content-start gap-3">
        <Field label="E-posta">
          <input className="field text-sm" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="—" maxLength={120} />
        </Field>
        <Field label="Özel Notlar" hint="yalnızca yönetici görür">
          <textarea className="field min-h-[96px] text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Örn. yanlar 2 numara, alerjisi var, sessiz ortam sever…" maxLength={1000} />
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={save} disabled={!dirty || saving} className="btn-gold !px-5 !py-2 text-sm">{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Kaydet</button>
          <a href={`tel:${c.phone}`} className="btn-ghost !px-4 !py-2 text-sm"><Phone size={15} /> Ara</a>
          <a href={customerWhatsapp(c.phone, `Merhaba ${c.name}, BERBERADAM'dan yazıyoruz.`)} target="_blank" rel="noopener noreferrer" className="btn-ghost !px-4 !py-2 text-sm"><MessageCircle size={15} className="text-neon-green" /> WhatsApp</a>
          <button onClick={onDelete} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-neon-red/40 px-3 py-2 text-sm text-red-300 hover:bg-neon-red/10"><Trash2 size={14} /> Sil</button>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gold-400">Randevu Geçmişi</p>
        {loading && !data ? (
          <Spinner label="" />
        ) : !data || data.appointments.length === 0 ? (
          <p className="text-sm text-ink-400">Randevu kaydı yok.</p>
        ) : (
          <ul className="grid max-h-64 gap-1.5 overflow-y-auto overflow-x-hidden pr-1">
            {data.appointments.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block text-white">{formatDateTR(a.date, false)} · {a.startTime}</span>
                  <span className="block truncate text-xs text-ink-400">{a.services.map((s) => s.name).join(" + ")} · {a.staffName}</span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="text-ink-200">{formatPrice(a.totalPrice)}</span>
                  <StatusBadge status={a.status} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
