// src/components/CSVUploader.tsx
"use client";

import React, { useCallback, useRef, useState } from "react";
import Papa, { ParseResult, ParseError } from "papaparse";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadCloud, CheckCircle2, AlertCircle } from "lucide-react";
import type { VocabularyItem, ExamplePair, Colloc } from "@/types/vocabulary";

/* ========== Helpers chuẩn hoá ========== */
const stripDiacritics = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const norm = (s: string) =>
  stripDiacritics(String(s ?? ""))
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const pickByKeys = (row: Record<string, any>, keys: string[]) => {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && String(v).trim() !== "") return String(v).trim();
  }
  return "";
};
const safeJSON = <T,>(s: string): T | null => {
  try {
    const v = JSON.parse(s);
    return v as T;
  } catch {
    return null;
  }
};

/* ========== Header khoá ========== */
const KANJI_KEYS = ["kanji", "chu kanji", "chu", "word", "kanji/kana"];
const HIRA_KEYS = [
  "hiragana",
  "kana",
  "furigana",
  "reading",
  "yomi",
  "phien am",
  "phien am hiragana",
];
const MEANING_KEYS = [
  "nghia",
  "nghia viet",
  "meaning",
  "translation",
  "viet",
  "vietnamese",
  "vi",
];
const SINO_KEYS = [
  "am han viet",
  "am hán việt",
  "han viet",
  "hanviet",
  "amhanviet",
  "sino",
  "sino_vietnamese",
];

/* CSV v1 cũ */
const EX_SENT_KEYS = [
  "cau mau",
  "mau cau",
  "vi du",
  "example",
  "sentence",
  "sample",
  "cau vi du",
];
const EX_MEAN_KEYS = [
  "y nghia cau mau",
  "y nghia cau",
  "nghia cau mau",
  "giai nghia",
  "sentence meaning",
  "example meaning",
];

/* CSV v2 (JSON trong 1 cell) */
const MEANINGS_JSON_KEYS = ["meanings", "nghia json", "nghia list", "nghia[]"];
const EXAMPLES_JSON_KEYS = [
  "examples",
  "vi du json",
  "cau mau json",
  "examples json",
];
const REN_KEYS = ["ren", "連"];
const GO_KEYS = ["go", "合"];
const RUI_KEYS = ["rui", "類"];
const KAN_KEYS = ["kan", "関"];
const TAI_KEYS = ["tai", "対"];
/* --- NEW: chip bổ sung --- */
const KANYO_KEYS = ["kanyo", "慣"];
const MEI_KEYS = ["mei", "名"];

/* CSV v2 long-form (mỗi dòng = 1 nghĩa) */
const LONG_REQUIRED = ["word_id", "sense_index", "meaning_vi"];
/* --- UPDATED: thêm kanyo, mei; bỏ jlpt, tags --- */
const LONG_COLS = [
  "word_id",
  "kanji",
  "hiragana",
  "sino_vietnamese",
  "sense_index",
  "meaning_vi",
  "examples_jp",
  "examples_vi",
  "ren",
  "go",
  "rui",
  "kan",
  "tai",
  "kanyo",
  "mei",
];

type Detected = { headers: string[]; sample?: any };

/* ========= Long-form helpers ========= */
const SPLIT = "||";
const PAIR = "::";
const splitList = (s?: string) =>
  String(s ?? "").trim()
    ? String(s)
        .split(SPLIT)
        .map((x) => x.trim())
        .filter(Boolean)
    : [];
const splitPairs = (s?: string): Colloc[] =>
  splitList(s)
    .map((x) => {
      const [jp, vi] = x.split(PAIR).map((y) => y?.trim());
      return { jp: jp ?? "", vi: vi || undefined };
    })
    .filter((it) => it.jp);

const uniqueBy = <T, K extends string>(arr: T[], key: (t: T) => K) => {
  const m = new Map<K, T>();
  for (const it of arr) m.set(key(it), it);
  return [...m.values()];
};

