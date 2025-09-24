// src/components/StudyMode.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { VocabularyItem, ExamplePair, Colloc } from "@/types/vocabulary";
import { Home, Volume2, Star, RotateCcw, Pencil } from "lucide-react";
import { useSpeech } from "@/hooks/use-speech";
import { cn } from "@/lib/utils";
import EditWordDialog from "@/components/EditWordDialog";

// ===== Helpers tách dữ liệu mở rộng =====
const splitMeanings = (s?: string): string[] => {
  const raw = (s ?? "").trim();
  if (!raw) return [];
  return raw
    .split(/\r?\n|;|,|\/+/)
    .map((x) => x.trim())
    .filter(Boolean);
};

const getMeanings = (item: VocabularyItem): string[] => {
  if (Array.isArray((item as any).meanings) && (item as any).meanings.length) {
    return (item as any).meanings as string[];
  }
  return splitMeanings(item.meaning);
};

const getExamples = (item: VocabularyItem): ExamplePair[] => {
  const exs = (item as any).examples as ExamplePair[] | undefined;
  if (Array.isArray(exs) && exs.length) return exs;
  const ja = (item as any).exampleSentence as string | undefined;
  const vi = (item as any).exampleMeaning as string | undefined;
  return ja ? [{ jp: ja, vi }] : [];
};

const getCollocations = (
  item: VocabularyItem
): {
  label: "連" | "合" | "類" | "関" | "対" | "慣" | "名";
  list: Colloc[];
}[] => {
  const col = (item as any).collocations as
    | {
        ren?: Colloc[];
        go?: Colloc[];
        rui?: Colloc[];
        kan?: Colloc[];
        tai?: Colloc[];
        kanyo?: Colloc[];
        mei?: Colloc[];
      }
    | undefined;

  const out: {
    label: "連" | "合" | "類" | "関" | "対" | "慣" | "名";
    list: Colloc[];
  }[] = [];
  if (col?.ren?.length) out.push({ label: "連", list: col.ren });
  if (col?.go?.length) out.push({ label: "合", list: col.go });
  if (col?.rui?.length) out.push({ label: "類", list: col.rui });
  if (col?.kan?.length) out.push({ label: "関", list: col.kan });
  if (col?.tai?.length) out.push({ label: "対", list: col.tai });
  if (col?.kanyo?.length) out.push({ label: "慣", list: col.kanyo });
  if (col?.mei?.length) out.push({ label: "名", list: col.mei });
  return out;
};

// ===== UI nhỏ =====
const SectionTitle: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div className="mt-5 mb-2 text-sm font-medium text-gray-500">{children}</div>
);

// Màu cho nhóm 連/合/類/関/対/慣/名
const GROUP_COLORS: Record<
  string,
  { label: string; chipBg: string; chipText: string; chipBorder: string }
> = {
  連: {
    label: "bg-blue-100 text-blue-700",
    chipBg: "bg-blue-50",
    chipText: "text-blue-900",
    chipBorder: "border-blue-200",
  },
  合: {
    label: "bg-violet-100 text-violet-700",
    chipBg: "bg-violet-50",
    chipText: "text-violet-900",
    chipBorder: "border-violet-200",
  },
  類: {
    label: "bg-emerald-100 text-emerald-700",
    chipBg: "bg-emerald-50",
    chipText: "text-emerald-900",
    chipBorder: "border-emerald-200",
  },
  関: {
    label: "bg-amber-100 text-amber-700",
    chipBg: "bg-amber-50",
    chipText: "text-amber-900",
    chipBorder: "border-amber-200",
  },
  対: {
    label: "bg-rose-100 text-rose-700",
    chipBg: "bg-rose-50",
    chipText: "text-rose-900",
    chipBorder: "border-rose-200",
  },
  // NEW: màu riêng
  慣: {
    label: "bg-cyan-100 text-cyan-700",
    chipBg: "bg-cyan-50",
    chipText: "text-cyan-900",
    chipBorder: "border-cyan-200",
  },
  名: {
    label: "bg-slate-100 text-slate-700",
    chipBg: "bg-slate-50",
    chipText: "text-slate-900",
    chipBorder: "border-slate-200",
  },
};

