// src/components/QuizMode.tsx
import React, { useState, useEffect, useMemo } from "react";
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

interface QuizModeProps {
  vocabulary: VocabularyItem[];
  onExit: () => void;
  onLeitnerUpdate?: (id: string, correct: boolean) => void;
}

interface QuizQuestion {
  word: VocabularyItem;
  options: string[];
  correctAnswer: string;
}

type Stage = "setup" | "quiz" | "done";
const STORAGE_SCORES = "tsensei-meaning-scores";

// Helpers
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
      mode: "meaning",
      total,
      score,
      percent: total ? Math.round((score / total) * 100) : 0,
      correctIds,
      wrongIds,
    });
    localStorage.setItem(STORAGE_SCORES, JSON.stringify(arr));
  } catch {}
}

export const QuizMode: React.FC<QuizModeProps> = ({
  vocabulary,
  onExit,
  onLeitnerUpdate,
}) => {
  const { speak } = useSpeech();

  // ====== SETUP ======
  const [stage, setStage] = useState<Stage>("setup");
  const [desired, setDesired] = useState<20 | 30 | 50 | -1>(20); // -1 = test hết
  const [wantSave, setWantSave] = useState(true);

  // ====== BUILD POOL ======
  const poolQuestions = useMemo<QuizQuestion[]>(() => {
    const words = vocabulary.filter(
      (w) => w.meaning && (w.kanji || w.hiragana)
    );
    const qs = words.map((word): QuizQuestion => {
      const correct = word.meaning;
      const others = words
        .filter((v) => v.id !== word.id)
        .map((v) => v.meaning)
        .filter(Boolean);
      const distractors = pickN(Array.from(new Set(others)), 3);
      const options = shuffle([correct, ...distractors]);
      return { word, options, correctAnswer: correct };
    });
    return shuffle(qs);
  }, [vocabulary]);

  // ====== QUIZ STATE ======
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<boolean[]>([]);
  const [showHira, setShowHira] = useState(false); // Ẩn Hiragana mặc định
  const [correctIds, setCorrectIds] = useState<string[]>([]);
  const [wrongIds, setWrongIds] = useState<string[]>([]);

  const startQuiz = () => {
    const max = poolQuestions.length;
    const count = desired === -1 ? max : Math.min(desired, max);
    const qs = pickN(poolQuestions, count);
    setQuizQuestions(qs);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setAnsweredQuestions(new Array(qs.length).fill(false));
    setShowHira(false);
    setCorrectIds([]);
    setWrongIds([]);
    setStage("quiz");
  };

  // lưu điểm khi hoàn thành
  useEffect(() => {
    const done = stage === "done" && quizQuestions.length > 0;
    if (done && wantSave) {
      saveScore(quizQuestions.length, score, correctIds, wrongIds);
    }
  }, [stage, quizQuestions.length, score, wantSave, correctIds, wrongIds]);

  // ====== QUIZ FLOW ======
  const currentQuestion = quizQuestions[currentIndex];
  const progress =
    quizQuestions.length > 0
      ? ((currentIndex + 1) / quizQuestions.length) * 100
      : 0;

  const handleAnswerSelect = (answer: string) => {
    if (showResult || answeredQuestions[currentIndex]) return;
    const correct = answer === currentQuestion.correctAnswer;

    setSelectedAnswer(answer);
    setShowResult(true);
    if (correct) {
      setScore((prev) => prev + 1);
      setCorrectIds((ids) => [...ids, currentQuestion.word.id]);
    } else {
      setWrongIds((ids) => [...ids, currentQuestion.word.id]);
    }

    onLeitnerUpdate?.(currentQuestion.word.id, correct);
    setAnsweredQuestions((prev) => {
      const a = [...prev];
      a[currentIndex] = true;
      return a;
    });
  };

  const handleNext = () => {
    if (currentIndex < quizQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setShowHira(false); // reset ẩn hira cho câu sau
    } else {
      setStage("done");
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setShowHira(false);
    }
  };

  const handleSpeakWord = () => {
    const w = currentQuestion.word;
    speak((w.kanji ? w.kanji + " " : "") + (w.hiragana || ""));
  };

  // ====== RENDER ======
  if (stage === "setup") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30 p-4">
        <div className="max-w-3xl mx-auto">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-xl">
                Bài kiểm tra nghĩa — Thiết lập
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Có thể tạo tối đa <b>{poolQuestions.length}</b> câu hỏi.
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
                  disabled={poolQuestions.length === 0}
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
                Điểm của bạn: <b>{score}</b>/{quizQuestions.length} (
                {quizQuestions.length
                  ? Math.round((score / quizQuestions.length) * 100)
                  : 0}
                %)
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

  if (quizQuestions.length === 0) return null;

  const isQuizComplete = answeredQuestions.every((answered) => answered);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">
                Bài kiểm tra - {currentIndex + 1}/{quizQuestions.length}
              </CardTitle>
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Điểm: {score}/{quizQuestions.length}
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
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-4">
                <div className="space-y-2">
                  <div className="text-4xl font-bold text-japanese-kanji">
                    {currentQuestion.word.kanji}
                  </div>
                  {/* Ẩn Hiragana mặc định; có nút bật */}
                  {showHira ? (
                    <div className="text-lg text-japanese-hiragana">
                      {currentQuestion.word.hiragana}
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowHira(true)}
                    >
                      Hiện Hiragana
                    </Button>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleSpeakWord}
                  className="hover:bg-primary hover:text-primary-foreground"
                  title="Phát âm"
                >
                  <Volume2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="text-lg font-medium">Nghĩa của từ này là gì?</div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isCorrect = option === currentQuestion.correctAnswer;
              const isSelected = selectedAnswer === option;
              const showCorrectAnswer = showResult && isCorrect;
              const showWrongAnswer = showResult && isSelected && !isCorrect;

              return (
                <Button
                  key={index}
                  variant="outline"
                  className={cn(
                    "w-full h-auto p-4 text-left justify-start text-wrap break-words rounded-xl",
                    showCorrectAnswer &&
                      "bg-green-100 border-green-500 text-green-700 hover:bg-green-100",
                    showWrongAnswer &&
                      "bg-red-100 border-red-500 text-red-700 hover:bg-red-100",
                    !showResult &&
                      "hover:bg-accent hover:text-accent-foreground"
                  )}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={showResult}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold">
                      {String.fromCharCode(65 + index)}
                    </div>
                    <div className="flex-1">{option}</div>
                    {showCorrectAnswer && <CheckCircle className="w-5 h-5" />}
                    {showWrongAnswer && <XCircle className="w-5 h-5" />}
                  </div>
                </Button>
              );
            })}
          </CardContent>
        </Card>

        {/* Controls */}
        <Card className="shadow-card">
          <CardContent className="p-6">
            {isQuizComplete ? (
              <div className="text-center space-y-4">
                <div className="text-2xl font-bold">
                  🎉 Hoàn thành bài kiểm tra!
                </div>
                <div className="text-lg">
                  Điểm của bạn: {score}/{quizQuestions.length} (
                  {Math.round((score / quizQuestions.length) * 100)}%)
                </div>
                <Button
                  variant="gradient"
                  onClick={() => setStage("done")}
                  className="mt-4"
                >
                  Xem kết quả
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
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
                  onClick={handleNext}
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
