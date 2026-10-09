/** Hizmet kartlarında seçilebilen ikon anahtarları (lucide-react eşlemesi ServiceIcon bileşenindedir). */
export const SERVICE_ICON_KEYS = [
  "scissors",
  "razor",
  "sparkles",
  "crown",
  "baby",
  "droplets",
  "flame",
  "brush",
] as const;

export type ServiceIconKey = (typeof SERVICE_ICON_KEYS)[number];
