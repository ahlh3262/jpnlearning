import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VocabularyItem } from "@/types/vocabulary";
import { getLeitnerStats } from "@/hooks/use-leitner";

export const LeitnerStats: React.FC<{ vocabulary: VocabularyItem[] }> = ({
  vocabulary,
}) => {
  const { counts, due, total, mastered, learning, newWords } =
    getLeitnerStats(vocabulary);
  const percent = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  const rows = [
    { label: "Hộp 1", sub: "Hàng ngày", value: counts[1] },
    { label: "Hộp 2", sub: "Mỗi 2 ngày", value: counts[2] },
    { label: "Hộp 3", sub: "Hàng tuần", value: counts[3] },
    { label: "Hộp 4", sub: "Mỗi 2 tuần", value: counts[4] },
    { label: "Hộp 5", sub: "Hàng tháng", value: counts[5] },
  ];

  return (
    <Card className="w-full max-w-5xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <span>📈 Thống kê học tập</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-2xl p-6 bg-indigo-50">
            <div className="text-4xl font-bold text-indigo-600">{due}</div>
            <div className="text-indigo-700/70 mt-2">Cần ôn hôm nay</div>
          </div>
          <div className="rounded-2xl p-6 bg-emerald-50">
            <div className="text-4xl font-bold text-emerald-600">
              {mastered}
            </div>
            <div className="text-emerald-700/70 mt-2">Đã thành thạo</div>
          </div>
          <div className="rounded-2xl p-6 bg-amber-50">
            <div className="text-4xl font-bold text-amber-600">{learning}</div>
            <div className="text-amber-700/70 mt-2">Đang học</div>
          </div>
          <div className="rounded-2xl p-6 bg-fuchsia-50">
            <div className="text-4xl font-bold text-fuchsia-600">
              {newWords}
            </div>
            <div className="text-fuchsia-700/70 mt-2">Từ mới</div>
          </div>
        </div>

        <div>
          <div className="font-semibold mb-3">Phân bố theo hộp học tập</div>
          <div className="space-y-3">
            {rows.map((r, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 rounded-xl bg-gray-50 px-4 py-3"
              >
                <div className="shrink-0">
                  <div className="text-xs px-2 py-1 rounded-full bg-white border">
                    Hộp {idx + 1}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-sm">{r.sub}</div>
                  <div className="h-2 mt-2 bg-gray-200 rounded">
                    <div
                      className="h-2 rounded bg-indigo-400"
                      style={{ width: `${percent(r.value)}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm w-16 text-right">
                  {percent(r.value)}%{" "}
                  <span className="text-gray-500">{r.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="font-semibold mb-2">Tiến độ tổng thể</div>
          <div className="h-2 bg-gray-200 rounded">
            <div
              className="h-2 rounded bg-indigo-500"
              style={{ width: `${percent(total - newWords)}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {total - newWords} / {total} từ đang trong quá trình học
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
