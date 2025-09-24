// src/pages/index.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CSVUploader } from "@/components/CSVUploader";
import { VocabularyList } from "@/components/VocabularyList";
import { StudyMode } from "@/components/StudyMode";
import { QuizMode } from "@/components/QuizMode";
import { ReviewMode } from "@/components/ReviewMode";
import AddWordDialog from "@/components/AddWordDialog";
import type { VocabularyItem } from "@/types/vocabulary";
import { BookOpen, Brain, Upload, Star, List } from "lucide-react";
import {
  initializeLeitnerData,
  reviveDates,
  getDueWords,
  updateLeitnerData,
} from "@/hooks/use-leitner";
import LeitnerPanel from "@/components/LeitnerPanel";
import { KanjiQuizMode } from "@/components/KanjiQuizMode";
import { QuizPicker } from "@/components/QuizPicker";
import ClozeQuizMode from "@/components/ClozeQuizMode";
import EditWordDialog from "@/components/EditWordDialog"; // <-- NEW

/** bỏ dấu + lowercase để search ổn định */
const normalizeSearch = (s: string) =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/** ===== Helpers cho gộp thông minh ===== */
const normKey = (s: string) =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const keyFromItem = (v: VocabularyItem) =>
  `${normKey(v.kanji || "")}|${normKey(v.hiragana || "")}`;

type SmartMergeOpts = { preserveProgress: boolean };
function smartMerge(
  existing: VocabularyItem[],
  incoming: VocabularyItem[],
  opts: SmartMergeOpts
) {
  // Đưa existing vào map theo key
  const map = new Map<string, VocabularyItem>();
  for (const v of existing) map.set(keyFromItem(v), v);

  for (const incRaw of incoming) {
    const inc = incRaw;
    const k = keyFromItem(inc);
    if (map.has(k)) {
      // ĐÃ CÓ → THAY THẾ BẰNG BẢN MỚI
      const old = map.get(k)!;
      const next: VocabularyItem = {
        ...inc,
        id: old.id, // giữ id cũ để không xáo trộn
        ...(opts.preserveProgress
          ? {
              starred: old.starred || inc.starred || false,
              leitner: old.leitner ?? inc.leitner,
            }
          : {}),
      };
      map.set(k, next);
    } else {
      // CHƯA CÓ → THÊM MỚI
      const id =
        inc.id ||
        ((crypto as any).randomUUID?.() as string) ||
        `imp-${Math.random().toString(36).slice(2)}`;
      map.set(k, { ...inc, id });
    }
  }

  return [...map.values()];
}

