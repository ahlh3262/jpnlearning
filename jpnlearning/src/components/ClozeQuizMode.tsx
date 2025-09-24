// src/components/ClozeQuizMode.tsx
"use client";
import * as React from "react";
import type { VocabularyItem } from "@/types/vocabulary";
import { Button } from "@/components/ui/button";

type Props = { vocabulary: VocabularyItem[]; onExit: () => void };

type Q = {
  item: VocabularyItem;
  jp: string;
  vi?: string;
  cloze: string;
  correct: string; // đáp án đúng (kanji || hiragana)
  choices: string[]; // 4 đáp án
};

const letters = ["A", "B", "C", "D"];
const STORAGE_SCORES = "tsensei-cloze-scores";

// -------- utils --------
const pick = <T,>(arr: T[], n: number) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
};
const makeLabel = (v: VocabularyItem) =>
  v.kanji?.trim() || v.hiragana?.trim() || "";

function buildClozeSentence(jp: string, target: string) {
  const blank = "［　　］";
  if (jp && target && jp.includes(target))
    return { cloze: jp.replaceAll(target, blank) };
  const slice = [...jp].slice(0, 3).join("");
  return { cloze: jp.replace(slice, blank) };
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
      mode: "cloze",
      total,
      score,
      percent: total ? Math.round((score / total) * 100) : 0,
      correctIds,
      wrongIds,
    });
    localStorage.setItem(STORAGE_SCORES, JSON.stringify(arr));
  } catch {}
}

