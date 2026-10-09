"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { playSfx, type SfxName } from "@/lib/sound";

interface SoundContextValue {
  enabled: boolean;
  toggle: () => void;
  play: (name: SfxName) => void;
}

const SoundContext = createContext<SoundContextValue>({ enabled: false, toggle: () => {}, play: () => {} });
export const useSound = () => useContext(SoundContext);

const STORAGE_KEY = "berberadam:sound";

/**
 * Ses durumunu (açık/kapalı) tutar ve tüm sitede tıklama sesini otomatik çalar:
 *  - <button>, <a>, [role=button], <summary>, label[for] → "tık"
 *  - data-sfx="snip" | "swipe" | "none" | ... ile öğe bazında özelleştirilebilir
 */
export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(true);
  const enabledRef = useRef(true);

  // Kayıtlı tercihi oku (sunucu/istemci uyuşmazlığını önlemek için mount sonrası)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "off") {
        enabledRef.current = false;
        setEnabled(false);
      }
    } catch {
      /* localStorage kapalı olabilir */
    }
  }, []);

  const play = useCallback((name: SfxName) => {
    if (enabledRef.current) playSfx(name);
  }, []);

  const toggle = useCallback(() => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    setEnabled(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
    } catch {
      /* yoksay */
    }
    if (next) playSfx("toggle");
  }, []);

  // Global tıklama sesi
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!enabledRef.current) return;
      const target = e.target as HTMLElement | null;
      const el = target?.closest<HTMLElement>("[data-sfx], button, a[href], [role='button'], summary, label[for]");
      if (!el) return;
      if ((el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true") return;
      const custom = el.getAttribute("data-sfx");
      if (custom === "none") return;
      playSfx((custom as SfxName) || "click");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const value = useMemo(() => ({ enabled, toggle, play }), [enabled, toggle, play]);
  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}
