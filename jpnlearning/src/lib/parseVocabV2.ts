import type {
  VocabV2,
  Sense,
  CollocationItem,
  CollocationGroups,
} from "@/types/vocab-v2";

const SPLIT = "||";
const PAIR = "::";
const clean = (s: any) => (typeof s === "string" ? s.trim() : "");
const splitList = (s?: string) =>
  clean(s)
    ? clean(s)
        .split(SPLIT)
        .map((x) => x.trim())
        .filter(Boolean)
    : [];
const splitPairs = (s?: string): CollocationItem[] =>
  splitList(s)
    .map((x) => {
      const [jp, vi] = x.split(PAIR).map((y) => y?.trim());
      return { jp: jp ?? "", vi: vi || undefined };
    })
    .filter((it) => it.jp);

function buildExamples(jp: string, vi: string) {
  const jpArr = splitList(jp),
    viArr = splitList(vi);
  const n = Math.max(jpArr.length, viArr.length);
  const list: { jp: string; vi?: string }[] = [];
  for (let i = 0; i < n; i++) {
    const jpLine = jpArr[i],
      viLine = viArr[i];
    if (!jpLine && !viLine) continue;
    list.push({ jp: jpLine || "", vi: viLine || undefined });
  }
  return list;
}
function buildCollocs(r: any): CollocationGroups {
  return {
    ren: splitPairs(r.ren),
    go: splitPairs(r.go),
    rui: splitPairs(r.rui),
    kan: splitPairs(r.kan),
    tai: splitPairs(r.tai),
    kanyo: splitPairs(r.kanyo),
    mei: splitPairs(r.mei),
  };
}

export function parseVocabV2(rows: any[]): VocabV2[] {
  const byId = new Map<string, VocabV2>();
  for (const r of rows) {
    const wordId = clean(r.word_id);
    if (!wordId) continue;
    const base =
      byId.get(wordId) ??
      ({
        id: wordId,
        kanji: clean(r.kanji),
        hiragana: clean(r.hiragana) || undefined,
        jlpt: clean(r.jlpt) || undefined,
        tags: clean(r.tags)
          ? clean(r.tags)
              .split(",")
              .map((t) => t.trim())
          : [],
        senses: [],
      } as VocabV2);

    const sense: Sense = {
      index: Number(r.sense_index || base.senses.length + 1),
      meaning_vi: clean(r.meaning_vi),
      examples: buildExamples(clean(r.examples_jp), clean(r.examples_vi)),
      collocations: buildCollocs(r),
    };
    base.senses.push(sense);
    byId.set(wordId, base);
  }
  return [...byId.values()].map((v) => ({
    ...v,
    senses: v.senses.sort((a, b) => a.index - b.index),
  }));
}
