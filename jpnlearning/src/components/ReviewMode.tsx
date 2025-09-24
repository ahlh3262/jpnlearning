// src/components/ReviewMode.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { VocabularyItem, ExamplePair, Colloc } from "@/types/vocabulary";
import {
  Home,
  Clock,
  CheckCircle2,
  XCircle,
  Volume2,
  RotateCcw,
  Star,
} from "lucide-react";
import { LEITNER_INTERVALS, BOX_LABEL } from "@/hooks/use-leitner";
import { useSpeech } from "@/hooks/use-speech";
import { cn } from "@/lib/utils";

/* ---------- Helpers để tách dữ liệu mở rộng ---------- */
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
): { label: "連" | "合" | "類" | "関" | "対" | "慣" | "名"; list: Colloc[] }[] => {
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

  const out: { label: "連" | "合" | "類" | "関" | "対" | "慣" | "名"; list: Colloc[] }[] = [];
  if (col?.ren?.length) out.push({ label: "連", list: col.ren });
  if (col?.go?.length) out.push({ label: "合", list: col.go });
  if (col?.rui?.length) out.push({ label: "類", list: col.rui });
  if (col?.kan?.length) out.push({ label: "関", list: col.kan });
  if (col?.tai?.length) out.push({ label: "対", list: col.tai });
  if (col?.kanyo?.length) out.push({ label: "慣", list: col.kanyo });
  if (col?.mei?.length) out.push({ label: "名", list: col.mei });
  return out;
};

/* ---------- UI nhỏ dùng lại như StudyMode ---------- */
const SectionTitle: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div className="mt-5 mb-2 text-sm font-medium text-gray-500">{children}</div>
);

// Màu cho nhóm 連/合/類/関/対
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

/* ---------- Props ---------- */
interface ReviewModeProps {
  vocabulary: VocabularyItem[];
  onExit: () => void;
  onLeitnerUpdate: (id: string, correct: boolean) => void;
}

