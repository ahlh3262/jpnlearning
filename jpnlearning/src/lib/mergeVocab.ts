import type { VocabV2 } from "@/types/vocab-v2";

export function mergeVocabulary(
  current: VocabV2[],
  incoming: VocabV2[]
): VocabV2[] {
  const byId = new Map<string, VocabV2>(current.map((v) => [v.id, v]));
  for (const item of incoming) {
    const existed = byId.get(item.id);
    if (!existed) {
      byId.set(item.id, item);
    } else {
      // gộp: giữ metadata cũ nếu có; senses mới sẽ replace theo index nếu trùng
      const mergedSenses = mergeSenses(existed.senses, item.senses);
      byId.set(item.id, {
        ...existed,
        kanji: item.kanji || existed.kanji,
        hiragana: item.hiragana ?? existed.hiragana,
        jlpt: item.jlpt ?? existed.jlpt,
        tags: unique([...(existed.tags ?? []), ...(item.tags ?? [])]),
        senses: mergedSenses,
        leitner: existed.leitner, // không ghi đè tiến trình học
      });
    }
  }
  return Array.from(byId.values());
}

function mergeSenses(a: VocabV2["senses"], b: VocabV2["senses"]) {
  const byIdx = new Map<number, VocabV2["senses"][number]>(
    a.map((s) => [s.index, s])
  );
  for (const s of b) byIdx.set(s.index, s); // CSV là nguồn dữ liệu “mới nhất”
  return Array.from(byIdx.values()).sort((x, y) => x.index - y.index);
}

function unique(arr: string[]) {
  return Array.from(new Set(arr.filter(Boolean)));
}
