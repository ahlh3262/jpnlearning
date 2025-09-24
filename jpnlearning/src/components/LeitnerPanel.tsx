import * as React from "react";
import type { VocabularyItem } from "@/types/vocabulary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Calendar, Clock, Trophy } from "lucide-react";

type Props = { vocabulary: VocabularyItem[]; onStartReview: () => void };

function pct(n: number) {
  return Math.round(n);
}

export default function LeitnerPanel({ vocabulary, onStartReview }: Props) {
  const total = vocabulary.length;

  // ==== Tính thống kê ====
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let dueToday = 0;
  let mastered = 0; // hộp 5
  let learning = 0; // đã ôn > 0 & < hộp 5
  let newcomers = 0; // totalReviews = 0
  const byBox: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  vocabulary.forEach((v) => {
    const box = v.leitner?.box ?? 1;
    byBox[box] = (byBox[box] ?? 0) + 1;

    const totalReviews = v.leitner?.totalReviews ?? 0;
    if (totalReviews === 0) newcomers += 1;
    if (box === 5) mastered += 1;
    if (totalReviews > 0 && box < 5) learning += 1;

    const next = v.leitner?.nextReview;
    if (!next) dueToday += 1;
    else {
      const d = new Date(next);
      d.setHours(0, 0, 0, 0);
      if (d <= today) dueToday += 1;
    }
  });

  // ==== Palette “soft” giống Lovable ====
  const rows = [
    { box: 1, label: "Hàng ngày", bar: "from-indigo-400 to-indigo-500" },
    { box: 2, label: "Mỗi 2 ngày", bar: "from-blue-400 to-blue-500" },
    { box: 3, label: "Hàng tuần", bar: "from-emerald-400 to-emerald-500" },
    { box: 4, label: "Mỗi 2 tuần", bar: "from-amber-400 to-amber-500" },
    { box: 5, label: "Hàng tháng", bar: "from-violet-400 to-violet-500" },
  ];

  const progressPct = (count: number) => (total ? (count / total) * 100 : 0);
  const overallPct = total ? (mastered / total) * 100 : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Thanh đầu + nút ôn tập */}
      <Card className="border border-gray-200/60 shadow-sm">
        <CardContent className="p-4 md:p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-indigo-500" />
            <div className="text-sm md:text-base">
              <span className="font-medium">Ôn tập hôm nay</span>
              <span className="ml-2 inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-rose-600 text-xs border border-rose-200">
                {dueToday} từ
              </span>
            </div>
          </div>
          <Button
            onClick={onStartReview}
            className="bg-indigo-500 hover:bg-indigo-600 shadow-sm"
          >
            Bắt đầu ôn tập
          </Button>
        </CardContent>
      </Card>

      {/* 4 thẻ thống kê lớn – pastel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SoftStat
          title="Cần ôn hôm nay"
          value={dueToday}
          icon={<Clock className="w-5 h-5" />}
          /* pastel indigo */
          ring="ring-indigo-200"
          grad="from-indigo-100 to-indigo-200"
          text="text-indigo-700"
        />
        <SoftStat
          title="Đã thành thạo"
          value={mastered}
          icon={<Trophy className="w-5 h-5" />}
          /* pastel green */
          ring="ring-emerald-200"
          grad="from-emerald-100 to-emerald-200"
          text="text-emerald-700"
        />
        <SoftStat
          title="Đang học"
          value={learning}
          icon={<BookOpen className="w-5 h-5" />}
          /* pastel amber */
          ring="ring-amber-200"
          grad="from-amber-100 to-amber-200"
          text="text-amber-700"
        />
        <SoftStat
          title="Từ mới"
          value={newcomers}
          icon={<Calendar className="w-5 h-5" />}
          /* pastel violet */
          ring="ring-violet-200"
          grad="from-violet-100 to-violet-200"
          text="text-violet-700"
        />
      </div>

      {/* Bảng phân bố hộp */}
      <Card className="border border-gray-200/60 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">
            Phân bố theo hộp học tập
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map((r) => {
            const count = byBox[r.box] ?? 0;
            const p = progressPct(count);
            return (
              <div
                key={r.box}
                className="rounded-2xl bg-white border border-gray-200/70 flex items-center gap-4 px-4 py-3"
              >
                {/* Badge Hộp */}
                <span className="inline-flex items-center text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-3 py-1">
                  Hộp {r.box}
                </span>

                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium text-gray-800">{r.label}</span>
                    <span className="text-gray-500">
                      {pct(p)}%
                      <span className="ml-2 inline-flex items-center rounded-full bg-gray-50 border border-gray-200 px-2 py-0.5 text-xs text-gray-600">
                        {count}
                      </span>
                    </span>
                  </div>

                  {/* progress pastel */}
                  <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-2 bg-gradient-to-r ${r.bar}`}
                      style={{ width: `${p}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Tổng thể */}
          <div className="pt-2 text-sm text-gray-500">
            Tiến độ tổng thể:{" "}
            <span className="font-medium text-gray-800">
              {pct(overallPct)}% từ đã lên Hộp 5.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---- Thẻ thống kê pastel ---- */
function SoftStat({
  title,
  value,
  icon,
  grad,
  ring,
  text,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  grad: string; // ví dụ 'from-indigo-100 to-indigo-200'
  ring: string; // ví dụ 'ring-indigo-200'
  text: string; // ví dụ 'text-indigo-700'
}) {
  return (
    <div
      className={`rounded-2xl p-4 bg-gradient-to-br ${grad} ring-1 ${ring} shadow-sm`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className={`text-3xl font-bold leading-tight ${text}`}>
            {value}
          </div>
          <div className="mt-1 text-sm text-gray-600">{title}</div>
        </div>
        <div className="bg-white/70 rounded-xl p-2 text-gray-600 border border-white/60 shadow-sm">
          {icon}
        </div>
      </div>
    </div>
  );
}
