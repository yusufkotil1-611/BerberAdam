"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSound } from "@/components/SoundProvider";
import type { AppointmentStatus } from "@/lib/site";
import type { AppointmentView } from "@/lib/types";
import { api, ApiError } from "./api";
import { useToast } from "./ui";

/** GET isteğini yükleme/hata durumlarıyla yönetir. */
export function useFetch<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reqId = useRef(0);

  const reload = useCallback(async () => {
    if (!url) return;
    const id = ++reqId.current;
    setLoading(true);
    try {
      const res = await api<T>(url);
      if (id === reqId.current) {
        setData(res);
        setError(null);
      }
    } catch (e) {
      if (id === reqId.current) setError(e instanceof ApiError ? e.message : "Veriler yüklenemedi.");
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, setData, error, loading, reload };
}

/** Randevu durumunu değiştirir; başarıda ses + bildirim gösterir. */
export function useStatusChange(onDone: () => void | Promise<void>) {
  const toast = useToast();
  const { play } = useSound();
  const [busyId, setBusyId] = useState<number | null>(null);

  const change = useCallback(
    async (a: AppointmentView, status: AppointmentStatus) => {
      setBusyId(a.id);
      try {
        await api(`/api/admin/appointments/${a.id}`, { method: "PATCH", body: { status } });
        if (status === "confirmed") play("success");
        const label = { pending: "bekleyen olarak işaretlendi", confirmed: "onaylandı", completed: "tamamlandı olarak işaretlendi", cancelled: "iptal edildi" }[status];
        toast(`${a.customerName} randevusu ${label}.`, status === "cancelled" ? "info" : "success");
        await onDone();
      } catch (e) {
        toast(e instanceof ApiError ? e.message : "İşlem başarısız.", "error");
      } finally {
        setBusyId(null);
      }
    },
    [onDone, toast, play],
  );

  return { change, busyId };
}

/** Sayıyı 0'dan hedefe doğru akıcı biçimde artırır. */
export function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}
