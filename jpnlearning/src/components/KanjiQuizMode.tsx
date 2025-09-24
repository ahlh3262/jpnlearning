// src/components/KanjiQuizMode.tsx
import React, { useMemo, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { VocabularyItem } from "@/types/vocabulary";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Volume2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useSpeech } from "@/hooks/use-speech";
import { cn } from "@/lib/utils";

type Props = {
  vocabulary: VocabularyItem[];
  onExit: () => void;
  onLeitnerUpdate?: (id: string, correct: boolean) => void;
};

type QType = "reading_to_kanji" | "kanji_to_reading";

type Q = {
  id: string; // id của word
  type: QType;
  prompt: string; // “あいて” hoặc “残業代”
  correct: string; // đáp án đúng
  options: string[]; // 4 lựa chọn trộn
};

const STORAGE_SCORES = "tsensei-kanji-scores";

/* ---------- helpers ---------- */
function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pickN<T>(arr: T[], n: number) {
  return shuffle(arr).slice(0, n);
}
function saveScore(
  total: number,
  score: number,
  correctIds: string[],
  wrongIds: string[]
) {
  try {
    const raw = localStorage.getItem(STORAGE_SCORES);
    const arr = raw ? (JSON.parse(raw) as any[]) : [];
    arr.push({
      ts: new Date().toISOString(),
      mode: "kanji",
      total,
      score,
      percent: total ? Math.round((score / total) * 100) : 0,
      correctIds,
      wrongIds,
    });
    localStorage.setItem(STORAGE_SCORES, JSON.stringify(arr));
  } catch {}
}

