"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  Clock,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareQuote,
  Scissors,
  Settings as SettingsIcon,
  ShieldAlert,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Logo } from "@/components/ui";
import { api } from "./api";
import { Appointments } from "./Appointments";
import { Customers } from "./Customers";
import { Hours } from "./Hours";
import { Login } from "./Login";
import { Overview } from "./Overview";
import { Reviews } from "./Reviews";
import { Settings } from "./Settings";
import { ServicesAdmin, StaffAdmin } from "./Catalog";
import { Spinner, ToastProvider } from "./ui";

type TabId = "overview" | "appointments" | "customers" | "services" | "staff" | "hours" | "reviews" | "settings";

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: "overview", label: "Genel Bakış", icon: <LayoutDashboard size={18} /> },
  { id: "appointments", label: "Randevular", icon: <CalendarDays size={18} /> },
  { id: "customers", label: "Müşteriler", icon: <Users size={18} /> },
  { id: "services", label: "Hizmet & Fiyat", icon: <Scissors size={18} /> },
  { id: "staff", label: "Personel", icon: <UserRound size={18} /> },
  { id: "hours", label: "Saatler & Doluluk", icon: <Clock size={18} /> },
  { id: "reviews", label: "Yorumlar", icon: <MessageSquareQuote size={18} /> },
  { id: "settings", label: "Ayarlar", icon: <SettingsIcon size={18} /> },
];

export function AdminApp({ siteUrl = "/" }: { siteUrl?: string }) {
  const [auth, setAuth] = useState<"loading" | "out" | "in">("loading");
  const [defaultPw, setDefaultPw] = useState(false);

  useEffect(() => {
    api<{ authenticated: boolean; usingDefaultPassword?: boolean }>("/api/admin/me")
      .then((r) => {
        setAuth(r.authenticated ? "in" : "out");
        setDefaultPw(!!r.usingDefaultPassword);
      })
      .catch(() => setAuth("out"));
    const onUnauthorized = () => setAuth("out");
    window.addEventListener("admin:unauthorized", onUnauthorized);
    return () => window.removeEventListener("admin:unauthorized", onUnauthorized);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api("/api/admin/logout", { method: "POST" });
    } finally {
      setAuth("out");
    }
  }, []);

  if (auth === "loading") return <div className="grid min-h-screen place-items-center"><Spinner /></div>;
  if (auth === "out") {
    return (
      <Login
        siteUrl={siteUrl}
        onSuccess={(isDefault) => {
          setDefaultPw(isDefault);
          setAuth("in");
        }}
      />
    );
  }
  return (
    <ToastProvider>
      <Dashboard siteUrl={siteUrl} defaultPw={defaultPw} onPasswordChanged={() => setDefaultPw(false)} onLogout={logout} />
    </ToastProvider>
  );
}

function Dashboard({ siteUrl, defaultPw, onPasswordChanged, onLogout }: { siteUrl: string; defaultPw: boolean; onPasswordChanged: () => void; onLogout: () => void }) {
  const [tab, setTab] = useState<TabId>("overview");
  const [menuOpen, setMenuOpen] = useState(false);

  // Sekmeyi URL hash'inde tut (yenilemede aynı sekmede kal)
  useEffect(() => {
    const fromHash = window.location.hash.replace("#", "") as TabId;
    if (TABS.some((t) => t.id === fromHash)) setTab(fromHash);
  }, []);
  const go = (id: TabId) => {
    setTab(id);
    setMenuOpen(false);
    history.replaceState(null, "", `#${id}`);
    window.scrollTo({ top: 0 });
  };

  const current = TABS.find((t) => t.id === tab)!;

  const nav = (
    <nav className="grid gap-1" aria-label="Yönetim menüsü">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => go(t.id)}
          aria-current={tab === t.id ? "page" : undefined}
          className={`relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition ${
            tab === t.id ? "text-gold-200" : "text-ink-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          {tab === t.id && <motion.span layoutId="admin-nav" className="absolute inset-0 rounded-xl border border-gold-500/30 bg-gold-400/10" />}
          <span className="relative">{t.icon}</span>
          <span className="relative">{t.label}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      {/* Masaüstü yan menü */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-white/10 bg-ink-900/70 p-5 backdrop-blur-xl lg:flex">
        <a href="/admin" className="mb-8 block"><Logo /></a>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        <div className="mt-4 grid gap-2 border-t border-white/10 pt-4">
          <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm text-ink-300 hover:bg-white/5 hover:text-white">
            <ExternalLink size={16} /> Siteyi Aç
          </a>
          <button onClick={onLogout} className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm text-ink-300 hover:bg-neon-red/10 hover:text-red-300">
            <LogOut size={16} /> Çıkış Yap
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Mobil üst çubuk */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-ink-950/85 px-4 py-3 backdrop-blur-xl lg:hidden">
          <button onClick={() => setMenuOpen(true)} aria-label="Menüyü aç" className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5">
            <Menu size={20} />
          </button>
          <span className="font-display text-lg uppercase tracking-wider text-white">{current.label}</span>
          <button onClick={onLogout} aria-label="Çıkış yap" className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-ink-300">
            <LogOut size={18} />
          </button>
        </header>

        <AnimatePresence>
          {menuOpen && (
            <motion.div className="fixed inset-0 z-40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="absolute inset-0 bg-black/70" onClick={() => setMenuOpen(false)} />
              <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: "spring", stiffness: 300, damping: 32 }} className="glass-strong absolute inset-y-0 left-0 w-72 p-5">
                <div className="mb-6 flex items-center justify-between">
                  <Logo />
                  <button onClick={() => setMenuOpen(false)} aria-label="Kapat" className="grid h-9 w-9 place-items-center rounded-full border border-white/10"><X size={17} /></button>
                </div>
                {nav}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
          {defaultPw && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              <span className="flex items-center gap-2">
                <ShieldAlert size={18} className="shrink-0 text-amber-300" />
                Varsayılan şifreyi (000000) kullanıyorsunuz. Güvenliğiniz için şifrenizi şimdi değiştirin.
              </span>
              <button onClick={() => go("settings")} className="btn-gold !px-4 !py-2 text-xs">Şifreyi Değiştir</button>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {tab === "overview" && <Overview goTo={go} />}
              {tab === "appointments" && <Appointments />}
              {tab === "customers" && <Customers />}
              {tab === "services" && <ServicesAdmin />}
              {tab === "staff" && <StaffAdmin />}
              {tab === "hours" && <Hours />}
              {tab === "reviews" && <Reviews />}
              {tab === "settings" && <Settings onPasswordChanged={onPasswordChanged} onLogout={onLogout} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
