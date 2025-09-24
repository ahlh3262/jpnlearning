// Định nghĩa các type mới
export type Colloc = {
  jp: string;
  vi?: string;
};

export type ExamplePair = {
  jp: string;
  vi?: string;
};

// Interface chính cho VocabularyItem (đã hợp nhất và mở rộng)
export interface VocabularyItem {
  id: string;

  // Thông tin cơ bản
  kanji: string;
  hiragana: string;
  meaning: string; // nghĩa chính để hiển thị nhanh
  starred?: boolean;

  // Thông tin tuỳ chọn cơ bản
  sinoVietnamese?: string; // Âm Hán-Việt

  // ----- MỞ RỘNG (CSV V2 / AddWordDialog mới) -----
  meanings?: string[]; // nhiều nghĩa (VI)
  examples?: ExamplePair[]; // danh sách ví dụ JA/VI
  collocations?: {
    ren?: Colloc[]; // 連 (liên từ)
    go?: Colloc[]; // 合 (hợp từ)
    rui?: Colloc[]; // 類 (từ loại)
    kan?: Colloc[]; // 関 (quan hệ)
    tai?: Colloc[]; // 対 (đối ứng)
    kanyo?: Colloc[];
    mei?: Colloc[];
  };

  // Giữ tương thích ngược (legacy fields)
  exampleSentence?: string; // Câu mẫu (JA) - cũ
  exampleMeaning?: string; // Ý nghĩa câu mẫu (VI) - cũ

  // ---- Leitner SRS ----
  leitner?: {
    box: number;
    nextReview: string | Date; // ⟵ đổi từ string
    correctStreak: number;
    totalReviews: number;
    lastReviewed?: string | Date; // ⟵ đổi từ string
  };
}

// Interface cho VocabularySet (không thay đổi)
export interface VocabularySet {
  id: string;
  name: string;
  items: VocabularyItem[];
  createdAt: Date;
}