const GroupPill: React.FC<{ label: string }> = ({ label }) => {
  const c = GROUP_COLORS[label] ?? {
    label: "bg-gray-100 text-gray-700",
    chipBg: "bg-gray-50",
    chipText: "text-gray-900",
    chipBorder: "border-gray-200",
  };
  return (
    <span
      className={`inline-flex h-7 min-w-[32px] items-center justify-center rounded-full px-2 text-xs font-semibold leading-none ${c.label}`}
    >
      {label}
    </span>
  );
};

const CollocChip: React.FC<{ group: string; children: React.ReactNode }> = ({
  group,
  children,
}) => {
  const c = GROUP_COLORS[group] ?? {
    label: "bg-gray-100 text-gray-700",
    chipBg: "bg-gray-50",
    chipText: "text-gray-900",
    chipBorder: "border-gray-200",
  };
  return (
    <span
      className={`inline-flex h-7 items-center rounded-full px-3 text-xs leading-none border ${c.chipBg} ${c.chipText} ${c.chipBorder}`}
    >
      {children}
    </span>
  );
};

interface StudyModeProps {
  vocabulary: VocabularyItem[];
  onExit: () => void;
  onToggleStar?: (id: string) => void;
  /** NEW (tùy chọn): cập nhật từ sau khi sửa để lưu ra LocalStorage ở parent */
  onUpdateWord?: (next: VocabularyItem) => void;
}

