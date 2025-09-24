export type RowErr = { row: number; message: string };

export function validateVocabV2(rows: any[]): RowErr[] {
  const errs: RowErr[] = [];
  const required = ["word_id", "kanji", "sense_index", "meaning_vi"];
  rows.forEach((r, i) => {
    for (const k of required)
      if (!String(r[k] ?? "").trim())
        errs.push({ row: i + 2, message: `Thiếu cột ${k}` });
    const jp = String(r.examples_jp ?? ""),
      vi = String(r.examples_vi ?? "");
    const jpN = jp ? jp.split("||").filter(Boolean).length : 0;
    const viN = vi ? vi.split("||").filter(Boolean).length : 0;
    if (jpN && viN && jpN !== viN)
      errs.push({ row: i + 2, message: `Số câu JP (${jpN}) != VI (${viN})` });
  });
  return errs;
}
