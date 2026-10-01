import type { CSSProperties, HTMLAttributes, PropsWithChildren } from "react";
import { forwardRef, useEffect, useRef, useState } from "react";

type GlassCardProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>> & {
  variant?: "flat" | "elevated" | "glowing";
};

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(function GlassCard(
  { children, className = "", variant = "elevated", ...props },
  ref,
) {
  return (
    <div ref={ref} className={`glass-card glass-card--${variant} ${className}`} {...props}>
      <div className="glass-card__sheen" aria-hidden="true" />
      {children}
    </div>
  );
});

export function TiltCard({ children, className = "", ...props }: GlassCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({});

  useEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const handleMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const bounds = node.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      setStyle({
        transform: `perspective(900px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg)`,
        "--pointer-x": `${((x + 0.5) * 100).toFixed(1)}%`,
        "--pointer-y": `${((y + 0.5) * 100).toFixed(1)}%`,
      } as CSSProperties);
    };
    const reset = () => setStyle({});
    node.addEventListener("pointermove", handleMove);
    node.addEventListener("pointerleave", reset);
    return () => {
      node.removeEventListener("pointermove", handleMove);
      node.removeEventListener("pointerleave", reset);
    };
  }, []);

  return (
    <GlassCard ref={ref} className={`tilt-card ${className}`} style={style} {...props}>
      {children}
    </GlassCard>
  );
}
