// src/hooks/use-leitner.ts
import { VocabularyItem } from "@/types/vocabulary";

export const LEITNER_INTERVALS: Record<number, number> = {
  1: 1, // Hộp 1: 1 ngày
  2: 2, // Hộp 2: 2 ngày
  3: 7, // Hộp 3: 1 tuần
  4: 14, // Hộp 4: 2 tuần
  5: 30, // Hộp 5: 1 tháng
};

// Chuẩn hoá ngày về 00:00 để so sánh đúng
const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const reviveDates = (arr: VocabularyItem[]) =>
  arr.map((i) => {
    if (!i.leitner) return i;
    const ln = i.leitner as any;
    return {
      ...i,
      leitner: {
        ...i.leitner,
        nextReview: ln.nextReview ? new Date(ln.nextReview) : new Date(),
        lastReviewed: ln.lastReviewed ? new Date(ln.lastReviewed) : undefined,
      },
    };
  });

export const initializeLeitnerData = (item: VocabularyItem): VocabularyItem => {
  if (item.leitner) return item;
  const today = startOfDay(new Date());
  return {
    ...item,
    leitner: {
      box: 1,
      nextReview: today, // từ mới: ôn ngay hôm nay
      correctStreak: 0,
      totalReviews: 0,
      lastReviewed: undefined,
    },
  };
};

export const isDueToday = (i: VocabularyItem) => {
  const today = startOfDay(new Date());
  const next = i.leitner?.nextReview
    ? startOfDay(new Date(i.leitner.nextReview))
    : today;
  return next <= today;
};

export const getDueWords = (list: VocabularyItem[]) =>
  list.map(initializeLeitnerData).filter(isDueToday);

export const updateLeitnerData = (
  item: VocabularyItem,
  correct: boolean
): VocabularyItem => {
  const withLn = initializeLeitnerData(item);
  const prev = withLn.leitner!;
  const now = new Date();

  const newBox = correct ? Math.min(5, prev.box + 1) : 1;
  const days = LEITNER_INTERVALS[newBox] ?? 1;

  const next = startOfDay(new Date());
  next.setDate(next.getDate() + days);

  return {
    ...withLn,
    leitner: {
      box: newBox,
      correctStreak: correct ? (prev.correctStreak ?? 0) + 1 : 0,
      totalReviews: (prev.totalReviews ?? 0) + 1,
      lastReviewed: now,
      nextReview: next,
    },
  };
};
// --- THÊM dưới các export sẵn có ---
export const BOX_LABEL: Record<number, string> = {
  1: "Hàng ngày",
  2: "Mỗi 2 ngày",
  3: "Hàng tuần",
  4: "Mỗi 2 tuần",
  5: "Hàng tháng",
};

export const getLeitnerStats = (list: VocabularyItem[]) => {
  const stats = {
    boxes: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>,
    total: 0,
    due: getDueWords(list).length,
  };
  list.forEach((i) => {
    const b = i.leitner?.box ?? 1;
    stats.boxes[b] = (stats.boxes[b] ?? 0) + 1;
    stats.total += 1;
  });
  return stats;
};
