// src/components/ui/progress.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export const Progress: React.FC<{ value: number; className?: string }> = ({
  value,
  className,
}) => {
  return (
    <div
      className={cn(
        "w-full h-3 bg-gray-200 rounded-full overflow-hidden",
        className
      )}
    >
      <div
        className="h-full bg-indigo-600"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
};