export const StudyMode: React.FC<StudyModeProps> = ({
  vocabulary,
  onExit,
  onToggleStar,
  onUpdateWord,
}) => {
  // Dùng state cục bộ để khi sửa thấy kết quả ngay cả khi parent chưa truyền onUpdateWord
  const [words, setWords] = React.useState<VocabularyItem[]>(
    vocabulary.filter(Boolean)
  );
  React.useEffect(() => setWords(vocabulary.filter(Boolean)), [vocabulary]);

  const [idx, setIdx] = React.useState(0);
  const [showFuri, setShowFuri] = React.useState(true);
  const [flipped, setFlipped] = React.useState(false);
  const { speak } = useSpeech();
  const [editing, setEditing] = React.useState<VocabularyItem | null>(null);

  const total = words.length;
  const current = words[idx];

  if (!current) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Button onClick={onExit} className="flex items-center gap-2">
          <Home className="w-4 h-4" /> Về trang chủ
        </Button>
      </div>
    );
  }

  const meanings = getMeanings(current);
  const examples = getExamples(current);
  const collocs = getCollocations(current);
  const allMeanings = meanings.length
    ? meanings
    : current.meaning
    ? [current.meaning]
    : [];

  const speakWord = () =>
    speak(((current?.kanji || "") + " " + (current?.hiragana || "")).trim());

  const next = () => {
    setFlipped(false);
    setIdx((i) => Math.min(total - 1, i + 1));
  };
  const prev = () => {
    setFlipped(false);
    setIdx((i) => Math.max(0, i - 1));
  };

  const handleSaveEdit = (nextWord: VocabularyItem) => {
    setWords((arr) =>
      arr.map((x) => (x.id === nextWord.id ? { ...x, ...nextWord } : x))
    );
    setEditing(null);
    onUpdateWord?.(nextWord);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-indigo-50">
      {/* Top bar */}
      <div className="mx-auto max-w-5xl px-4 pt-6">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-semibold">
            Chế độ học - {idx + 1}/{total}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onExit} className="gap-2">
              <Home className="w-4 h-4" /> Về trang chủ
            </Button>
          </div>
        </div>
        <div className="mt-4 h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-indigo-600 transition-all"
            style={{ width: `${((idx + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Card className="shadow-card">
          <CardContent className="p-6">
            {/* Actions */}
            <div className="flex items-center justify-end gap-2 mb-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={speakWord}
                title="Đọc to"
              >
                <Volume2 className="w-4 h-4" />
              </Button>
              {onToggleStar && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9",
                    current.starred && "text-yellow-500"
                  )}
                  onClick={() => onToggleStar?.(current.id)}
                  title="Đánh dấu quan trọng"
                >
                  <Star
                    className={cn("w-4 h-4", current.starred && "fill-current")}
                  />
                </Button>
              )}
              {/* NEW: Sửa trong StudyMode */}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setEditing(current)}
                title="Sửa từ này"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </div>

            {/* Nội dung thẻ */}
            <div
              className="text-center cursor-pointer select-none"
              onClick={() => setFlipped((f) => !f)}
              title="Click để lật thẻ"
            >
              {!flipped ? (
                <>
                  {current.sinoVietnamese && (
                    <div className="text-xs tracking-wide text-gray-500 uppercase mb-2">
                      {current.sinoVietnamese}
                    </div>
                  )}
                  <div className="text-5xl md:text-6xl font-bold mb-3 text-japanese-kanji">
                    {current.kanji}
                  </div>
                  {showFuri && (
                    <div className="text-2xl text-japanese-hiragana mb-4">
                      {current.hiragana}
                    </div>
                  )}
                  <div className="mt-2 text-sm text-gray-500 inline-flex items-center gap-1">
                    <RotateCcw className="w-4 h-4" />
                    Click để xem nghĩa
                  </div>
                </>
              ) : (
                <>
                  {current.sinoVietnamese && (
                    <div className="text-xs tracking-wide text-gray-500 uppercase mb-2">
                      {current.sinoVietnamese}
                    </div>
                  )}

                  <div className="text-5xl font-semibold mb-2 text-japanese-kanji">
                    {current.kanji}
                  </div>
                  {showFuri && (
                    <div className="text-2xl text-japanese-hiragana mb-4">
                      {current.hiragana}
                    </div>
                  )}

                  {allMeanings.length > 0 && (
                    <div className="bg-gray-50 rounded-xl p-4 text-left inline-block min-w-[60%]">
                      <ul className="list-disc pl-5 space-y-1 text-gray-800">
                        {allMeanings.map((m, i) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Ví dụ */}
                  {getExamples(current).length > 0 && (
                    <>
                      <SectionTitle>Ví dụ</SectionTitle>
                      <div className="bg-white border rounded-xl p-3 mx-auto max-w-xl text-left space-y-2">
                        {getExamples(current).map((ex, i) => (
                          <div key={i}>
                            {ex.jp && (
                              <div className="text-gray-900">{ex.jp}</div>
                            )}
                            {ex.vi && (
                              <div className="text-gray-500">{ex.vi}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Cụm từ liên quan */}
                  {getCollocations(current).length > 0 && (
                    <>
                      <SectionTitle>Cụm từ liên quan</SectionTitle>
                      <div className="text-left mx-auto max-w-xl grid grid-cols-[40px,1fr] gap-x-3 gap-y-2">
                        {getCollocations(current).map((g, gi) => (
                          <React.Fragment key={gi}>
                            <div className="flex justify-center items-center">
                              <GroupPill label={g.label} />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {g.list.map((row, i) => (
                                <CollocChip
                                  key={`${g.label}-${i}`}
                                  group={g.label}
                                >
                                  {row.vi ? (
                                    <>
                                      <span className="font-medium">
                                        {row.jp}
                                      </span>
                                      <span className="mx-1.5">—</span>
                                      <span>{row.vi}</span>
                                    </>
                                  ) : (
                                    <span className="font-medium">
                                      {row.jp}
                                    </span>
                                  )}
                                </CollocChip>
                              ))}
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="mt-5 text-sm text-gray-500 inline-flex items-center gap-1">
                    <RotateCcw className="w-4 h-4" />
                    Click để quay lại
                  </div>
                </>
              )}
            </div>

            {/* Controls */}
            <div className="mt-6 flex items-center justify-between">
              <Button variant="outline" onClick={prev} disabled={idx === 0}>
                Trước
              </Button>
              <Button
                variant="gradient"
                onClick={() => setShowFuri((s) => !s)}
                className="min-w-[160px]"
              >
                {showFuri ? "Ẩn Furigana" : "Hiện Furigana"}
              </Button>
              <Button
                variant="default"
                onClick={next}
                disabled={idx === total - 1}
              >
                Tiếp
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* NEW: Dialog sửa ngay trong StudyMode */}
      {editing && (
        <EditWordDialog
          open={!!editing}
          value={editing}
          onClose={() => setEditing(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
};

export default StudyMode;
