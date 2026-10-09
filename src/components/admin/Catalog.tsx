"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Clock, EyeOff, Flame, Loader2, Pencil, Plus, Save } from "lucide-react";
import { useState } from "react";
import { ServiceIcon } from "@/components/ServiceIcon";
import { SERVICE_ICON_KEYS } from "@/lib/service-icons";
import { formatDuration, formatPrice } from "@/lib/time";
import type { Service, Staff } from "@/lib/types";
import { api, ApiError } from "./api";
import { useFetch } from "./hooks";
import { Card, ConfirmDialog, DeleteIconButton, Empty, Field, Modal, PageTitle, Spinner, Toggle, useToast } from "./ui";

// ===========================================================================
// Hizmet & Fiyat yönetimi
// ===========================================================================
type ServiceForm = { id?: number; name: string; description: string; price: string; duration: string; icon: string; popular: boolean; active: boolean };
const EMPTY_SERVICE: ServiceForm = { name: "", description: "", price: "", duration: "30", icon: "scissors", popular: false, active: true };

export function ServicesAdmin() {
  const toast = useToast();
  const { data, error, setData } = useFetch<{ services: Service[] }>("/api/admin/services");
  const [editing, setEditing] = useState<ServiceForm | null>(null);
  const [deleting, setDeleting] = useState<Service | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!editing) return;
    const price = Number(editing.price);
    const duration = Number(editing.duration);
    if (!editing.name.trim()) return toast("Hizmet adı gerekli.", "error");
    if (!Number.isInteger(price) || price < 0) return toast("Fiyat geçerli bir tam sayı olmalı.", "error");
    if (!Number.isInteger(duration) || duration < 5) return toast("Süre en az 5 dakika olmalı.", "error");

    setSaving(true);
    try {
      const body = { name: editing.name, description: editing.description, price, duration, icon: editing.icon, popular: editing.popular, active: editing.active };
      const res = editing.id
        ? await api<{ services: Service[] }>(`/api/admin/services/${editing.id}`, { method: "PUT", body })
        : await api<{ services: Service[] }>("/api/admin/services", { method: "POST", body });
      setData(res);
      toast(editing.id ? "Hizmet güncellendi." : "Yeni hizmet eklendi.");
      setEditing(null);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Kaydedilemedi.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(s: Service) {
    try {
      const res = await api<{ services: Service[] }>(`/api/admin/services/${s.id}`, { method: "DELETE" });
      setData(res);
      toast(`${s.name} silindi.`, "info");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Silinemedi.", "error");
    } finally {
      setDeleting(null);
    }
  }

  async function quickToggle(s: Service, active: boolean) {
    try {
      const res = await api<{ services: Service[] }>(`/api/admin/services/${s.id}`, {
        method: "PUT",
        body: { name: s.name, description: s.description, price: s.price, duration: s.duration, icon: s.icon, popular: s.popular, active },
      });
      setData(res);
      toast(active ? `${s.name} sitede yayında.` : `${s.name} sitede gizlendi.`, "info");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Güncellenemedi.", "error");
    }
  }

  return (
    <>
      <PageTitle
        title="Hizmet & Fiyat"
        subtitle="Sitede ve randevu formunda görünen hizmetler. Fiyat/süre değişiklikleri yeni randevulara uygulanır; geçmiş randevular etkilenmez."
        actions={<button onClick={() => setEditing({ ...EMPTY_SERVICE })} className="btn-gold !px-5 !py-2.5 text-sm"><Plus size={16} /> Yeni Hizmet</button>}
      />

      {!data ? (
        error ? <Empty>{error}</Empty> : <Spinner />
      ) : data.services.length === 0 ? (
        <Empty>Henüz hizmet yok. “Yeni Hizmet” ile ekleyin.</Empty>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.services.map((s) => (
            <motion.div layout key={s.id}>
              <Card className={`flex items-start gap-4 ${s.active ? "" : "opacity-60"}`}>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-gold-300 to-gold-600 text-ink-950"><ServiceIcon name={s.icon} size={22} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate font-semibold text-white">{s.name}</h3>
                    <p className="font-display text-xl text-gold-300">{formatPrice(s.price)}</p>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-ink-300">{s.description || "—"}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-400">
                    <span className="inline-flex items-center gap-1"><Clock size={12} /> {formatDuration(s.duration)}</span>
                    {s.popular && <span className="inline-flex items-center gap-1 rounded-full bg-neon-red/15 px-2 py-0.5 text-red-300"><Flame size={11} /> Çok tercih edilen</span>}
                    {!s.active && <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5"><EyeOff size={11} /> Gizli</span>}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-xs text-ink-300"><Toggle checked={s.active} onChange={(v) => quickToggle(s, v)} label={`${s.name} yayında`} /> Yayında</label>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setEditing({ id: s.id, name: s.name, description: s.description, price: String(s.price), duration: String(s.duration), icon: s.icon, popular: s.popular, active: s.active })} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-ink-100 hover:border-gold-500/60"><Pencil size={13} /> Düzenle</button>
                      <DeleteIconButton onClick={() => setDeleting(s)} label={`${s.name} hizmetini sil`} />
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {editing && (
          <Modal title={editing.id ? "Hizmeti Düzenle" : "Yeni Hizmet"} onClose={() => setEditing(null)}>
            <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void save(); }}>
              <Field label="Hizmet adı">
                <input className="field" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} maxLength={60} autoFocus />
              </Field>
              <Field label="Açıklama" hint="kartta görünür">
                <textarea className="field min-h-[76px]" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} maxLength={200} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Fiyat (₺)">
                  <input className="field" type="number" inputMode="numeric" min={0} step={10} value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} />
                </Field>
                <Field label="Süre (dk)">
                  <input className="field" type="number" inputMode="numeric" min={5} step={5} value={editing.duration} onChange={(e) => setEditing({ ...editing, duration: e.target.value })} />
                </Field>
              </div>
              <div>
                <p className="mb-1.5 text-sm text-ink-200">İkon</p>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_ICON_KEYS.map((k) => (
                    <button type="button" key={k} onClick={() => setEditing({ ...editing, icon: k })} aria-pressed={editing.icon === k} aria-label={`${k} ikonu`} className={`grid h-11 w-11 place-items-center rounded-xl border transition ${editing.icon === k ? "border-gold-400 bg-gold-400 text-ink-950" : "border-white/10 bg-white/5 text-ink-200 hover:border-gold-500/50"}`}>
                      <ServiceIcon name={k} size={20} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm text-ink-200"><Toggle checked={editing.popular} onChange={(v) => setEditing({ ...editing, popular: v })} label="Çok tercih edilen" /> Çok tercih edilen etiketi</label>
                <label className="flex items-center gap-2 text-sm text-ink-200"><Toggle checked={editing.active} onChange={(v) => setEditing({ ...editing, active: v })} label="Yayında" /> Sitede yayında</label>
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setEditing(null)} className="btn-ghost !px-5 !py-2.5 text-sm">Vazgeç</button>
                <button type="submit" disabled={saving} className="btn-gold !px-6 !py-2.5 text-sm" data-sfx="none">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Kaydet</button>
              </div>
            </form>
          </Modal>
        )}
        {deleting && (
          <ConfirmDialog title="Hizmeti sil" danger confirmLabel="Sil" message={<>“{deleting.name}” hizmeti silinecek. Geçmiş randevulardaki hizmet adı ve fiyatı korunur. Geçici olarak gizlemek için “Yayında” anahtarını kapatabilirsiniz.</>} onConfirm={() => remove(deleting)} onCancel={() => setDeleting(null)} />
        )}
      </AnimatePresence>
    </>
  );
}

