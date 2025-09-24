import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw, Volume2, Star } from "lucide-react";
import { useSpeech } from "@/hooks/use-speech";
import { cn } from "@/lib/utils";
import type { VocabularyItem } from "@/types/vocabulary";

interface FlashcardProps {
  vocabulary: VocabularyItem;
  showFurigana?: boolean;
  onToggleStar?: (id: string) => void;
  /** MỚI: render thêm nội dung chi tiết ở mặt sau (nghĩa phụ, ví dụ, 連/合/類/関/対…) */
  extraBack?: React.ReactNode;
}

export const Flashcard: React.FC<FlashcardProps> = ({
  vocabulary,
  showFurigana = true,
  onToggleStar,
  extraBack,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const { speak } = useSpeech();

  const handleFlip = () => setIsFlipped(!isFlipped);

  const speakWord = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const toRead = [vocabulary.kanji, vocabulary.hiragana]
      .filter(Boolean)
      .join(" ");
    if (toRead) speak(toRead, "ja-JP");
  };

  const speakSentence = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (vocabulary.exampleSentence) speak(vocabulary.exampleSentence, "ja-JP");
  };

  const toggleStar = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleStar?.(vocabulary.id);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Front: CHỈ Kanji + Furigana */}
      {!isFlipped ? (
        <Card
          className="w-full h-64 shadow-card hover:shadow-card-hover transition-smooth cursor-pointer"
          onClick={handleFlip}
        >
          <CardContent className="flex flex-col items-center justify-center h-full p-6 text-center relative">
            <div className="absolute top-4 right-4 flex gap-2">
              <Button variant="ghost" size="icon" onClick={speakWord}>
                <Volume2 className="w-4 h-4" />
              </Button>
              {onToggleStar && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleStar}
                  className={cn(vocabulary.starred ? "text-yellow-500" : "")}
                >
                  <Star
                    className={cn(
                      "w-4 h-4",
                      vocabulary.starred && "fill-current"
                    )}
                  />
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <div className="text-4xl font-bold text-japanese-kanji">
                {vocabulary.kanji}
              </div>
              {showFurigana && (
                <div className="text-lg text-japanese-hiragana">
                  {vocabulary.hiragana}
                </div>
              )}
              <div className="text-sm text-gray-500 flex items-center gap-1">
                <RotateCcw className="w-4 h-4" />
                Click để xem nghĩa
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Back: Nghĩa chính + gợi nhắc chữ/kana + KHU VỰC CHI TIẾT
        <Card
          className="w-full h-auto shadow-card hover:shadow-card-hover transition-smooth cursor-pointer"
          onClick={handleFlip}
        >
          <CardContent className="flex flex-col items-center justify-center p-6 text-center gap-4 relative">
            <div className="absolute top-4 right-4 flex gap-2">
              <Button variant="ghost" size="icon" onClick={speakWord}>
                <Volume2 className="w-4 h-4" />
              </Button>
              {onToggleStar && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleStar}
                  className={cn(vocabulary.starred ? "text-yellow-500" : "")}
                >
                  <Star
                    className={cn(
                      "w-4 h-4",
                      vocabulary.starred && "fill-current"
                    )}
                  />
                </Button>
              )}
            </div>

            {/* Âm Hán-Việt (trên phần nghĩa) */}
            {vocabulary.sinoVietnamese && (
              <div className="text-sm text-gray-500">
                {vocabulary.sinoVietnamese}
              </div>
            )}

            {/* Nghĩa chính */}
            <div className="text-2xl font-medium text-japanese-meaning">
              {vocabulary.meaning}
            </div>

            {/* Gợi nhắc chữ + kana */}
            <div className="text-sm text-gray-600 space-y-1">
              <div className="text-japanese-kanji font-medium">
                {vocabulary.kanji}
              </div>
              {showFurigana && (
                <div className="text-japanese-hiragana">
                  {vocabulary.hiragana}
                </div>
              )}
            </div>

            {/* Phần chi tiết do màn Study truyền xuống */}
            {extraBack ? (
              <div
                className="w-full"
                onClick={(e) => e.stopPropagation()} // tránh lật khi tương tác
              >
                {extraBack}
              </div>
            ) : (
              (vocabulary.exampleSentence || vocabulary.exampleMeaning) && (
                <div
                  className="w-full text-left rounded-xl border bg-white/70 p-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-base">
                      {vocabulary.exampleSentence || (
                        <span className="text-gray-400">
                          (Không có câu mẫu)
                        </span>
                      )}
                    </div>
                    {vocabulary.exampleSentence && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={speakSentence}
                        className="shrink-0"
                      >
                        <Volume2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {vocabulary.exampleMeaning && (
                    <div className="mt-2 text-sm text-gray-600">
                      {vocabulary.exampleMeaning}
                    </div>
                  )}
                </div>
              )
            )}

            <div className="text-sm text-gray-500 flex items-center gap-1">
              <RotateCcw className="w-4 h-4" />
              Click để quay lại
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
