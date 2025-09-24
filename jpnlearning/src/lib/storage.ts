import type { VocabV2 } from "@/types/vocab-v2";

const KEY_V2 = "tsensei-vocab-v2";
const KEY_V1 = "tsensei-vocab"; // key cũ

export function saveVocabulary(items: VocabV2[]) {
  localStorage.setItem(KEY_V2, JSON.stringify(items));
}

export function loadVocabulary(): VocabV2[] {
  // 1) Ưu tiên v2
  const v2Raw = localStorage.getItem(KEY_V2);
  if (v2Raw) {
    try {
      return JSON.parse(v2Raw) as VocabV2[];
    } catch {}
  }
  // 2) Nếu chưa có, thử v1 -> migrate
  const v1Raw = localStorage.getItem(KEY_V1);
  if (v1Raw) {
    try {
      const v1 = JSON.parse(v1Raw);
      const migrated = migrateV1toV2(v1);
      localStorage.setItem(KEY_V2, JSON.stringify(migrated));
      return migrated;
    } catch {}
  }
  return [];
}

/** Gộp dữ liệu cũ (1 nghĩa) thành cấu trúc senses[] của V2 */
export function migrateV1toV2(v1List: any[]): VocabV2[] {
  if (!Array.isArray(v1List)) return [];
  return v1List.map((x) => {
    const examples = makeExamples(x.example, x.exampleMeaning);
    return {
      id: x.id,
      kanji: x.kanji,
      hiragana: x.hiragana ?? undefined,
      jlpt: x.jlpt ?? undefined,
      tags: Array.isArray(x.tags)
        ? x.tags
        : x.tags
        ? String(x.tags)
            .split(",")
            .map((t: string) => t.trim())
        : [],
      senses: [
        {
          index: 1,
          meaning_vi: x.meaning ?? "",
          examples,
          collocations: x.collocations ?? {}, // nếu có
        },
      ],
      // giữ nguyên SRS, cho phép string | Date để tránh lỗi kiểu
      leitner: x.leitner
        ? {
            ...x.leitner,
            nextReview: x.leitner.nextReview,
            lastReviewed: x.leitner.lastReviewed,
          }
        : undefined,
    } as VocabV2;
  });
}

function makeExamples(
  jp: string | string[] | undefined,
  vi: string | string[] | undefined
) {
  const J = Array.isArray(jp) ? jp : jp ? [jp] : [];
  const V = Array.isArray(vi) ? vi : vi ? [vi] : [];
  const n = Math.max(J.length, V.length);
  return Array.from({ length: n }, (_, i) => ({
    jp: J[i] || "",
    vi: V[i] || undefined,
  }));
}
