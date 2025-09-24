// src/components/ui/button.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "japanese" | "gradient" | "ghost";
type Size = "sm" | "md" | "lg" | "icon";

const variantMap: Record<Variant, string> = {
  default: "bg-indigo-600 text-white hover:bg-indigo-700",
  outline: "border border-gray-300 hover:bg-gray-50",
  japanese: "bg-rose-600 text-white hover:bg-rose-700",
  gradient:
    "bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:opacity-90",
  ghost: "hover:bg-gray-100",
};

const sizeMap: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4",
  lg: "h-11 px-5 text-base",
  icon: "h-10 w-10 p-0",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-medium transition-smooth",
          variantMap[variant],
          sizeMap[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
