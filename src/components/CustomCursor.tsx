"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const INTERACTIVE = "a[href], button, [role='button'], summary, label[for], select, [data-cursor='hover']";
const TEXT_FIELDS = "input:not([type='checkbox']):not([type='radio']):not([type='range']), textarea";

/**
 * Özel imleç: küçük bir altın nokta + onu yumuşakça takip eden halka.
 * Tıklanabilir öğelerin üzerinde halka büyür ve parlar. Dokunmatik cihazlarda ve /admin altında devre dışıdır.
 */
export function CustomCursor() {
  const pathname = usePathname();
  const disabled = pathname.startsWith("/admin");
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [hidden, setHidden] = useState(true);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 220, damping: 22, mass: 0.5 });
  const ringY = useSpring(y, { stiffness: 220, damping: 22, mass: 0.5 });

  useEffect(() => {
    if (disabled) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!fine.matches) return;
    setEnabled(true);
    document.documentElement.classList.add("has-custom-cursor");

    const onMove = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setHidden(false);
      const t = e.target as HTMLElement | null;
      setHovering(!!t?.closest(INTERACTIVE));
      // Metin kutularında özel imleci gizle, normal I-beam görünsün
      if (t?.closest(TEXT_FIELDS)) setHidden(true);
    };
    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);
    const onLeave = () => setHidden(true);

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      document.documentElement.classList.remove("has-custom-cursor");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      setEnabled(false);
    };
  }, [disabled, x, y]);

  if (disabled || !enabled) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[9999]">
      <motion.div
        className="absolute left-0 top-0 rounded-full border border-gold-400/80"
        style={{ x: ringX, y: ringY, translateX: "-50%", translateY: "-50%" }}
        animate={{
          width: hovering ? 58 : pressed ? 22 : 34,
          height: hovering ? 58 : pressed ? 22 : 34,
          opacity: hidden ? 0 : 1,
          backgroundColor: hovering ? "rgba(242,195,90,0.14)" : "rgba(242,195,90,0)",
          boxShadow: hovering ? "0 0 26px rgba(242,195,90,0.55)" : "0 0 10px rgba(242,195,90,0.25)",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
      />
      <motion.div
        className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-gold-300"
        style={{ x, y, translateX: "-50%", translateY: "-50%" }}
        animate={{ opacity: hidden ? 0 : 1, scale: hovering ? 0.5 : 1 }}
        transition={{ duration: 0.15 }}
      />
    </div>
  );
}
