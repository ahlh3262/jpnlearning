import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Brain, Kanban } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (type: "meaning" | "kanji" | "cloze") => void;
};

export const QuizPicker: React.FC<Props> = ({ open, onClose, onPick }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-4">
        <div className="text-xl font-semibold text-center">
          Chọn kiểu kiểm tra
        </div>
        <div className="grid grid-cols-1 gap-3">
          <Button
            onClick={() => onPick("meaning")}
            className="h-auto py-3 justify-start"
          >
            <Brain className="w-5 h-5 mr-2" />
            Kiểm tra ngữ nghĩa (ABCD)
          </Button>
          <Button
            variant="outline"
            onClick={() => onPick("kanji")}
            className="h-auto py-3 justify-start"
          >
            <Kanban className="w-5 h-5 mr-2" />
            Kiểm tra Kanji (Đọc ↔ Kanji)
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => onPick?.("cloze")}
          >
            ✍️ Điền từ vào chỗ trống
          </Button>
        </div>
        <div className="text-center">
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
        </div>
      </Card>
    </div>
  );
};
