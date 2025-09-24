// src/components/EditWordDialog.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { VocabularyItem, ExamplePair, Colloc } from "@/types/vocabulary";

/** ---------- Helpers chuyển đổi dữ liệu ---------- */
const toExampleLines = (arr?: ExamplePair[]) =>
  (arr ?? [])
    .map((e) => `${e.jp || ""}${e.vi ? ` || ${e.vi}` : ""}`)
    .join("\n");

const parseExampleLines = (s: string): ExamplePair[] =>
  (s || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const parts = l.split("||");
      const jp = (parts[0] || "").trim();
      const vi = (parts[1] || "").trim();
      return { jp, vi: vi || undefined };
    });

const toPairsString = (arr?: Colloc[]) =>
  (arr ?? []).map((c) => `${c.jp}${c.vi ? `::${c.vi}` : ""}`).join(" || ");

const parsePairsString = (s: string): Colloc[] =>
  (s || "")
    .split("||")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => {
      const [jp, vi] = t.split("::").map((x) => (x || "").trim());
      return { jp, vi: vi || undefined };
    });

/** ---------- Props ---------- */
type Props = {
  open: boolean;
  value: VocabularyItem;
  onClose: () => void;
  onSave: (next: VocabularyItem) => void;
};

/** ---------- Component ---------- */
export default function EditWordDialog({
  open,
  value,
  onClose,
  onSave,
}: Props) {
  // Thông tin chính
  const [kanji, setKanji] = React.useState<string>(value.kanji || "");
  const [hiragana, setHira] = React.useState<string>(value.hiragana || "");
  const [meaning, setMeaning] = React.useState<string>(value.meaning || "");
  const [sino, setSino] = React.useState<string>(value.sinoVietnamese || "");
  const [meanings, setMeanings] = React.useState<string>(
    (value.meanings ?? []).join(" | ")
  );

  // Ví dụ
  const [examples, setExamples] = React.useState<string>(
    toExampleLines(value.examples)
  );

  // Cụm liên quan
  const [ren, setRen] = React.useState<string>(
    toPairsString(value.collocations?.ren)
  );
  const [go, setGo] = React.useState<string>(
    toPairsString(value.collocations?.go)
  );
  const [rui, setRui] = React.useState<string>(
    toPairsString(value.collocations?.rui)
  );
  const [kan, setKan] = React.useState<string>(
    toPairsString(value.collocations?.kan)
  );
  const [tai, setTai] = React.useState<string>(
    toPairsString(value.collocations?.tai)
  );
  // NEW: 慣 / 名
  const [kanyo, setKanyo] = React.useState<string>(
    toPairsString((value as any).collocations?.kanyo)
  );
  const [mei, setMei] = React.useState<string>(
    toPairsString((value as any).collocations?.mei)
  );

  // Reset state khi mở lại dialog
  React.useEffect(() => {
    if (!open) return;
    setKanji(value.kanji || "");
    setHira(value.hiragana || "");
    setMeaning(value.meaning || "");
    setSino(value.sinoVietnamese || "");
    setMeanings((value.meanings ?? []).join(" | "));
    setExamples(toExampleLines(value.examples));

    setRen(toPairsString(value.collocations?.ren));
    setGo(toPairsString(value.collocations?.go));
    setRui(toPairsString(value.collocations?.rui));
    setKan(toPairsString(value.collocations?.kan));
    setTai(toPairsString(value.collocations?.tai));
    setKanyo(toPairsString((value as any).collocations?.kanyo));
    setMei(toPairsString((value as any).collocations?.mei));
  }, [open, value]);

  /** Lưu */
  const handleSave = () => {
    const next: VocabularyItem = {
      ...value, // GIỮ id, leitner, starred
      kanji: kanji.trim(),
      hiragana: hiragana.trim(),
      meaning: meaning.trim(),
      sinoVietnamese: sino.trim() || undefined,
    };

    // meanings (danh sách)
    const mms = meanings
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
    next.meanings = mms.length ? mms : undefined;

    // examples
    const ex = parseExampleLines(examples);
    next.examples = ex.length ? ex : undefined;

    // collocations
    const hasAnyColloc = [ren, go, rui, kan, tai, kanyo, mei].some(
      (v) => (v ?? "").trim().length > 0
    );
    if (hasAnyColloc) {
      next.collocations = {
        ren: parsePairsString(ren),
        go: parsePairsString(go),
        rui: parsePairsString(rui),
        kan: parsePairsString(kan),
        tai: parsePairsString(tai),
        ...(kanyo ? { kanyo: parsePairsString(kanyo) } : {}),
        ...(mei ? { mei: parsePairsString(mei) } : {}),
      };
    } else {
      next.collocations = undefined;
    }

    onSave(next);
  };

  /** ---------- UI ---------- */
  return (
    <Dialog
      open={open}
      onOpenChange={(val: boolean) => {
        if (!val) onClose();
      }}
    >
      {/* DialogContent đã được set max-h & overflow trong ui/dialog.tsx */}
      <DialogContent className="max-w-3xl">
        {/* Header (cố định) */}
        <div className="px-6 pt-6">
          <DialogHeader>
            <DialogTitle className="text-xl">Sửa từ vựng</DialogTitle>
          </DialogHeader>
        </div>

        {/* VÙNG CUỘN */}
        <div className="max-h-[70vh] overflow-y-auto px-6 pb-4 overscroll-contain">
          {/* Nhóm A: Thông tin chính */}
          <section className="rounded-2xl border bg-gray-50 p-4 mb-6">
            <h3 className="mb-3 font-semibold text-sm text-gray-700">
              Thông tin chính
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600">Kanji</label>
                <Input
                  value={kanji}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setKanji(e.target.value)
                  }
                  placeholder="例: 年 / 成長 / 世話"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Hiragana / Kana</label>
                <Input
                  value={hiragana}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setHira(e.target.value)
                  }
                  placeholder="れい: とし / せいちょう / せわ"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Nghĩa chính</label>
                <Input
                  value={meaning}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setMeaning(e.target.value)
                  }
                  placeholder="năm, tuổi / tăng trưởng, trưởng thành / chăm sóc…"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">
                  Danh sách nghĩa (tùy chọn, ngăn bằng “|”)
                </label>
                <Input
                  value={meanings}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setMeanings(e.target.value)
                  }
                  placeholder="năm | tuổi"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  Dùng khi 1 từ có nhiều nghĩa. Nếu bỏ trống sẽ chỉ dùng “Nghĩa
                  chính”.
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">
                  Âm Hán–Việt (tùy chọn)
                </label>
                <Input
                  value={sino}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSino(e.target.value)
                  }
                  placeholder="NIÊN / THÀNH TRƯỞNG / THẾ THOẠI…"
                />
              </div>
            </div>
          </section>

          {/* Nhóm B: Ví dụ */}
          <section className="rounded-2xl border bg-gray-50 p-4 mb-6">
            <h3 className="mb-3 font-semibold text-sm text-gray-700">Ví dụ</h3>
            <label className="text-xs text-gray-600">
              Mỗi dòng: <code>JP || VI</code>
            </label>
            <Textarea
              rows={6}
              value={examples}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setExamples(e.target.value)
              }
              className="font-mono"
              placeholder={`年の初めに１年の計画を立てる。 || Lập kế hoạch vào đầu năm mới。\nこの映画は面白いです。 || Bộ phim này thú vị.`}
            />
          </section>

          {/* Nhóm C: Cụm từ liên quan */}
          <section className="rounded-2xl border bg-gray-50 p-4 mb-2">
            <h3 className="mb-3 font-semibold text-sm text-gray-700">
              Cụm từ liên quan
            </h3>
            <p className="text-xs text-gray-500 mb-2">
              Mỗi mục: <code>JP::VI</code> • nhiều mục ngăn bằng <code>||</code>
            </p>

            {(
              [
                ["連", ren, setRen],
                ["合", go, setGo],
                ["類", rui, setRui],
                ["関", kan, setKan],
                ["対", tai, setTai],
                ["慣", kanyo, setKanyo],
                ["名", mei, setMei],
              ] as const
            ).map(([label, val, setVal]) => (
              <div key={label} className="md:col-span-2 mb-3">
                <label className="text-xs text-gray-600">{label}</label>
                <Input
                  value={val}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setVal(e.target.value)
                  }
                  placeholder="年明け::sự khởi đầu năm mới || 年齢::tuổi tác"
                />
              </div>
            ))}
          </section>
        </div>

        {/* Footer (cố định) */}
        <div className="px-6 pb-6">
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button onClick={handleSave}>Lưu</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
