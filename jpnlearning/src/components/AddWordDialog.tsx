import React from "react";
import type { VocabularyItem, ExamplePair, Colloc } from "@/types/vocabulary";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (item: VocabularyItem) => void;
}

const splitLines = (s: string) =>
  (s || "")
    .split(/\r?\n|,/)
    .map((x) => x.trim())
    .filter(Boolean);

const AddWordDialog: React.FC<Props> = ({ open, onClose, onSave }) => {
  const [kanji, setKanji] = React.useState("");
  const [hiragana, setHiragana] = React.useState("");
  const [meaning, setMeaning] = React.useState(""); // nghĩa chính
  const [moreMeanings, setMoreMeanings] = React.useState(""); // các nghĩa phụ (ngăn bởi dấu phẩy/enter)
  const [sino, setSino] = React.useState("");

  // ví dụ động
  const [examples, setExamples] = React.useState<ExamplePair[]>([
    { jp: "", vi: "" },
  ]);

  // nhóm collocations
  const [ren, setRen] = React.useState<Colloc[]>([]);
  const [go, setGo] = React.useState<Colloc[]>([]);
  const [rui, setRui] = React.useState<Colloc[]>([]);
  const [kan, setKan] = React.useState<Colloc[]>([]);
  const [tai, setTai] = React.useState<Colloc[]>([]);

  const [starred, setStarred] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      // reset khi đóng
      setKanji("");
      setHiragana("");
      setMeaning("");
      setMoreMeanings("");
      setSino("");
      setExamples([{ jp: "", vi: "" }]);
      setRen([]);
      setGo([]);
      setRui([]);
      setKan([]);
      setTai([]);
      setStarred(false);
      setShowAdvanced(false);
    }
  }, [open]);

  if (!open) return null;

  const addRow = (arr: Colloc[], setArr: (v: Colloc[]) => void) => {
    setArr([...arr, { jp: "", vi: "" }]);
  };
  const updateRow = (
    arr: Colloc[],
    setArr: (v: Colloc[]) => void,
    i: number,
    key: "jp" | "vi",
    val: string
  ) => {
    const next = [...arr];
    next[i] = { ...next[i], [key]: val };
    setArr(next);
  };
  const removeRow = (
    arr: Colloc[],
    setArr: (v: Colloc[]) => void,
    i: number
  ) => {
    const next = [...arr];
    next.splice(i, 1);
    setArr(next);
  };

  const onSubmit = (andContinue = false) => {
    if (!hiragana || !(kanji || hiragana) || !(meaning || moreMeanings)) {
      alert("Cần tối thiểu: Hiragana và ít nhất 1 nghĩa.");
      return;
    }

    const more = splitLines(moreMeanings);
    const mList = [meaning, ...more].filter(Boolean);
    const exList = examples
      .filter((e) => e.jp?.trim())
      .map((e) => ({ jp: e.jp.trim(), vi: e.vi?.trim() || undefined }));

    const collocations: VocabularyItem["collocations"] = {};
    if (ren.length) collocations.ren = ren.filter((r) => r.jp.trim());
    if (go.length) collocations.go = go.filter((r) => r.jp.trim());
    if (rui.length) collocations.rui = rui.filter((r) => r.jp.trim());
    if (kan.length) collocations.kan = kan.filter((r) => r.jp.trim());
    if (tai.length) collocations.tai = tai.filter((r) => r.jp.trim());

    const item: VocabularyItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : `m-${Date.now()}`,
      kanji: (kanji || hiragana).trim(),
      hiragana: hiragana.trim(),
      meaning: mList[0] || "",
      starred,
      sinoVietnamese: sino || undefined,
      meanings: mList.length > 1 ? mList : undefined,
      examples: exList.length ? exList : undefined,
      collocations: Object.keys(collocations).length ? collocations : undefined,
    };

    onSave(item);

    if (andContinue) {
      setKanji("");
      setHiragana("");
      setMeaning("");
      setMoreMeanings("");
      setSino("");
      setExamples([{ jp: "", vi: "" }]);
      setRen([]);
      setGo([]);
      setRui([]);
      setKan([]);
      setTai([]);
      setStarred(false);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-[min(880px,95vw)] max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-xl font-semibold mb-4">Thêm từ mới</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">Kanji</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={kanji}
              onChange={(e) => setKanji(e.target.value)}
              placeholder="面白い / 学校 …"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Hiragana</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={hiragana}
              onChange={(e) => setHiragana(e.target.value)}
              placeholder="おもしろい / がっこう …"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm text-gray-600">
              Nghĩa (VI) – nghĩa chính
            </label>
            <textarea
              className="mt-1 w-full rounded-xl border px-3 py-2"
              rows={2}
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              placeholder="Thú vị, Trường học …"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm text-gray-600">
              Các nghĩa phụ (mỗi dòng hoặc phẩy)
            </label>
            <textarea
              className="mt-1 w-full rounded-xl border px-3 py-2"
              rows={2}
              value={moreMeanings}
              onChange={(e) => setMoreMeanings(e.target.value)}
              placeholder={"ví dụ:\nTuổi\nNăm dương lịch"}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm text-gray-600">
              Âm Hán–Việt (không bắt buộc)
            </label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={sino}
              onChange={(e) => setSino(e.target.value)}
              placeholder="Diện bạch / Học hiệu …"
            />
          </div>
        </div>

        {/* ====== Advanced ====== */}
        <div className="mt-4">
          <button
            className="text-sm text-indigo-600 hover:underline"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? "Ẩn" : "Thêm"} thông tin nâng cao (ví dụ,
            連/合/類/関/対)
          </button>
        </div>

        {showAdvanced && (
          <div className="mt-4 space-y-6">
            {/* Ví dụ */}
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-2">
                Ví dụ (JA/VI)
              </div>
              {examples.map((ex, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2"
                >
                  <input
                    className="rounded-xl border px-3 py-2"
                    placeholder="日本語の例文"
                    value={ex.jp}
                    onChange={(e) => {
                      const next = [...examples];
                      next[i] = { ...next[i], jp: e.target.value };
                      setExamples(next);
                    }}
                  />
                  <div className="flex gap-2">
                    <input
                      className="flex-1 rounded-xl border px-3 py-2"
                      placeholder="Nghĩa tiếng Việt"
                      value={ex.vi || ""}
                      onChange={(e) => {
                        const next = [...examples];
                        next[i] = { ...next[i], vi: e.target.value };
                        setExamples(next);
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        const next = [...examples];
                        next.splice(i, 1);
                        setExamples(next.length ? next : [{ jp: "", vi: "" }]);
                      }}
                    >
                      Xoá
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => setExamples([...examples, { jp: "", vi: "" }])}
              >
                + Thêm ví dụ
              </Button>
            </div>

            {/* Collocations groups */}
            {[
              { label: "連 (cụm đi kèm)", arr: ren, set: setRen },
              { label: "合 (kết hợp)", arr: go, set: setGo },
              { label: "類 (đồng nghĩa)", arr: rui, set: setRui },
              { label: "関 (liên quan)", arr: kan, set: setKan },
              { label: "対 (đối nghĩa)", arr: tai, set: setTai },
            ].map((g, gi) => (
              <div key={gi}>
                <div className="text-sm font-semibold text-gray-700 mb-2">
                  {g.label}
                </div>
                {g.arr.length === 0 && (
                  <div className="text-xs text-gray-500 mb-2">
                    Chưa có mục nào.
                  </div>
                )}
                {g.arr.map((row, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2"
                  >
                    <input
                      className="rounded-xl border px-3 py-2"
                      placeholder="Cụm tiếng Nhật"
                      value={row.jp}
                      onChange={(e) =>
                        updateRow(g.arr, g.set, i, "jp", e.target.value)
                      }
                    />
                    <div className="flex gap-2">
                      <input
                        className="flex-1 rounded-xl border px-3 py-2"
                        placeholder="Nghĩa tiếng Việt (tuỳ chọn)"
                        value={row.vi || ""}
                        onChange={(e) =>
                          updateRow(g.arr, g.set, i, "vi", e.target.value)
                        }
                      />
                      <Button
                        variant="outline"
                        onClick={() => removeRow(g.arr, g.set, i)}
                      >
                        Xoá
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={() => addRow(g.arr, g.set)}>
                  + Thêm dòng
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={starred}
              onChange={(e) => setStarred(e.target.checked)}
            />
            Đánh dấu ⭐ quan trọng
          </label>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button variant="outline" onClick={() => onSubmit(true)}>
              Lưu & thêm tiếp
            </Button>
            <Button variant="gradient" onClick={() => onSubmit(false)}>
              Lưu
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddWordDialog;
