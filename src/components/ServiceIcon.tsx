import { Baby, Brush, Crown, Droplets, Flame, Scissors, Sparkles, type LucideProps } from "lucide-react";

/** Ustura için özel ikon (lucide'de yok) */
function RazorIcon({ size = 24, strokeWidth = 2, ...rest }: LucideProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d="M3 12.5 L14 12.5 L16.5 8 L5.5 8 Z" />
      <path d="M16 10.2 H20.5 a1.4 1.4 0 0 1 0 2.8 H16" />
    </svg>
  );
}

const ICONS = {
  scissors: Scissors,
  razor: RazorIcon,
  sparkles: Sparkles,
  crown: Crown,
  baby: Baby,
  droplets: Droplets,
  flame: Flame,
  brush: Brush,
} as const;

export function ServiceIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name as keyof typeof ICONS] ?? Scissors;
  return <Icon {...props} />;
}
