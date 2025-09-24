import * as React from "react";
import { TagPill } from "./TagPill";

export type RelatedItem = { text: string; gloss?: string };
export type RelatedGroup = { heading: string; items: RelatedItem[] };

/** Bảng màu cố định cho từng nhóm */
const GROUP_HUES: Record<string, number> = {
  連: 220, // xanh lam/indigo
  合: 270, // tím
  類: 190, // cyan/teal
  関: 140, // xanh lá
  対: 0, // đỏ (yêu cầu)
  慣: 30, // orange/amber
  名: 330, // pink/magenta
};

function hashToHue(str: string): number {
  let h = 0;
  for (const ch of str) {
    h = (h << 5) - h + ch.charCodeAt(0);
    h |= 0;
  }
  return ((h % 360) + 360) % 360;
}

function hueFor(heading: string) {
  return GROUP_HUES[heading] ?? hashToHue(heading);
}

function HeadingPill({ text }: { text: string }) {
  const h = hueFor(text);
  return (
    <span
      className="inline-flex items-center rounded-full border font-semibold tracking-wide px-2.5 py-0.5 text-xs"
      style={{
        backgroundColor: `hsl(${h} 92% 96%)`,
        borderColor: `hsl(${h} 80% 84%)`,
        color: `hsl(${h} 40% 22%)`,
      }}
    >
      {text}
    </span>
  );
}

export function RelatedTermsSection({
  groups,
  onSelect,
  className,
  title = "Cụm từ liên quan",
}: {
  groups: RelatedGroup[];
  onSelect?: (item: RelatedItem) => void;
  className?: string;
  title?: string;
}) {
  if (!groups?.length) return null;

  return (
    <section className={className}>
      <h3 className="mb-3 text-base font-semibold text-gray-800 dark:text-gray-100">
        {title}
      </h3>

      <div className="space-y-5">
        {groups.map((g, gi) => {
          const hue = hueFor(g.heading);
          return (
            <div
              key={`${g.heading}-${gi}`}
              className="pt-3 border-t border-gray-100 dark:border-zinc-800"
            >
              <div className="mb-2">
                <HeadingPill text={g.heading} />
              </div>

              <div className="flex flex-wrap gap-2">
                {g.items.map((it, i) => (
                  <TagPill
                    key={`${g.heading}-${i}-${it.text}`}
                    label={it.gloss ? `${it.text} — ${it.gloss}` : it.text}
                    size="sm"
                    hue={hue} // 🔴 ép cùng màu với heading
                    variant="soft"
                    onClick={onSelect ? () => onSelect(it) : undefined}
                    title={it.text}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
