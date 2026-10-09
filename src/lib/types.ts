/** Hem sunucu hem istemci tarafında ortak kullanılan veri tipleri. */
import type { AppointmentStatus } from "./site";

export type { AppointmentStatus };

export interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  duration: number;
  icon: string;
  popular: boolean;
  active: boolean;
  sortOrder: number;
}

export interface Staff {
  id: number;
  name: string;
  title: string;
  active: boolean;
  sortOrder: number;
}

export interface WorkingHour {
  weekday: number; // 0 = Pazar … 6 = Cumartesi
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface BookingSettings {
  /** Randevu saatlerinin dakika cinsinden aralığı (örn. 30) */
  slotStep: number;
  /** Bugün için, şu andan en az kaç dakika sonrasına randevu verilebilir */
  minNoticeMinutes: number;
  /** Kaç gün ilerisine randevu alınabilir */
  horizonDays: number;
}

export interface Closure {
  id: number;
  date: string;
  startTime: string | null;
  endTime: string | null;
  staffId: number | null;
  staffName: string | null;
  reason: string;
}

export interface Review {
  id: number;
  name: string;
  rating: number;
  comment: string;
  createdAt: string;
  approved: boolean;
  isDemo: boolean;
}

export type SlotReason = "busy" | "past" | "closed";
export interface Slot {
  time: string;
  available: boolean;
  reason?: SlotReason;
}

export interface AvailabilityResult {
  date: string;
  open: boolean;
  message?: string;
  openTime?: string;
  closeTime?: string;
  slots: Slot[];
}

export interface AppointmentView {
  id: number;
  code: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalPrice: number;
  status: AppointmentStatus;
  note: string;
  createdAt: string;
  isDemo: boolean;
  staffId: number;
  staffName: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  services: { name: string; price: number; duration: number }[];
}

export interface CustomerView {
  id: number;
  name: string;
  phone: string;
  email: string;
  notes: string;
  createdAt: string;
  isDemo: boolean;
  visitCount: number; // tamamlanan randevu sayısı
  totalAppointments: number; // iptaller hariç
  totalSpent: number; // tamamlananların toplamı
  lastVisit: string | null;
}

export interface NotificationLog {
  id: number;
  appointmentId: number | null;
  channel: "sms" | "whatsapp";
  recipient: string;
  message: string;
  createdAt: string;
}

export interface BookingConfirmation {
  code: string;
  date: string;
  startTime: string;
  endTime: string;
  staffName: string;
  customerName: string;
  customerPhone: string;
  totalPrice: number;
  duration: number;
  services: { name: string; price: number; duration: number }[];
  smsMessage: string;
  whatsappMessage: string;
}

export interface DayRevenue {
  date: string;
  label: string;
  estimated: number;
  realized: number;
  count: number;
}

export interface MonthRevenue {
  month: string; // YYYY-MM
  label: string;
  estimated: number;
  realized: number;
  count: number;
}

export interface AdminStats {
  today: { date: string; total: number; pending: number; confirmed: number; completed: number; cancelled: number };
  totalCustomers: number;
  pendingAll: number;
  upcoming: AppointmentView[];
  weekRevenue: { estimated: number; realized: number };
  monthRevenue: { estimated: number; realized: number };
  days: DayRevenue[];
  months: MonthRevenue[];
  topServices: { name: string; count: number; revenue: number }[];
  notifications: NotificationLog[];
  hasDemoData: boolean;
}
