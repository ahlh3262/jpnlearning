export type CollocationItem = { jp: string; vi?: string };
export type CollocationGroups = {
  ren?: CollocationItem[];
  go?: CollocationItem[];
  rui?: CollocationItem[];
  kan?: CollocationItem[];
  tai?: CollocationItem[];
  kanyo?: CollocationItem[];
  mei?: CollocationItem[];
};
export type Example = { jp: string; vi?: string };

export interface Sense {
  index: number; // 1,2,3...
  meaning_vi: string;
  examples: Example[];
  collocations: CollocationGroups;
}

export interface VocabV2 {
  id: string; // = word_id
  kanji: string;
  hiragana?: string;
  jlpt?: string;
  tags?: string[];
  senses: Sense[];
  leitner?: {
    // giữ SRS cũ (union string|Date để tránh lỗi)
    box: number;
    nextReview: string | Date;
    correctStreak: number;
    totalReviews: number;
    lastReviewed?: string | Date;
  };
}
