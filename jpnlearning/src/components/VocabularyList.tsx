// src/components/VocabularyList.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { VocabularyItem } from "@/types/vocabulary";
import {
  BookOpen,
  Play,
  Volume2,
  Star,
  Brain,
  Plus,
  Search,
  Info,
  Pencil,
} from "lucide-react";
import { useSpeech } from "@/hooks/use-speech";
import { cn } from "@/lib/utils";
import VocabularyDetailModal from "@/components/VocabularyDetailModal";

/** Mở rộng để truyền cho modal (nếu có dữ liệu V2) */
type Colloc = { jp: string; vi?: string };
type ExtendedVocab = VocabularyItem & {
  meanings?: string[];
  examples?: Colloc[];
  collocations?: {
    ren?: Colloc[]; // 連
    go?: Colloc[]; // 合
    rui?: Colloc[]; // 類
    kan?: Colloc[]; // 関
    tai?: Colloc[]; // 対
    kanyo?: Colloc[]; // 慣
    mei?: Colloc[]; // 名
  };
};

/** Bỏ dấu + lowercase để so sánh */
const norm = (s: string) =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/** Đánh dấu mọi chỗ khớp query trong text (bỏ dấu, không phân biệt hoa/thường) */
const Highlight: React.FC<{ text?: string; query?: string }> = ({
  text,
  query,
}) => {
  const t = text ?? "";
  const q = (query ?? "").trim();
  if (!q) return <>{t}</>;

  // Chuỗi normalized + map về index gốc
  let n = "";
  const map: number[] = [];
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    const nch = ch
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    for (let k = 0; k < nch.length; k++) {
      n += nch[k];
      map.push(i);
    }
  }

  const nq = norm(q);
  if (!nq) return <>{t}</>;

  const parts: React.ReactNode[] = [];
  let lastOrig = 0;
  let from = 0;
  let hitIndex = n.indexOf(nq, from);

  while (hitIndex !== -1) {
    const startOrig = map[hitIndex];
    const endOrig = map[hitIndex + nq.length - 1] + 1; // exclusive

    if (startOrig > lastOrig) parts.push(t.slice(lastOrig, startOrig));

    parts.push(
      <mark
        key={`${startOrig}-${endOrig}`}
        className="bg-yellow-200 rounded px-0.5"
      >
        {t.slice(startOrig, endOrig)}
      </mark>
    );

    lastOrig = endOrig;
    from = hitIndex + nq.length;
    hitIndex = n.indexOf(nq, from);
  }

  if (lastOrig < t.length) parts.push(t.slice(lastOrig));
  return <>{parts}</>;
};

export type VocabularyListProps = {
  vocabulary: VocabularyItem[];
  onStartStudy: () => void;
  onStartQuiz: () => void;
  onToggleStar: (id: string) => void;
  onAddWordClick?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  /** NEW: mở dialog sửa từ */
  onEditWordClick?: (item: VocabularyItem) => void;
};

export const VocabularyList: React.FC<VocabularyListProps> = ({
  vocabulary,
  onStartStudy,
  onStartQuiz,
  onToggleStar,
  onAddWordClick,
  searchQuery = "",
  onSearchChange,
  onEditWordClick,
}) => {
  const { speak } = useSpeech();

  // ================= Modal chi tiết =================
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<ExtendedVocab | null>(null);

  const openDetail = (item: VocabularyItem) => {
    setSelected(item as ExtendedVocab);
    setDetailOpen(true);
  };
  // ==================================================

  const handleSpeakWord = (word: VocabularyItem) => {
    speak((word.kanji + " " + word.hiragana).trim());
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Danh sách từ vựng ({vocabulary.length} từ,{" "}
            {vocabulary.filter((v) => v.starred).length} đã đánh dấu)
          </CardTitle>

          <div className="flex items-center gap-3">
            {/* Ô tìm kiếm */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="h-10 w-56 md:w-72 rounded-xl border px-9 pr-8 outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Tìm Kanji / Hiragana / Nghĩa…"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange?.("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Xoá tìm kiếm"
                >
                  ×
                </button>
              )}
            </div>

            {onAddWordClick && (
              <Button
                variant="outline"
                onClick={onAddWordClick}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Thêm từ mới
              </Button>
            )}
            <Button
              variant="gradient"
              size="lg"
              onClick={onStartStudy}
              className="flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Bắt đầu học
            </Button>
            <Button
              variant="japanese"
              size="lg"
              onClick={onStartQuiz}
              className="flex items-center gap-2"
            >
              <Brain className="w-4 h-4" />
              Kiểm tra
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {vocabulary.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Không tìm thấy kết quả.
            {onSearchChange && (
              <>
                {" "}
                Thử từ khóa khác hoặc{" "}
                <button
                  className="underline underline-offset-2 hover:text-gray-700"
                  onClick={() => onSearchChange("")}
                >
                  xoá tìm kiếm
                </button>
                .
              </>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {vocabulary.map((item) => (
                <Card
                  key={item.id}
                  className="gradient-card border-0 shadow-card hover:shadow-card-hover transition-smooth"
                >
                  <CardContent className="p-4 relative">
                    {/* Action buttons */}
                    <div className="absolute top-3 right-3 flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSpeakWord(item)}
                        className="h-8 w-8 hover:bg-primary hover:text-primary-foreground"
                        title="Phát âm"
                      >
                        <Volume2 className="w-3 h-3" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onToggleStar(item.id)}
                        className={cn(
                          "h-8 w-8",
                          item.starred
                            ? "text-yellow-500 hover:text-yellow-600"
                            : "hover:bg-primary hover:text-primary-foreground"
                        )}
                        title={item.starred ? "Bỏ đánh dấu" : "Đánh dấu"}
                      >
                        <Star
                          className={cn(
                            "w-3 h-3",
                            item.starred && "fill-current"
                          )}
                        />
                      </Button>

                      {onEditWordClick && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEditWordClick(item)}
                          title="Sửa"
                          className="h-8 w-8 hover:bg-primary hover:text-primary-foreground"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2 pr-20">
                      <div className="text-2xl font-bold text-japanese-kanji">
                        <Highlight text={item.kanji} query={searchQuery} />
                      </div>
                      <div className="text-lg text-japanese-hiragana">
                        <Highlight text={item.hiragana} query={searchQuery} />
                      </div>

                      {item.sinoVietnamese && (
                        <div className="text-xs text-gray-500">
                          <Highlight
                            text={item.sinoVietnamese}
                            query={searchQuery}
                          />
                        </div>
                      )}

                      <div className="text-sm text-japanese-meaning border-t pt-2">
                        <Highlight text={item.meaning} query={searchQuery} />
                      </div>

                      {/* Nút chi tiết */}
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => openDetail(item)}
                        >
                          <Info className="w-4 h-4" />
                          Chi tiết
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Modal chi tiết — render 1 lần cho cả danh sách */}
            <VocabularyDetailModal
              open={detailOpen}
              onClose={() => setDetailOpen(false)}
              item={selected}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};
