"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useSound } from "@/components/SoundProvider";
import { Logo } from "@/components/ui";
import { api, ApiError } from "./api";

export function Login({ onSuccess, siteUrl = "/" }: { onSuccess: (usingDefaultPassword: boolean) => void; siteUrl?: string }) {
  const { play } = useSound();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ usingDefaultPassword: boolean }>("/api/admin/login", { method: "POST", body: { password } });
      play("success");
      onSuccess(res.usingDefaultPassword);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Giriş yapılamadı.");
      setShake((n) => n + 1);
      setPassword("");
      play("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4">
      <div aria-hidden className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-gold-500/15 blur-[120px]" />
      <motion.div
        key={shake}
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1, x: shake ? [0, -12, 12, -8, 8, 0] : 0 }}
        transition={{ duration: shake ? 0.45 : 0.6 }}
        className="glass-strong relative w-full max-w-md rounded-3xl p-8"
      >
        <div className="mb-6 flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="mb-6 text-center">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-gold-400/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">
            <ShieldCheck size={14} /> Yönetim Paneli
          </span>
          <p className="text-sm text-ink-300">Devam etmek için yönetici şifrenizi girin.</p>
        </div>

        <form onSubmit={submit} className="grid gap-4" noValidate>
          <label className="grid gap-1.5 text-sm">
            <span className="text-ink-200">Şifre</span>
            <div className="relative">
              <Lock size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                className="field !pl-10 !pr-11 tracking-widest"
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                autoComplete="current-password"
                autoFocus
                maxLength={128}
                aria-invalid={!!error}
              />
              <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Şifreyi gizle" : "Şifreyi göster"} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-ink-400 hover:text-gold-300">
                {show ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>
          {error && (
            <p role="alert" className="rounded-xl border border-neon-red/40 bg-neon-red/10 px-4 py-2.5 text-sm text-red-200">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading || !password} className="btn-gold !py-3.5" data-sfx="none">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />} Giriş Yap
          </button>
        </form>

        <a href={siteUrl} className="mt-6 inline-flex items-center gap-1.5 text-sm text-ink-400 transition hover:text-gold-300">
          <ArrowLeft size={15} /> Siteye dön
        </a>
      </motion.div>
    </div>
  );
}