// -------- component --------
export default function ClozeQuizMode({ vocabulary, onExit }: Props) {
  // nguồn chỉ lấy các từ có ví dụ
  const sources = React.useMemo(
    () => vocabulary.filter((v) => v.examples?.length || v.exampleSentence),
    [vocabulary]
  );

  // dựng POOL câu hỏi (chưa cắt theo số lượng)
  const pool: Q[] = React.useMemo(() => {
    const baseChoices = vocabulary.map(makeLabel).filter(Boolean);
    const list: Q[] = [];
    for (const v of sources) {
      const label = makeLabel(v);
      if (!label) continue;
      const e =
        (v.examples && v.examples[0]) ||
        (v.exampleSentence
          ? { jp: v.exampleSentence, vi: v.exampleMeaning }
          : undefined);
      if (!e?.jp) continue;

      const { cloze } = buildClozeSentence(e.jp, v.kanji || v.hiragana || "");
      const distractors = pick(
        baseChoices.filter((c) => c !== label),
        3
      );
      list.push({
        item: v,
        jp: e.jp,
        vi: e.vi,
        cloze,
        correct: label,
        choices: pick([label, ...distractors], 4),
      });
    }
    return list;
  }, [sources, vocabulary]);

  // ----- stage: setup -> quiz -> done -----
  const [stage, setStage] = React.useState<"setup" | "quiz" | "done">("setup");
  const [wantSave, setWantSave] = React.useState(true);
  const [desired, setDesired] = React.useState<10 | 20 | 30 | -1>(10); // -1 = all
  const [questions, setQuestions] = React.useState<Q[]>([]);

  // quiz state
  const [idx, setIdx] = React.useState(0);
  const [score, setScore] = React.useState(0);
  const [picked, setPicked] = React.useState<string | null>(null);
  const [showMeaning, setShowMeaning] = React.useState(false);
  const [correctIds, setCorrectIds] = React.useState<string[]>([]);
  const [wrongIds, setWrongIds] = React.useState<string[]>([]);

  const startQuiz = () => {
    const max = pool.length;
    const count = desired === -1 ? max : Math.min(desired, max);
    const qs = pick(pool, count);
    setQuestions(qs);
    setIdx(0);
    setScore(0);
    setPicked(null);
    setShowMeaning(false);
    setCorrectIds([]);
    setWrongIds([]);
    setStage("quiz");
  };

  const totalQ = questions.length;
  const done = stage === "done" || idx >= totalQ;

  // finish -> optionally save
  React.useEffect(() => {
    if (done && totalQ > 0 && wantSave) {
      saveScore(totalQ, score, correctIds, wrongIds);
    }
  }, [done, totalQ, score, wantSave, correctIds, wrongIds]);

  // ---------- UI: setup ----------
  if (stage === "setup") {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-xl font-semibold mb-2">Chọn số câu</div>
          <div className="text-sm text-gray-600 mb-4">
            Có thể tạo tối đa <b>{pool.length}</b> câu từ ví dụ hiện có.
          </div>
          <div className="flex flex-wrap gap-2">
            {([10, 20, 30] as const).map((n) => (
              <button
                key={n}
                disabled={pool.length < 1}
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
              disabled={pool.length < 1}
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

          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={wantSave}
              onChange={(e) => setWantSave(e.target.checked)}
            />
            Ghi điểm (lưu lịch sử)
          </label>

          <div className="mt-5 flex gap-3">
            <Button onClick={onExit} variant="secondary">
              Về trang chủ
            </Button>
            <Button onClick={startQuiz} disabled={pool.length === 0}>
              Bắt đầu
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- UI: done ----------
  if (done && stage !== "setup") {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-2xl font-bold mb-2">Hoàn thành!</div>
          <div className="text-lg">
            Điểm: <b>{score}</b> / {totalQ} (
            {totalQ ? Math.round((score / totalQ) * 100) : 0}%)
          </div>
          {wantSave ? (
            <div className="text-sm text-gray-600 mt-1">
              Kết quả đã được lưu.
            </div>
          ) : null}
          <div className="mt-5">
            <Button onClick={onExit}>Về trang chủ</Button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- UI: quiz ----------
  const q = questions[idx];
  const progress = (idx / totalQ) * 100;

  const handlePick = (c: string) => {
    if (picked) return;
    setPicked(c);
    if (c === q.correct) {
      setScore((s) => s + 1);
      setCorrectIds((a) => [...a, q.item.id]);
    } else {
      setWrongIds((a) => [...a, q.item.id]);
    }
  };

  const next = () => {
    if (idx + 1 < totalQ) {
      setIdx(idx + 1);
      setPicked(null);
      setShowMeaning(false);
    } else {
      setStage("done");
    }
  };

  const choiceClass = (c: string) => {
    const base =
      "w-full text-left p-4 rounded-2xl border font-medium text-gray-900 transition";
    if (!picked) return `${base} bg-white border-gray-300 hover:bg-violet-50`;
    const isCorrect = c === q.correct;
    const isPicked = picked === c;
    if (isCorrect)
      return `${base} bg-green-50 border-green-300 text-green-900 ring-2 ring-green-400`;
    if (isPicked)
      return `${base} bg-rose-50 border-rose-300 text-rose-900 ring-2 ring-rose-400`;
    return `${base} bg-white border-gray-200 opacity-70`;
  };

  const letterClass = (c: string) => {
    const base =
      "mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full border text-sm";
    if (!picked) return base;
    const isCorrect = c === q.correct;
    const isPicked = picked === c;
    if (isCorrect)
      return "mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-green-600 text-white text-sm";
    if (isPicked)
      return "mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-white text-sm";
    return base;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* progress */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-lg font-semibold">
          Điền từ vào chỗ trống - {idx + 1}/{totalQ}
        </div>
        <div className="text-sm">Điểm: {score}</div>
      </div>
      <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden mb-6">
        <div
          className="h-full bg-violet-600"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* đề */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-2 text-sm text-gray-500">Hoàn thành câu sau:</div>
        <div className="text-2xl leading-relaxed mb-3 text-gray-900">
          {q.cloze}
        </div>

        {/* hiện nghĩa */}
        {q.vi ? (
          <div className="mt-1">
            {!showMeaning ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMeaning(true)}
              >
                Hiện ý nghĩa
              </Button>
            ) : (
              <div className="mt-2 rounded-xl bg-gray-50 p-3 text-gray-700">
                {q.vi}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* lựa chọn */}
      <div className="mt-6 space-y-3">
        {q.choices.map((c, i) => (
          <button
            key={c + i}
            onClick={() => handlePick(c)}
            className={choiceClass(c)}
            disabled={!!picked}
          >
            <span className={letterClass(c)}>{letters[i] || "·"}</span>
            {c}
          </button>
        ))}
      </div>

      <div className="mt-6 flex gap-3">
        <Button variant="secondary" onClick={onExit}>
          Về trang chủ
        </Button>
        <Button onClick={next} disabled={!picked}>
          {idx + 1 < totalQ ? "Câu tiếp" : "Hoàn thành"}
        </Button>
      </div>
    </div>
  );
}
