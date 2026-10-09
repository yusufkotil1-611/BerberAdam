"use client";

import { AnimatePresence } from "framer-motion";
import { Database, Download, KeyRound, Loader2, LogOut, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { api, ApiError } from "./api";
import { useFetch } from "./hooks";
import { Card, ConfirmDialog, Field, PageTitle, useToast } from "./ui";
import type { AdminStats } from "@/lib/types";

export function Settings({ onPasswordChanged, onLogout }: { onPasswordChanged: () => void; onLogout: () => void }) {
  const toast = useToast();
  const stats = useFetch<AdminStats>("/api/admin/stats");

  // ---- Şifre değiştirme ----
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    if (newPw.length < 6) return setPwError("Yeni şifre en az 6 karakter olmalı.");
    if (newPw !== newPw2) return setPwError("Yeni şifreler birbiriyle eşleşmiyor.");
    setPwBusy(true);
    try {
      await api("/api/admin/password", { method: "POST", body: { oldPassword: oldPw, newPassword: newPw } });
      toast("Şifreniz değiştirildi. Diğer cihazlardaki oturumlar kapatıldı.");
      setOldPw("");
      setNewPw("");
      setNewPw2("");
      onPasswordChanged();
    } catch (err) {
      setPwError(err instanceof ApiError ? err.message : "Şifre değiştirilemedi.");
    } finally {
      setPwBusy(false);
    }
  }

  // ---- Demo verisi ----
  const [demoBusy, setDemoBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  async function demo(action: "seed" | "clear") {
    setDemoBusy(true);
    try {
      const res = await api<{ customers?: number; appointments?: number }>("/api/admin/demo", { method: "POST", body: { action } });
      toast(action === "seed" ? `${res.customers} müşteri ve ${res.appointments} örnek randevu yüklendi.` : "Tüm demo kayıtları (müşteri, randevu, yorum) temizlendi.", action === "seed" ? "success" : "info");
      await stats.reload();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "İşlem başarısız.", "error");
    } finally {
      setDemoBusy(false);
      setConfirmClear(false);
    }
  }

  return (
    <>
      <PageTitle title="Ayarlar" subtitle="Güvenlik, demo verisi ve oturum." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold uppercase tracking-wide text-white"><KeyRound size={18} className="text-gold-400" /> Şifre Değiştir</h2>
          <p className="mb-4 text-sm text-ink-400">Şifre bcrypt ile hashlenerek saklanır. Değiştirdiğinizde diğer cihazlardaki oturumlar kapanır.</p>
          <form onSubmit={changePassword} className="grid gap-4" noValidate>
            <Field label="Mevcut şifre"><input className="field" type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} autoComplete="current-password" maxLength={128} /></Field>
            <Field label="Yeni şifre" hint="en az 6 karakter"><input className="field" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" maxLength={128} /></Field>
            <Field label="Yeni şifre (tekrar)"><input className="field" type="password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} autoComplete="new-password" maxLength={128} /></Field>
            {pwError && <p role="alert" className="rounded-xl border border-neon-red/40 bg-neon-red/10 px-4 py-2.5 text-sm text-red-200">{pwError}</p>}
            <button type="submit" disabled={pwBusy || !oldPw || !newPw} className="btn-gold !py-3" data-sfx="none">{pwBusy ? <Loader2 size={17} className="animate-spin" /> : <ShieldCheck size={17} />} Şifreyi Güncelle</button>
          </form>
        </Card>

        <div className="grid content-start gap-4">
          <Card>
            <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold uppercase tracking-wide text-white"><Database size={18} className="text-gold-400" /> Demo Verisi</h2>
            <p className="mb-4 text-sm text-ink-400">
              Panelin nasıl göründüğünü görmek için örnek müşteri ve randevular yükleyebilirsiniz. Siteyle birlikte gelen örnek yorumlar da demo olarak işaretlidir; canlıya almadan önce tek tıkla hepsini temizleyin.
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => demo("seed")} disabled={demoBusy} className="btn-ghost !px-4 !py-2.5 text-sm">
                {demoBusy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-gold-300" />} Örnek Veri Yükle
              </button>
              <button onClick={() => setConfirmClear(true)} disabled={demoBusy || !stats.data?.hasDemoData} className="inline-flex items-center gap-2 rounded-xl border border-neon-red/40 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-neon-red/10 disabled:opacity-40">
                <Trash2 size={16} /> Demo Verilerini Temizle
              </button>
            </div>
            {stats.data && <p className="mt-3 text-xs text-ink-500">{stats.data.hasDemoData ? "Şu an demo kayıtları mevcut." : "Demo kaydı yok."}</p>}
          </Card>

          <Card>
            <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold uppercase tracking-wide text-white"><Download size={18} className="text-gold-400" /> Yedek</h2>
            <p className="mb-4 text-sm text-ink-400">
              Tüm müşteri, randevu, hizmet ve yorum verilerinizi tek bir JSON dosyası olarak indirin. Şifre özeti ve oturum anahtarı yedeğe dahil edilmez. Haftada bir indirmenizi öneririz.
            </p>
            <a href="/api/admin/export" download className="btn-ghost !px-4 !py-2.5 text-sm" data-sfx="pop"><Download size={16} /> Yedeği İndir (JSON)</a>
          </Card>

          <Card>
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold uppercase tracking-wide text-white"><LogOut size={18} className="text-gold-400" /> Oturum</h2>
            <p className="mb-3 text-sm text-ink-400">Oturum 8 saat sonra otomatik kapanır.</p>
            <button onClick={onLogout} className="btn-ghost !px-4 !py-2.5 text-sm"><LogOut size={16} /> Çıkış Yap</button>
          </Card>
        </div>
      </div>

      <AnimatePresence>
        {confirmClear && (
          <ConfirmDialog
            title="Demo verilerini temizle"
            danger
            confirmLabel="Temizle"
            message="Demo olarak işaretli tüm müşteriler, randevular ve yorumlar silinecek. Gerçek müşteri randevularınız etkilenmez."
            onConfirm={() => demo("clear")}
            onCancel={() => setConfirmClear(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
