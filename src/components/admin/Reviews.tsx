"use client";

import { Eye, EyeOff, Star } from "lucide-react";
import { Stars } from "@/components/ui";
import type { Review } from "@/lib/types";
import { api, ApiError, formatCreatedAt } from "./api";
import { useFetch } from "./hooks";
import { Card, DeleteIconButton, Empty, PageTitle, Spinner, useToast } from "./ui";

interface Payload {
  reviews: Review[];
  stats: { average: number; count: number };
}

export function Reviews() {
  const toast = useToast();
  const { data, error, setData } = useFetch<Payload>("/api/admin/reviews");

  async function toggle(r: Review) {
    try {
      setData(await api<Payload>(`/api/admin/reviews/${r.id}`, { method: "PATCH", body: { approved: !r.approved } }));
      toast(r.approved ? "Yorum yayından kaldırıldı." : "Yorum yayında.", "info");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Güncellenemedi.", "error");
    }
  }

  async function remove(r: Review) {
    try {
      setData(await api<Payload>(`/api/admin/reviews/${r.id}`, { method: "DELETE" }));
      toast("Yorum silindi.", "info");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Silinemedi.", "error");
    }
  }

  return (
    <>
      <PageTitle title="Yorumlar" subtitle="Ziyaretçi yorumları sitede anında yayınlanır; uygunsuz olanları buradan gizleyebilir veya silebilirsiniz." />
      {!data ? (
        error ? <Empty>{error}</Empty> : <Spinner />
      ) : (
        <>
          <Card className="mb-4 flex items-center gap-4">
            <Star size={28} className="fill-gold-400 text-gold-400" />
            <p className="text-sm text-ink-200">
              Yayındaki ortalama puan: <b className="font-display text-2xl text-gold-300">{data.stats.count ? data.stats.average.toFixed(1) : "—"}</b> / 5 · <b>{data.stats.count}</b> yayında yorum
            </p>
          </Card>
          {data.reviews.length === 0 ? (
            <Empty>Henüz yorum yok.</Empty>
          ) : (
            <div className="grid gap-3">
              {data.reviews.map((r) => (
                <Card key={r.id} className={`flex flex-wrap items-start justify-between gap-3 ${r.approved ? "" : "opacity-60"}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-white">{r.name}</span>
                      <Stars value={r.rating} size={14} />
                      <span className="text-xs text-ink-500">{formatCreatedAt(r.createdAt)}</span>
                      {r.isDemo && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase text-ink-400">demo</span>}
                      {!r.approved && <span className="rounded bg-neon-red/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-300">Gizli</span>}
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-200">{r.comment}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => toggle(r)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-ink-100 hover:border-gold-500/60">
                      {r.approved ? <><EyeOff size={13} /> Gizle</> : <><Eye size={13} /> Yayınla</>}
                    </button>
                    <DeleteIconButton onClick={() => remove(r)} label="Yorumu sil" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