/* ========= Component ========= */
export const CSVUploader: React.FC<{
  onVocabularyImported: (items: VocabularyItem[]) => void;
}> = ({ onVocabularyImported }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detected, setDetected] = useState<Detected | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  /* --- Parser: header --- */
  const parseWithHeader = (
    file: File,
    onDone: (rows: Record<string, string>[]) => void
  ) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h: string) => norm(h),
      complete: ({ data, meta }: ParseResult<Record<string, string>>) => {
        const headers = (meta.fields ?? []).map(norm);
        setDetected({ headers, sample: (data as any[])[0] });
        onDone(data as any[]);
      },
      error: (err: ParseError) => setError(err.message),
    });
  };

  /* --- Parser: no header --- */
  const parseWithoutHeader = (file: File, onDone: (rows: any[][]) => void) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: "greedy",
      complete: ({ data }: ParseResult<any>) => onDone(data as any[][]),
      error: (err: ParseError) => setError(err.message),
    });
  };

  /* --- DETECT: long-form? --- */
  const isLongForm = (headers: string[]) =>
    LONG_REQUIRED.every((k) => headers.includes(k));

  /* --- BUILD: CSV có header (linh hoạt + long-form) --- */
  const buildItemsFromHeaderRows = (
    rows: Record<string, string>[],
    headers: string[]
  ) => {
    // Nhánh 1: LONG-FORM
    if (isLongForm(headers)) {
      const byId = new Map<string, VocabularyItem>();

      for (const raw of rows) {
        const id = String(raw.word_id ?? "").trim();
        if (!id) continue;

        const kanji = String(raw.kanji ?? "").trim();
        const hira = String(raw.hiragana ?? "").trim();
        const meaning_vi = String(raw.meaning_vi ?? "").trim();
        const sino = String((raw as any).sino_vietnamese ?? "").trim();

        if (!meaning_vi || (!kanji && !hira)) continue;

        const exJP = splitList(raw.examples_jp);
        const exVI = splitList(raw.examples_vi);
        const n = Math.max(exJP.length, exVI.length);
        const examples: ExamplePair[] = Array.from({ length: n }, (_, i) => ({
          jp: exJP[i] || "",
          vi: exVI[i] || undefined,
        })).filter((e) => e.jp || e.vi);

        const ren = splitPairs(raw.ren);
        const go = splitPairs(raw.go);
        const rui = splitPairs(raw.rui);
        const kan = splitPairs(raw.kan);
        const tai = splitPairs(raw.tai);
        /* --- NEW: đọc thêm kanyo/mei --- */
        const kanyo = splitPairs((raw as any).kanyo);
        const mei = splitPairs((raw as any).mei);

        const current =
          byId.get(id) ??
          ({
            id:
              (crypto as any).randomUUID?.() ??
              `lf-${id}-${Math.random().toString(36).slice(2, 7)}`,
            kanji: kanji || hira,
            hiragana: hira,
            meaning: meaning_vi,
            meanings: [],
            examples: [],
            collocations: {},
            starred: false,
          } as VocabularyItem);

        if (sino && !(current as any).sinoVietnamese) {
          (current as any).sinoVietnamese = sino;
        }

        // meanings
        const mArr = (current.meanings ?? []).concat([meaning_vi]).filter(Boolean);
        current.meanings = Array.from(new Set(mArr));

        // examples
        const exArr = (current.examples ?? []).concat(examples);
        current.examples = uniqueBy(exArr, (e) => `${e.jp}__${e.vi ?? ""}`);

        // collocations (gộp + dedupe)
        const mergeCol = (
          key: keyof NonNullable<VocabularyItem["collocations"]>,
          list: Colloc[]
        ) => {
          if (!list?.length) return;
          const prev = (current.collocations as any)?.[key] ?? [];
          const merged = uniqueBy<Colloc, string>(
            [...prev, ...list],
            (c) => `${c.jp}__${c.vi ?? ""}`
          );
          (current.collocations as any)[key] = merged;
        };
        if (ren.length) mergeCol("ren", ren);
        if (go.length) mergeCol("go", go);
        if (rui.length) mergeCol("rui", rui);
        if (kan.length) mergeCol("kan", kan);
        if (tai.length) mergeCol("tai", tai);
        /* --- NEW --- */
        if (kanyo.length) mergeCol("kanyo", kanyo);
        if (mei.length) mergeCol("mei", mei);

        if (!current.kanji && kanji) current.kanji = kanji;
        if (!current.hiragana && hira) current.hiragana = hira;

        byId.set(id, current);
      }

      return [...byId.values()].filter(
        (it) =>
          (it.meaning || (it.meanings && it.meanings.length)) &&
          it.hiragana &&
          (it.kanji || it.hiragana)
      );
    }

    // Nhánh 2: CSV có header kiểu cũ (linh hoạt + JSON trong cell)
    const items: VocabularyItem[] = rows.map((raw, idx) => {
      const normalized: Record<string, any> = {};
      Object.keys(raw || {}).forEach((k) => (normalized[norm(k)] = raw[k]));

      const kanjiRaw = pickByKeys(normalized, KANJI_KEYS);
      const hira = pickByKeys(normalized, HIRA_KEYS);
      const meaning = pickByKeys(normalized, MEANING_KEYS);
      const sino = pickByKeys(normalized, SINO_KEYS);

      const exSentence = pickByKeys(normalized, EX_SENT_KEYS);
      const exMeaning = pickByKeys(normalized, EX_MEAN_KEYS);

      const meaningsJSON = pickByKeys(normalized, MEANINGS_JSON_KEYS);
      const examplesJSON = pickByKeys(normalized, EXAMPLES_JSON_KEYS);

      const renJSON = pickByKeys(normalized, REN_KEYS);
      const goJSON = pickByKeys(normalized, GO_KEYS);
      const ruiJSON = pickByKeys(normalized, RUI_KEYS);
      const kanJSON = pickByKeys(normalized, KAN_KEYS);
      const taiJSON = pickByKeys(normalized, TAI_KEYS);
      /* --- NEW: JSON cho kanyo/mei --- */
      const kanyoJSON = pickByKeys(normalized, KANYO_KEYS);
      const meiJSON = pickByKeys(normalized, MEI_KEYS);

      const kanji = kanjiRaw || hira;

      const result: VocabularyItem = {
        id:
          (crypto as any).randomUUID?.() ??
          `h-${idx}-${Math.random().toString(36).slice(2, 7)}`,
        kanji: String(kanji || "").trim(),
        hiragana: String(hira || "").trim(),
        meaning: String(meaning || "").trim(),
        starred: false,
      };

      if (sino) result.sinoVietnamese = sino;

      const mArr = meaningsJSON ? safeJSON<string[]>(meaningsJSON) : null;
      if (Array.isArray(mArr) && mArr.length) result.meanings = mArr;

      const exArr = examplesJSON ? safeJSON<ExamplePair[]>(examplesJSON) : null;
      if (Array.isArray(exArr) && exArr.length) result.examples = exArr;

      const renArr = renJSON ? safeJSON<Colloc[]>(renJSON) : null;
      const goArr = goJSON ? safeJSON<Colloc[]>(goJSON) : null;
      const ruiArr = ruiJSON ? safeJSON<Colloc[]>(ruiJSON) : null;
      const kanArr = kanJSON ? safeJSON<Colloc[]>(kanJSON) : null;
      const taiArr = taiJSON ? safeJSON<Colloc[]>(taiJSON) : null;
      /* --- NEW: parse thêm --- */
      const kanyoArr = kanyoJSON ? safeJSON<Colloc[]>(kanyoJSON) : null;
      const meiArr = meiJSON ? safeJSON<Colloc[]>(meiJSON) : null;

      if (
        (renArr?.length ?? 0) +
          (goArr?.length ?? 0) +
          (ruiArr?.length ?? 0) +
          (kanArr?.length ?? 0) +
          (taiArr?.length ?? 0) +
          (kanyoArr?.length ?? 0) +
          (meiArr?.length ?? 0) >
        0
      ) {
        result.collocations = {
          ren: renArr ?? undefined,
          go: goArr ?? undefined,
          rui: ruiArr ?? undefined,
          kan: kanArr ?? undefined,
          tai: taiArr ?? undefined,
          /* --- NEW --- */
          kanyo: kanyoArr ?? undefined,
          mei: meiArr ?? undefined,
        };
      }

      if (exSentence || exMeaning) {
        result.exampleSentence = exSentence || undefined;
        result.exampleMeaning = exMeaning || undefined;
        if (!result.examples && exSentence) {
          result.examples = [{ jp: exSentence, vi: exMeaning || undefined }];
        }
      }

      return result;
    });

    return items.filter(
      (it) => it.meaning && it.hiragana && (it.kanji || it.hiragana)
    );
  };

  /* --- BUILD: no header (3–6 cột) --- */
  const buildItemsFromNoHeaderRows = (rows: any[][]) => {
    const items: VocabularyItem[] = rows.map((arr, idx) => {
      const [c0, c1, c2, c3, c4, c5] = arr ?? [];
      const kanji = String(c0 ?? "").trim();
      const hira = String(c1 ?? "").trim();
      const meaning = String(c2 ?? "").trim();
      const sino = String(c3 ?? "").trim();
      const exSentence = String(c4 ?? "").trim();
      const exMeaning = String(c5 ?? "").trim();

      const v: VocabularyItem = {
        id:
          (crypto as any).randomUUID?.() ??
          `n-${idx}-${Math.random().toString(36).slice(2, 7)}`,
        kanji: kanji || hira,
        hiragana: hira,
        meaning,
        starred: false,
      };
      if (sino) v.sinoVietnamese = sino;
      if (exSentence)
        v.examples = [{ jp: exSentence, vi: exMeaning || undefined }];
      return v;
    });

    return items.filter(
      (it) => it.meaning && it.hiragana && (it.kanji || it.hiragana)
    );
  };

  /* --- Điều phối --- */
  const handleParsed = (file: File) => {
    setError(null);
    setInfo("Đang đọc CSV…");

    parseWithHeader(file, (rows) => {
      const headers = detected?.headers ?? [];
      const items = buildItemsFromHeaderRows(
        rows,
        headers.length ? headers : Object.keys(rows[0] ?? {}).map(norm)
      );
      if (items.length > 0) {
        setInfo(`✅ Đã nhập ${items.length} từ.`);
        onVocabularyImported(items);
        return;
      }
      parseWithoutHeader(file, (rowsNoHeader) => {
        const items2 = buildItemsFromNoHeaderRows(rowsNoHeader as any[][]);
        if (items2.length > 0) {
          setInfo(`✅ Đã nhập ${items2.length} từ.`);
          onVocabularyImported(items2);
        } else {
          setInfo(null);
          setError(
            "Không tìm thấy dữ liệu hợp lệ trong CSV. Hãy kiểm tra: (1) đủ cột Hiragana & Nghĩa, hoặc theo long-form có word_id/sense_index, (2) file không trống."
          );
        }
      });
    });
  };

  /* ===== UI nạp file ===== */
  const onFileChosen = (file?: File) => {
    if (file) handleParsed(file);
  };
  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    onFileChosen(e.dataTransfer.files?.[0]);
  }, []);
  const onDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => e.preventDefault(),
    []
  );

  return (
    <Card className="max-w-3xl mx-auto gradient-card shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="inline-flex w-5 h-5 items-center justify-center">📄</span>
          Import từ vựng từ CSV
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          className="w-full rounded-2xl border-2 border-dashed border-gray-300 bg-white/60 p-8 text-center"
        >
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
            <UploadCloud className="h-6 w-6 text-indigo-600" />
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Kéo thả file CSV vào đây hoặc bấm nút dưới.
            <br />
            Hỗ trợ: <b>CSV V1 (3–6 cột / hoặc header linh hoạt)</b>,{" "}
            <b>CSV V2 (cột JSON)</b>,{" "}
            <b>CSV V2 long-form (mỗi dòng = 1 nghĩa)</b>.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => onFileChosen(e.target.files?.[0] ?? undefined)}
          />
          <Button variant="gradient" onClick={() => inputRef.current?.click()}>
            Chọn file CSV
          </Button>
        </div>

        {/* Ví dụ CSV */}
        <div className="rounded-xl bg-gray-50 p-4 text-sm space-y-3">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Ví dụ CSV V1 có header:
          </div>
          <pre className="bg-white rounded-lg p-3 overflow-auto">{`Kanji,Hiragana,Nghĩa,Âm Hán-Việt,Câu mẫu,Ý nghĩa câu mẫu
学校,がっこう,Trường học,Học hiệu,学校へ行きます。,Tôi đi đến trường.`}</pre>

          <div className="flex items-center gap-2 font-medium pt-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Ví dụ CSV V2 (cột JSON trong 1 ô):
          </div>
          <pre className="bg-white rounded-lg p-3 overflow-auto">{`Kanji,Hiragana,Nghĩa,Âm Hán-Việt,Meanings,Examples,Ren,Go,Rui,Kan,Tai,Kanyo,Mei
年,とし,,,"[\"năm\",\"tuổi\"]","[{\"jp\":\"この映画は面白いです。\",\"vi\":\"Bộ phim này thú vị.\"}]",[],[],[],[],[],[],[]`}</pre>

          <div className="flex items-center gap-2 font-medium pt-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Ví dụ CSV V2 Long-form (mỗi dòng = một nghĩa):
          </div>
          {/* --- UPDATED: header mẫu có kanyo & mei, không có jlpt/tags --- */}
          <pre className="bg-white rounded-lg p-3 overflow-auto">{`word_id,kanji,hiragana,sino_vietnamese,sense_index,meaning_vi,examples_jp,examples_vi,ren,go,rui,kan,tai,kanyo,mei
nen001,年,とし,NIÊN,1,năm,"年の初めに１年の計画を立てる。||父は年より若く見える","Lập kế hoạch cho một năm...||Bố tôi nhìn trẻ hơn...", "＿が始まる⇔終わる||＿が明ける||＿が過ぎる::","明け::Sự khởi đầu năm mới","年齢::Tuổi tác","年度::niên độ","","",""
nen001,年,とし,NIÊN,2,tuổi,"＿をとる","Có tuổi","＿をとる::Có tuổi","（お）年寄り::Người lớn tuổi","年齢::Tuổi tác",,"",""`}</pre>

          {info && (
            <div className="mt-2 rounded-lg bg-emerald-50 p-3 text-emerald-700 ring-1 ring-emerald-200">
              {info}
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 text-rose-600 text-sm mt-2">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div>
                {error}
                {detected?.headers && (
                  <div className="mt-1 text-xs text-rose-500">
                    Headers phát hiện:{" "}
                    <code>{detected.headers.join(", ") || "(không có)"}</code>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