// ===========================================================================
// Personel yönetimi
// ===========================================================================
type StaffForm = { id?: number; name: string; title: string; active: boolean };

export function StaffAdmin() {
  const toast = useToast();
  const { data, error, setData } = useFetch<{ staff: Staff[] }>("/api/admin/staff");
  const [editing, setEditing] = useState<StaffForm | null>(null);
  const [deleting, setDeleting] = useState<Staff | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!editing) return;
    if (editing.name.trim().length < 2) return toast("İsim en az 2 karakter olmalı.", "error");
    setSaving(true);
    try {
      const body = { name: editing.name, title: editing.title, active: editing.active };
      const res = editing.id
        ? await api<{ staff: Staff[] }>(`/api/admin/staff/${editing.id}`, { method: "PUT", body })
        : await api<{ staff: Staff[] }>("/api/admin/staff", { method: "POST", body });
      setData(res);
      toast(editing.id ? "Personel güncellendi." : "Personel eklendi.");
      setEditing(null);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Kaydedilemedi.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(s: Staff) {
    try {
      const res = await api<{ staff: Staff[] }>(`/api/admin/staff/${s.id}`, { method: "DELETE" });
      setData(res);
      toast(`${s.name} silindi.`, "info");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Silinemedi.", "error");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      <PageTitle
        title="Personel"
        subtitle="Randevu formunda seçilebilen berberler. Randevu geçmişi olan personel silinemez; pasif yapın."
        actions={<button onClick={() => setEditing({ name: "", title: "", active: true })} className="btn-gold !px-5 !py-2.5 text-sm"><Plus size={16} /> Yeni Personel</button>}
      />
      {!data ? (
        error ? <Empty>{error}</Empty> : <Spinner />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.staff.map((s) => (
            <Card key={s.id} className={`flex items-center gap-4 ${s.active ? "" : "opacity-60"}`}>
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-gold-400/60 bg-gradient-to-br from-ink-600 to-ink-800 font-display text-2xl text-gold-300">{s.name.trim().charAt(0).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold text-white">{s.name}</h3>
                <p className="truncate text-xs text-ink-300">{s.title || "Berber"}</p>
                {!s.active && <p className="mt-1 text-xs text-ink-500">Pasif — randevu formunda görünmez</p>}
                <div className="mt-2 flex items-center gap-1.5">
                  <button onClick={() => setEditing({ id: s.id, name: s.name, title: s.title, active: s.active })} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-ink-100 hover:border-gold-500/60"><Pencil size={13} /> Düzenle</button>
                  <DeleteIconButton onClick={() => setDeleting(s)} label={`${s.name} personelini sil`} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AnimatePresence>
        {editing && (
          <Modal title={editing.id ? "Personeli Düzenle" : "Yeni Personel"} onClose={() => setEditing(null)}>
            <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void save(); }}>
              <Field label="İsim"><input className="field" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} maxLength={60} autoFocus placeholder="Örn. Ahmet Usta" /></Field>
              <Field label="Unvan / Uzmanlık" hint="isteğe bağlı"><input className="field" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} maxLength={80} placeholder="Örn. Kıdemli Usta Berber" /></Field>
              <label className="flex items-center gap-2 text-sm text-ink-200"><Toggle checked={editing.active} onChange={(v) => setEditing({ ...editing, active: v })} label="Aktif" /> Aktif (randevu alınabilir)</label>
              <div className="mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setEditing(null)} className="btn-ghost !px-5 !py-2.5 text-sm">Vazgeç</button>
                <button type="submit" disabled={saving} className="btn-gold !px-6 !py-2.5 text-sm" data-sfx="none">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Kaydet</button>
              </div>
            </form>
          </Modal>
        )}
        {deleting && <ConfirmDialog title="Personeli sil" danger confirmLabel="Sil" message={<>{deleting.name} silinecek. Randevu geçmişi varsa silinemez; bu durumda “Düzenle” ile pasif yapabilirsiniz.</>} onConfirm={() => remove(deleting)} onCancel={() => setDeleting(null)} />}
      </AnimatePresence>
    </>
  );
}