/* ---------- Component ---------- */
export const ReviewMode: React.FC<ReviewModeProps> = ({
  vocabulary,
  onExit,
  onLeitnerUpdate,
}) => {
  const list = useMemo(() => vocabulary.filter(Boolean), [vocabulary]);
  const [idx, setIdx] = useState(0);
  const [showFurigana, setShowFurigana] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);

  const [toast, setToast] = useState<{
    text: string;
    kind: "ok" | "err";
    id: number;
  } | null>(null);
  const [leaving, setLeaving] = useState(false);

  const { speak } = useSpeech();

  const total = list.length;
  if (!total) return null;

  const item = list[idx];
  const progress = ((idx + 1) / total) * 100;

  const box = item.leitner?.box ?? 1;
  const nextBoxIfCorrect = Math.min(5, box + 1);
  const hintText = `Gợi ý: nếu chọn Đã nhớ, từ trong Hộp ${box} sẽ hẹn lại sau ${LEITNER_INTERVALS[nextBoxIfCorrect]} ngày • Chuyển lên ${BOX_LABEL[nextBoxIfCorrect]}.`;

  const meaningsArr = getMeanings(item);
  const examples = getExamples(item);
  const collocs = getCollocations(item);
  const allMeanings = meaningsArr.length
    ? meaningsArr
    : item.meaning
    ? [item.meaning]
    : [];

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "1") handleMark(false);
      if (e.key === "2") handleMark(true);
      if (e.key.toLowerCase() === "s") speak(`${item.kanji} ${item.hiragana}`);
      if (e.code === "Space") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, list]);

  // toast lifecycle
  useEffect(() => {
    if (!toast) return;
    setLeaving(false);
    const t1 = setTimeout(() => setLeaving(true), 1800);
    const t2 = setTimeout(() => setToast(null), 2100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [toast?.id]);

  const isDone = idx >= total - 1 && correct + wrong >= total;

  const speakWord = () => speak(`${item.kanji} ${item.hiragana}`);

  const handleMark = (isCorrect: boolean) => {
    const newBox = isCorrect ? Math.min(5, box + 1) : 1;
    const days = LEITNER_INTERVALS[newBox];

    if (isCorrect) {
      setToast({
        kind: "ok",
        id: Date.now(),
        text: `Đúng rồi! Từ này sẽ xuất hiện lại sau ${days} ngày • Chuyển lên ${BOX_LABEL[newBox]}.`,
      });
      setCorrect((n) => n + 1);
    } else {
      setToast({
        kind: "err",
        id: Date.now(),
        text: `Chưa đúng! Từ này sẽ xuất hiện lại ngày mai • Quay về ${BOX_LABEL[newBox]}.`,
      });
      setWrong((n) => n + 1);
    }

    onLeitnerUpdate(item.id, isCorrect);
    setFlipped(false);

    if (idx < total - 1) setIdx((i) => i + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="glass-card shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Ôn tập — {Math.min(idx + 1, total)}/{total}
                <span className="ml-2 text-xs rounded-full bg-gray-100 px-2 py-1">
                  Hộp {box}
                </span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={speakWord} title="Nghe (S)">
                  <Volume2 className="w-4 h-4 mr-1" /> Nghe (S)
                </Button>
                <Button
                  variant={showFurigana ? "default" : "outline"}
                  onClick={() => setShowFurigana((s) => !s)}
                >
                  {showFurigana ? "Ẩn" : "Hiện"} Furigana
                </Button>
                <Button
                  variant="ghost"
                  onClick={onExit}
                  className="flex items-center gap-2"
                >
                  <Home className="w-4 h-4" /> Về trang chủ
                </Button>
              </div>
            </div>
            <Progress value={progress} className="mt-4" />
          </CardHeader>
        </Card>

        {/* Counters */}
        <Card className="glass-card shadow-soft">
          <CardContent className="py-4">
            <div className="grid grid-cols-3 text-center">
              <div>
                <div className="text-emerald-600 text-xl font-semibold">
                  {correct}
                </div>
                <div className="text-sm text-gray-500">Đúng</div>
              </div>
              <div>
                <div className="text-rose-600 text-xl font-semibold">
                  {wrong}
                </div>
                <div className="text-sm text-gray-500">Sai</div>
              </div>
              <div>
                <div className="text-gray-800 text-xl font-semibold">
                  {total - (correct + wrong)}
                </div>
                <div className="text-sm text-gray-500">Còn lại</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Thẻ ôn tập (flip giống StudyMode) */}
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-end gap-2 mb-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={speakWord}
              >
                <Volume2 className="w-4 h-4" />
              </Button>
              {/* star chỉ hiển thị trạng thái nếu bạn muốn; không có handler Leitner ở đây */}
              {item.starred && (
                <span className="inline-flex h-9 w-9 items-center justify-center text-yellow-500">
                  <Star className="w-4 h-4 fill-current" />
                </span>
              )}
            </div>

            <div
              className="text-center cursor-pointer select-none"
              onClick={() => setFlipped((f) => !f)}
              title="Nhấn Space hoặc click để lật thẻ"
            >
              {!flipped ? (
                <>
                  {item.sinoVietnamese && (
                    <div className="text-xs tracking-wide text-gray-500 uppercase mb-2">
                      {item.sinoVietnamese}
                    </div>
                  )}
                  <div className="text-5xl md:text-6xl font-bold mb-3 text-japanese-kanji">
                    {item.kanji}
                  </div>
                  {showFurigana && (
                    <div className="text-2xl text-japanese-hiragana mb-4">
                      {item.hiragana}
                    </div>
                  )}
                  <div className="mt-2 text-sm text-gray-500 inline-flex items-center gap-1">
                    <RotateCcw className="w-4 h-4" />
                    Click để xem nghĩa
                  </div>
                </>
              ) : (
                <>
                  {item.sinoVietnamese && (
                    <div className="text-xs tracking-wide text-gray-500 uppercase mb-2">
                      {item.sinoVietnamese}
                    </div>
                  )}
                  <div className="text-5xl font-semibold mb-2 text-japanese-kanji">
                    {item.kanji}
                  </div>
                  {showFurigana && (
                    <div className="text-2xl text-japanese-hiragana mb-4">
                      {item.hiragana}
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

                  {examples.length > 0 && (
                    <>
                      <SectionTitle>Ví dụ</SectionTitle>
                      <div className="bg-white border rounded-xl p-3 mx-auto max-w-xl text-left space-y-2">
                        {examples.map((ex, i) => (
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

                  {collocs.length > 0 && (
                    <>
                      <SectionTitle>Cụm từ liên quan</SectionTitle>
                      <div className="text-left mx-auto max-w-xl grid grid-cols-[40px,1fr] gap-x-3 gap-y-2">
                        {collocs.map((g, gi) => (
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
          </CardContent>
        </Card>

        <div className="text-center text-xs text-gray-500">{hintText}</div>

        {/* Controls */}
        <Card className="glass-card shadow-soft">
          <CardContent className="p-6">
            {isDone ? (
              <div className="text-center space-y-4">
                <div className="text-2xl font-bold">
                  🎉 Hoàn thành ôn tập hôm nay!
                </div>
                <div className="text-lg">
                  Kết quả: <b>{correct}</b> đúng / <b>{wrong}</b> sai
                </div>
                <Button className="btn-pill btn-primary" onClick={onExit}>
                  Về trang chủ
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-4">
                <Button
                  className="btn-pill btn-danger"
                  onClick={() => handleMark(false)}
                  title="Phím tắt: 1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Chưa nhớ (1)
                </Button>
                <Button
                  className="btn-pill btn-primary"
                  onClick={() => handleMark(true)}
                  title="Phím tắt: 2"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Đã nhớ (2)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Slide toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 max-w-sm rounded-xl px-4 py-3 text-sm border shadow-soft ${
            toast.kind === "ok"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          } ${leaving ? "toast-exit" : "toast-enter"}`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
};

export default ReviewMode;
