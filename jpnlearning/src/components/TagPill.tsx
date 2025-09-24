import * as React from "react";

type CommonProps = {
  label: string;
  title?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Nếu truyền hue (0..359) sẽ dùng màu này, bỏ qua seed/hash */
  hue?: number;
  /** Seed cũ vẫn hoạt động nếu không truyền hue */
  seed?: string;
  /** Kiểu hiển thị */
  variant?: "soft" | "solid" | "outline";
};

type ButtonProps = CommonProps & { onClick: () => void };
type SpanProps = CommonProps & { onClick?: undefined };
export type TagPillProps = ButtonProps | SpanProps;

function cx(...a: Array<string | false | undefined>) {
  return a.filter(Boolean).join(" ");
}

function hashToHue(str: string): number {
  let h = 0;
  for (const ch of str) {
    h = (h << 5) - h + ch.charCodeAt(0);
    h |= 0;
  }
  return ((h % 360) + 360) % 360;
}

function usePrefersDark() {
  const [dark, setDark] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setDark(!!mq.matches);
    update();
    mq.addEventListener?.("change", update);
    // @ts-ignore Safari < 14
    mq.addListener?.(update);
    return () => {
      mq.removeEventListener?.("change", update);
      // @ts-ignore Safari < 14
      mq.removeListener?.(update);
    };
  }, []);
  return dark;
}

function computePalette(
  h: number,
  dark: boolean,
  variant: NonNullable<TagPillProps["variant"]>
) {
  if (variant === "solid") {
    return dark
      ? {
          bg: `hsl(${h} 65% 35%)`,
          bd: `hsl(${h} 70% 45%)`,
          fg: `hsl(${h} 100% 95%)`,
        }
      : { bg: `hsl(${h} 85% 48%)`, bd: `hsl(${h} 80% 38%)`, fg: `white` };
  }
  if (variant === "outline") {
    return dark
      ? {
          bg: "transparent",
          bd: `hsl(${h} 60% 60% / 0.6)`,
          fg: `hsl(${h} 85% 85%)`,
        }
      : {
          bg: "transparent",
          bd: `hsl(${h} 70% 45% / 0.55)`,
          fg: `hsl(${h} 40% 28%)`,
        };
  }
  // soft
  return dark
    ? {
        bg: `hsl(${h} 40% 18%)`,
        bd: `hsl(${h} 45% 32%)`,
        fg: `hsl(${h} 85% 88%)`,
      }
    : {
        bg: `hsl(${h} 92% 96%)`,
        bd: `hsl(${h} 80% 84%)`,
        fg: `hsl(${h} 45% 25%)`,
      };
}

export function TagPill(props: TagPillProps) {
  const {
    label,
    title,
    onClick,
    size = "md",
    className,
    seed,
    hue,
    variant = "soft",
  } = props;
  const dark = usePrefersDark();
  const h = typeof hue === "number" ? hue : hashToHue(seed ?? label);
  const c = computePalette(h, dark, variant);

  const pad =
    size === "lg"
      ? "px-3 py-1 text-[13px]"
      : size === "sm"
      ? "px-2 py-0.5 text-[11px]"
      : "px-2.5 py-0.5 text-xs";

  const base =
    "inline-flex items-center rounded-full border shadow-sm select-none whitespace-nowrap transition " +
    "hover:-translate-y-px active:translate-y-0";

  const common = {
    title: title ?? label,
    className: cx(base, pad, className),
    style: { backgroundColor: c.bg, color: c.fg, borderColor: c.bd },
    "data-hue": h,
  };

  return onClick ? (
    <button type="button" onClick={onClick} {...common}>
      {label}
    </button>
  ) : (
    <span {...common}>{label}</span>
  );
}

export function TagPillSpan(p: Omit<TagPillProps, "onClick">) {
  return <TagPill {...p} />;
}
