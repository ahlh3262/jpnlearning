// src/components/VocabularyDetailModal.tsx
import * as React from "react";
import {
  RelatedTermsSection,
  RelatedGroup,
} from "@/components/RelatedTermsSection";

type Collocation = { jp: string; vi?: string };
type Collocations = {
  ren?: Collocation[];
  go?: Collocation[];
  rui?: Collocation[];
  kan?: Collocation[];
  tai?: Collocation[];
  kanyo?: Collocation[];
  mei?: Collocation[];
};

type VocabularyItem = {
  id: string;
  kanji: string;
  hiragana?: string;
  meaning?: string;
  example?: string | string[];
  exampleMeaning?: string | string[];
  collocations?: Collocations;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** Có thể null khi chưa chọn item */
  item?: VocabularyItem | null;
};

function toArray<T>(v?: T | T[] | null): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function toRelatedGroups(collocations?: Collocations): RelatedGroup[] {
  const groups: RelatedGroup[] = [];
  if (!collocations) return groups;
  if (collocations.ren?.length)
    groups.push({
      heading: "連",
      items: collocations.ren.map((c) => ({ text: c.jp, gloss: c.vi })),
    });
  if (collocations.go?.length)
    groups.push({
      heading: "合",
      items: collocations.go.map((c) => ({ text: c.jp, gloss: c.vi })),
    });
  if (collocations.rui?.length)
    groups.push({
      heading: "類",
      items: collocations.rui.map((c) => ({ text: c.jp, gloss: c.vi })),
    });
  if (collocations.kan?.length)
    groups.push({
      heading: "関",
      items: collocations.kan.map((c) => ({ text: c.jp, gloss: c.vi })),
    });
  if (collocations.tai?.length)
    groups.push({
      heading: "対",
      items: collocations.tai.map((c) => ({ text: c.jp, gloss: c.vi })),
    });
  if (collocations?.kanyo?.length) 
    groups.push({ 
      heading: "慣",
       items: collocations.kanyo.map(c => ({ text: c.jp, gloss: c.vi })) 
    });
  if (collocations?.mei?.length)
    groups.push({ 
      heading: "名", 
       items: collocations.mei.map(c => ({ text: c.jp, gloss: c.vi })) 
    });
  return groups;
}

function useEscapeToClose(enabled: boolean, onClose: () => void) {
  React.useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, onClose]);
}

function speakJP(text?: string) {
  if (!text) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const jp = voices.find((v) => /ja-JP/i.test(v.lang));
  if (jp) u.voice = jp;
  u.lang = jp?.lang ?? "ja-JP";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

export default function VocabularyDetailModal({ open, onClose, item }: Props) {
  useEscapeToClose(open, onClose);
  const overlayRef = React.useRef<HTMLDivElement | null>(null);

  // ✅ Guard: nếu chưa có item thì không render nội dung để tránh lỗi runtime
  if (!open || !item) return null;

  const examplesJP = toArray(item.example);
  const examplesVI = toArray(item.exampleMeaning);
  const related = toRelatedGroups(item.collocations);

  const onOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) onClose();
  };

  return (
    <div
      ref={overlayRef}
      onClick={onOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      aria-modal="true"
      role="dialog"
    >
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="text-6xl font-extrabold leading-none tracking-tight">
              {item.kanji}
            </div>
            {item.hiragana ? (
              <div className="mt-1 text-xl font-medium text-violet-600">
                {item.hiragana}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => speakJP(item.hiragana || item.kanji)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-violet-50 text-violet-600 ring-1 ring-violet-200 hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-800"
              title="Phát âm"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M3 10v4a1 1 0 0 0 1 1h3l4 3a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1l-4 3H4a1 1 0 0 0-1 1z" />
                <path d="M16.5 8.1a1 1 0 0 0-1.4 1.4 3 3 0 0 1 0 4.2 1 1 0 1 0 1.4 1.4 5 5 0 0 0 0-7z" />
                <path d="M19.5 5.6a1 1 0 1 0-1.4 1.4 7 7 0 0 1 0 10 1 1 0 1 0 1.4 1.4 9 9 0 0 0 0-12.8z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700"
              title="Đóng"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7A1 1 0 0 0 5.7 7.1L10.6 12l-4.9 4.9a1 1 0 1 0 1.4 1.4L12 13.4l4.9 4.9a1 1 0 0 0 1.4-1.4L13.4 12l4.9-4.9a1 1 0 0 0 0-1.4z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Nghĩa */}
        {item.meaning ? (
          <div className="mb-6">
            <div className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
              Nghĩa
            </div>
            <div className="rounded-xl bg-gray-50 p-3 text-gray-800 ring-1 ring-gray-200 dark:bg-zinc-800 dark:text-gray-200 dark:ring-zinc-700">
              {item.meaning}
            </div>
          </div>
        ) : null}

        {/* Ví dụ */}
        {(examplesJP.length > 0 || examplesVI.length > 0) && (
          <div className="mb-6">
            <div className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
              Ví dụ
            </div>
            <div className="space-y-2">
              {Array.from({
                length: Math.max(examplesJP.length, examplesVI.length),
              }).map((_, i) => {
                const jp = examplesJP[i];
                const vi = examplesVI[i];
                return (
                  <div key={i} className="space-y-2">
                    {jp ? (
                      <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-gray-100">
                        {jp}
                      </div>
                    ) : null}
                    {vi ? (
                      <div className="rounded-xl border border-gray-200 bg-white/60 px-3 py-2 text-gray-700 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-gray-300">
                        {vi}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cụm từ liên quan */}
        {related.length > 0 && (
          <RelatedTermsSection
            className="mt-4"
            groups={related}
            onSelect={(it) => speakJP(it.text)}
          />
        )}
      </div>
    </div>
  );
}