/* ---------- component ---------- */
export const KanjiQuizMode: React.FC<Props> = ({
  vocabulary,
  onExit,
  onLeitnerUpdate,
}) => {
  const { speak } = useSpeech();

  /* ======= BUILD POOL CÂU HỎI (đầy đủ) ======= */
  const fullQuestions = useMemo<Q[]>(() => {
    const qs: Q[] = [];
    const words = vocabulary.filter((v) => v.kanji && v.hiragana);

    words.forEach((w) => {
      const makeReadingToKanji = () => {
        const others = words.filter((o) => o.id !== w.id).map((o) => o.kanji);
        const distractors = pickN(Array.from(new Set(others)), 3);
        const options = shuffle([w.kanji, ...distractors]);
        qs.push({
          id: w.id,
          type: "reading_to_kanji",
          prompt: w.hiragana,
          correct: w.kanji,
          options,
        });
      };
      const makeKanjiToReading = () => {
        const others = words
          .filter((o) => o.id !== w.id)
          .map((o) => o.hiragana);
        const distractors = pickN(Array.from(new Set(others)), 3);
        const options = shuffle([w.hiragana, ...distractors]);
        qs.push({
          id: w.id,
          type: "kanji_to_reading",
          prompt: w.kanji,
          correct: w.hiragana,
          options,
        });
      };
      Math.random() < 0.5 ? makeReadingToKanji() : makeKanjiToReading();
    });

    if (qs.length < 6 && words.length >= 2) {
      words.slice(0, Math.min(5, words.length)).forEach((w) => {
        const othersK = words.filter((o) => o.id !== w.id).map((o) => o.kanji);
        const othersR = words
          .filter((o) => o.id !== w.id)
          .map((o) => o.hiragana);
        qs.push({
          id: w.id,
          type: "reading_to_kanji",
          prompt: w.hiragana,
          correct: w.kanji,
          options: shuffle([
            w.kanji,
            ...pickN(Array.from(new Set(othersK)), 3),
          ]),
        });
        qs.push({
          id: w.id,
          type: "kanji_to_reading",
          prompt: w.kanji,
          correct: w.hiragana,
          options: shuffle([
            w.hiragana,
            ...pickN(Array.from(new Set(othersR)), 3),
          ]),
        });
      });
    }
    return shuffle(qs);
  }, [vocabulary]);

  /* ======= SETUP: chọn số câu + ghi điểm ======= */
  const [stage, setStage] = useState<"setup" | "quiz" | "done">("setup");
  const [desired, setDesired] = useState<20 | 30 | 50 | -1>(20); // -1 = test hết
  const [wantSave, setWantSave] = useState(true);

  /* ======= QUIZ STATE (sau khi start) ======= */
  const [questions, setQuestions] = useState<Q[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<boolean[]>([]);
  const [correctIds, setCorrectIds] = useState<string[]>([]);
  const [wrongIds, setWrongIds] = useState<string[]>([]);

  const startQuiz = () => {
    const max = fullQuestions.length;
    const count = desired === -1 ? max : Math.min(desired, max);
    const qs = pickN(fullQuestions, count);
    setQuestions(qs);
    setCurrent(0);
    setSelected(null);
    setShowResult(false);
    setScore(0);
    setAnswered(new Array(qs.length).fill(false));
    setCorrectIds([]);
    setWrongIds([]);
    setStage("quiz");
  };

  // lưu điểm khi xong
  useEffect(() => {
    if (stage === "done" && questions.length && wantSave) {
      saveScore(questions.length, score, correctIds, wrongIds);
    }
  }, [stage, questions.length, score, wantSave, correctIds, wrongIds]);

  if (stage === "setup") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30 p-4">
        <div className="max-w-3xl mx-auto">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-xl">
                Kiểm tra Kanji — Thiết lập
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Có thể tạo tối đa <b>{fullQuestions.length}</b> câu hỏi.
              </div>
              <div className="flex flex-wrap gap-2">
                {([20, 30, 50] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => setDesired(n)}
                    className={[
                      "px-4 py-2 rounded-xl border",
                      desired === n
                        ? "bg-violet-600 text-white border-violet-600"
                        : "bg-white text-gray-900 border-gray-300 hover:bg-violet-50",
                    ].join(" ")}
                  >
                    {n} câu
                  </button>
                ))}
                <button
                  onClick={() => setDesired(-1)}
                  className={[
                    "px-4 py-2 rounded-xl border",
                    desired === -1
                      ? "bg-violet-600 text-white border-violet-600"
                      : "bg-white text-gray-900 border-gray-300 hover:bg-violet-50",
                  ].join(" ")}
                >
                  Test hết
                </button>
              </div>

              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={wantSave}
                  onChange={(e) => setWantSave(e.target.checked)}
                />
                Ghi điểm (lưu lịch sử)
              </label>

              <div className="flex gap-3 pt-2">
                <Button variant="secondary" onClick={onExit}>
                  Về trang chủ
                </Button>
                <Button
                  onClick={startQuiz}
                  disabled={fullQuestions.length === 0}
                >
                  Bắt đầu
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  /* ======= QUIZ FLOW ======= */
  const q = questions[current];
  const progress = ((current + 1) / questions.length) * 100;

  const handleSelect = (opt: string) => {
    if (showResult) return;
    const correct = opt === q.correct;
    setSelected(opt);
    setShowResult(true);
    if (correct) {
      setScore((s) => s + 1);
      setCorrectIds((a) => [...a, q.id]);
    } else {
      setWrongIds((a) => [...a, q.id]);
    }
    setAnswered((prev) => {
      const a = [...prev];
      a[current] = true;
      return a;
    });
    onLeitnerUpdate?.(q.id, correct);
  };

  const next = () => {
    if (current < questions.length - 1) {
      setCurrent((i) => i + 1);
      setSelected(null);
      setShowResult(false);
    } else {
      setStage("done");
    }
  };

  const prev = () => {
    if (current > 0) {
      setCurrent((i) => i - 1);
      setSelected(null);
      setShowResult(false);
    }
  };

  const speakPrompt = () => {
    // đọc prompt (để nguyên như bản cũ)
    speak(q.prompt);
  };

  const finished = answered.every(Boolean);

  if (questions.length === 0) return null;

  if (stage === "done") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30 p-4">
        <div className="max-w-3xl mx-auto">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-xl">
                🎉 Hoàn thành bài kiểm tra!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-lg">
                Điểm của bạn: <b>{score}</b>/{questions.length} (
                {Math.round((score / questions.length) * 100)}%)
              </div>
              {wantSave ? (
                <div className="text-sm text-muted-foreground">
                  Kết quả đã được lưu.
                </div>
              ) : null}
              <Button variant="gradient" onClick={onExit}>
                Về trang chủ
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">
                Kiểm tra Kanji - {current + 1}/{questions.length}
              </CardTitle>
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Điểm: {score}/{questions.length}
                </div>
                <Button
                  variant="ghost"
                  onClick={onExit}
                  className="flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Về trang chủ
                </Button>
              </div>
            </div>
            <Progress value={progress} className="mt-4" />
          </CardHeader>
        </Card>

        {/* Question */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="text-center space-y-3">
              <div className="text-sm text-muted-foreground">
                {q.type === "reading_to_kanji"
                  ? "Chọn Kanji đúng cho cách đọc:"
                  : "Chọn cách đọc đúng cho:"}
              </div>
              <div className="flex items-center justify-center gap-3">
                <div className="text-3xl md:text-4xl font-bold">{q.prompt}</div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={speakPrompt}
                  className="hover:bg-primary hover:text-primary-foreground"
                  title="Phát âm"
                >
                  <Volume2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {q.options.map((opt, i) => {
              const isCorrect = opt === q.correct;
              const isSelected = selected === opt;
              const showRight = showResult && isCorrect;
              const showWrong = showResult && isSelected && !isCorrect;
              return (
                <Button
                  key={opt + i}
                  variant="outline"
                  className={cn(
                    "w-full h-auto p-4 text-left justify-start text-wrap break-words rounded-xl",
                    showRight &&
                      "bg-green-100 border-green-500 text-green-700 hover:bg-green-100",
                    showWrong &&
                      "bg-red-100 border-red-500 text-red-700 hover:bg-red-100",
                    !showResult &&
                      "hover:bg-accent hover:text-accent-foreground"
                  )}
                  disabled={showResult}
                  onClick={() => handleSelect(opt)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold">
                      {String.fromCharCode(65 + i)}
                    </div>
                    <div className="flex-1">{opt}</div>
                    {showRight && <CheckCircle className="w-5 h-5" />}
                    {showWrong && <XCircle className="w-5 h-5" />}
                  </div>
                </Button>
              );
            })}
          </CardContent>
        </Card>

        {/* Controls */}
        <Card className="shadow-card">
          <CardContent className="p-6">
            {finished ? (
              <div className="text-center space-y-4">
                <div className="text-2xl font-bold">
                  🎉 Hoàn thành bài kiểm tra!
                </div>
                <div className="text-lg">
                  Điểm của bạn: {score}/{questions.length} (
                  {Math.round((score / questions.length) * 100)}%)
                </div>
                <Button
                  variant="gradient"
                  onClick={() => setStage("done")}
                  className="mt-2"
                >
                  Xem kết quả
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={prev}
                  disabled={current === 0}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Trước
                </Button>
                <div className="text-sm text-muted-foreground">
                  {showResult
                    ? "Nhấn 'Tiếp' để tiếp tục"
                    : "Chọn đáp án để tiếp tục"}
                </div>
                <Button
                  variant="japanese"
                  onClick={next}
                  disabled={!showResult}
                  className="flex items-center gap-2"
                >
                  Tiếp
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
