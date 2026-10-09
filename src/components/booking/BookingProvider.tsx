"use client";

import { AnimatePresence } from "framer-motion";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { BookingSettings, Service, Staff, WorkingHour } from "@/lib/types";
import { BookingModal } from "./BookingModal";

export interface BookingData {
  services: Service[];
  staff: Staff[];
  hours: WorkingHour[];
  settings: BookingSettings;
  /** Tüm dükkanın kapalı olduğu özel günler (tatil vb.) */
  closedDates: { date: string; reason: string }[];
}

interface BookingContextValue {
  /** Randevu penceresini açar; isteğe bağlı olarak hizmetleri önceden seçer. */
  openBooking: (serviceIds?: number[]) => void;
}

const BookingContext = createContext<BookingContextValue>({ openBooking: () => {} });
export const useBooking = () => useContext(BookingContext);

export function BookingProvider({ data, children }: { data: BookingData; children: ReactNode }) {
  const [session, setSession] = useState<{ id: number; preselect: number[] } | null>(null);
  const counter = useRef(0);

  const openBooking = useCallback((serviceIds: number[] = []) => {
    counter.current += 1;
    setSession({ id: counter.current, preselect: serviceIds });
  }, []);
  const close = useCallback(() => setSession(null), []);

  const value = useMemo(() => ({ openBooking }), [openBooking]);

  return (
    <BookingContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {session && <BookingModal key={session.id} data={data} preselect={session.preselect} onClose={close} />}
      </AnimatePresence>
    </BookingContext.Provider>
  );
}