const Index: React.FC = () => {
  const [vocabulary, setVocabulary] = React.useState<VocabularyItem[]>([]);
  const [activeList, setActiveList] = React.useState<VocabularyItem[]>([]);
  const [currentMode, setCurrentMode] = React.useState<
    "home" | "study" | "quiz" | "starred" | "review" | "kanjiQuiz" | "cloze"
  >("home");
  const [showAdd, setShowAdd] = React.useState(false);
  const [showQuizPicker, setShowQuizPicker] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // NEW: panel nhập CSV bất kỳ lúc nào + tuỳ chọn gộp
  const [showImportCSV, setShowImportCSV] = React.useState(false);
  const [preserveProgress, setPreserveProgress] = React.useState(true);

  // NEW: Dialog sửa từ
  const [editing, setEditing] = React.useState<VocabularyItem | null>(null);

  // ---- Load từ LocalStorage khi mở app
  React.useEffect(() => {
    const raw = localStorage.getItem("tsensei-vocab");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as VocabularyItem[];
        setVocabulary(reviveDates(parsed));
      } catch {
        // ignore
      }
    }
  }, []);

  // ---- Save mỗi khi vocabulary đổi
  React.useEffect(() => {
    localStorage.setItem("tsensei-vocab", JSON.stringify(vocabulary));
  }, [vocabulary]);

  // ---- CSV hoặc thêm tay
  const handleVocabularyImported = (newVocabulary: VocabularyItem[]) => {
    // Khởi tạo Leitner cho item mới
    const withLeitner = newVocabulary.map(initializeLeitnerData);
    // Gộp thông minh: có → thay thế; chưa có → thêm; (giữ tiến trình nếu tick)
    setVocabulary((prev) =>
      smartMerge(prev, withLeitner, { preserveProgress })
    );
    setShowImportCSV(false);
  };

  const handleAddWord = (item: VocabularyItem) => {
    setVocabulary((prev) => [initializeLeitnerData(item), ...prev]);
  };

  const handleToggleStar = (id: string) => {
    setVocabulary((prev) =>
      prev.map((it) => (it.id === id ? { ...it, starred: !it.starred } : it))
    );
  };

  // NEW: cập nhật từ khi lưu ở EditWordDialog (giữ id & leitner)
  const handleUpdateWord = (next: VocabularyItem) => {
    setVocabulary((prev) =>
      prev.map((v) =>
        v.id === next.id
          ? {
              ...v,
              ...next,
              id: v.id,
              leitner: v.leitner,
              starred: next.starred ?? v.starred,
            }
          : v
      )
    );
    setEditing(null);
  };

  const handleExitMode = () => {
    setActiveList([]);
    setCurrentMode("home");
  };

  // ---- Lọc theo tab + search
  const starredVocabulary = vocabulary.filter((i) => i.starred);
  const baseList = currentMode === "starred" ? starredVocabulary : vocabulary;
  const q = normalizeSearch(searchQuery);
  const filteredList = !q
    ? baseList
    : baseList.filter((it) =>
        [it.kanji, it.hiragana, it.meaning, it.sinoVietnamese].some(
          (f) => f && normalizeSearch(f).includes(q)
        )
      );

  // ---- Leitner helpers
  const dueList = React.useMemo(() => getDueWords(vocabulary), [vocabulary]);

  // ---- Điều hướng học/quiz
  const startStudyAll = () => {
    if (!filteredList.length) return;
    setActiveList(filteredList);
    setCurrentMode("study");
  };
  const startQuizAll = () => {
    if (!filteredList.length) return;
    setActiveList(filteredList);
    setCurrentMode("quiz");
  };
  const startKanjiQuiz = () => {
    if (!filteredList.length) return;
    setActiveList(filteredList);
    setCurrentMode("kanjiQuiz");
  };
  const startClozeQuiz = () => {
    if (!filteredList.length) return;
    // ưu tiên những từ có ví dụ
    const hasEx = filteredList.filter(
      (v) => v.examples?.length || v.exampleSentence
    );
    if (!hasEx.length) return;
    setActiveList(hasEx);
    setCurrentMode("cloze");
  };
  const startReviewDue = () => {
    if (!dueList.length) return;
    setActiveList(dueList);
    setCurrentMode("review");
  };

  const handleLeitnerUpdate = (id: string, correct: boolean) => {
    setVocabulary((prev) =>
      prev.map((it) => (it.id === id ? updateLeitnerData(it, correct) : it))
    );
  };

  // ---- Điều hướng chế độ
  if (currentMode === "study" && activeList.length > 0) {
    return (
      <StudyMode
        vocabulary={activeList}
        onExit={handleExitMode}
        onToggleStar={handleToggleStar}
        onUpdateWord={handleUpdateWord}
      />
    );
  }
  if (currentMode === "quiz" && activeList.length > 0) {
    return (
      <QuizMode
        vocabulary={activeList}
        onExit={handleExitMode}
        onLeitnerUpdate={handleLeitnerUpdate}
      />
    );
  }
  if (currentMode === "review" && activeList.length > 0) {
    return (
      <ReviewMode
        vocabulary={activeList}
        onExit={handleExitMode}
        onLeitnerUpdate={handleLeitnerUpdate}
      />
    );
  }
  if (currentMode === "kanjiQuiz" && activeList.length > 0) {
    return (
      <KanjiQuizMode
        vocabulary={activeList}
        onExit={handleExitMode}
        onLeitnerUpdate={handleLeitnerUpdate}
      />
    );
  }
  if (currentMode === "cloze" && activeList.length > 0) {
    return <ClozeQuizMode vocabulary={activeList} onExit={handleExitMode} />;
  }

  // ---- Trang HOME / STARRED
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Header */}
      <header className="py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="rounded-full gradient-primary p-3" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              T-Sensei App học tiếng Nhật
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Học từ vựng tiếng Nhật hiệu quả với flashcard thông minh. Import từ
            vựng từ file CSV và bắt đầu hành trình học tập!
          </p>
        </div>
      </header>

      {/* Main */}
      <main className="px-4 pb-12 space-y-8">
        {vocabulary.length === 0 ? (
          // Lần đầu: uploader toàn trang
          <div className="space-y-8">
            <CSVUploader onVocabularyImported={handleVocabularyImported} />
            {/* Feature cards (giữ nguyên)... */}
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-center mb-8">
                Tính năng nổi bật
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="gradient-card border-0 shadow-card hover:shadow-card-hover transition-smooth">
                  <CardHeader>
                    <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                      <Upload className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle>Import CSV dễ dàng</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Kéo thả file CSV với 3 cột: Kanji, Hiragana, Nghĩa (có thể
                      thêm Âm Hán-Việt, Câu mẫu).
                    </p>
                  </CardContent>
                </Card>
                <Card className="gradient-card border-0 shadow-card hover:shadow-card-hover transition-smooth">
                  <CardHeader>
                    <div className="rounded-full bg-japanese-hiragana/10 w-12 h-12 flex items-center justify-center mb-4">
                      <BookOpen className="w-6 h-6 text-japanese-hiragana" />
                    </div>
                    <CardTitle>Flashcard tương tác</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Lật thẻ để xem nghĩa, điều khiển bằng chuột hoặc phím tắt.
                    </p>
                  </CardContent>
                </Card>
                <Card className="gradient-card border-0 shadow-card hover:shadow-card-hover transition-smooth">
                  <CardHeader>
                    <div className="rounded-full bg-accent/10 w-12 h-12 flex items-center justify-center mb-4">
                      <Brain className="w-6 h-6 text-accent" />
                    </div>
                    <CardTitle>Học tập hiệu quả</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Theo dõi tiến độ, ôn tập theo Leitner (Spaced Repetition).
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Thanh thao tác nhanh */}
            <Card className="shadow-card">
              <CardContent className="p-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => setCurrentMode("home")}
                >
                  <List className="w-4 h-4" />
                  Tất cả ({vocabulary.length})
                </Button>
                <Button
                  variant={currentMode === "starred" ? "default" : "outline"}
                  onClick={() => setCurrentMode("starred")}
                  className="flex items-center gap-2"
                  disabled={vocabulary.filter((i) => i.starred).length === 0}
                >
                  <Star className="w-4 h-4" />
                  Đã đánh dấu ({vocabulary.filter((i) => i.starred).length})
                </Button>

                {/* NEW: Nhập CSV + tuỳ chọn gộp thông minh */}
                <div className="ml-auto flex items-center gap-3">
                  <label className="text-sm flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={preserveProgress}
                      onChange={(e) => setPreserveProgress(e.target.checked)}
                    />
                    Giữ tiến trình học & ⭐ khi thay thế
                  </label>
                  <Button
                    variant="outline"
                    onClick={() => setShowImportCSV(true)}
                    className="flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Nhập CSV
                  </Button>
                  <Button variant="outline" onClick={() => setShowAdd(true)}>
                    Thêm từ thủ công
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Panel nhập CSV khi cần */}
            {showImportCSV && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Nhập CSV (gộp thông minh)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CSVUploader
                    onVocabularyImported={handleVocabularyImported}
                  />
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowImportCSV(false)}
                    >
                      Đóng
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ======== Thanh Leitner & nút Ôn tập ======== */}
            <LeitnerPanel
              vocabulary={vocabulary}
              onStartReview={startReviewDue}
            />
            {/* ============================================ */}

            {/* Danh sách từ + search + thêm từ */}
            <VocabularyList
              vocabulary={filteredList}
              onStartStudy={startStudyAll}
              onStartQuiz={() => setShowQuizPicker(true)}
              onToggleStar={handleToggleStar}
              onAddWordClick={() => setShowAdd(true)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onEditWordClick={(item) => setEditing(item)} // <-- NEW
            />

            {/* Hộp chọn loại quiz */}
            <QuizPicker
              open={showQuizPicker}
              onClose={() => setShowQuizPicker(false)}
              onPick={(type) => {
                setShowQuizPicker(false);
                if (type === "meaning") startQuizAll();
                else if (type === "kanji") startKanjiQuiz();
                else startClozeQuiz();
              }}
            />
          </div>
        )}
      </main>

      {/* Dialog thêm từ */}
      <AddWordDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={handleAddWord}
      />

      {/* Dialog sửa từ — chỉ mount khi có item */}
      {editing && (
        <EditWordDialog
          open={!!editing}
          value={editing}
          onClose={() => setEditing(null)}
          onSave={handleUpdateWord}
        />
      )}
    </div>
  );
};

export default Index;
