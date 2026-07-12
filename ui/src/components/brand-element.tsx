import { cn } from "@/lib/utils";

export function BrandElement({
  appName,
  showText = true,
  size = "md",
  className,
}: {
  appName: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const boxSize = size === "sm" ? "w-8 h-8" : size === "lg" ? "w-14 h-14" : "w-10 h-10";
  const iconSize = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-7 h-7" : "w-5 h-5";
  const titleClass = size === "sm" ? "text-xs" : size === "lg" ? "text-xl" : "text-sm";

  return (
    <div className={cn("flex items-center gap-2 min-w-0", className)}>
      <div
        className={cn(
          "flex items-center justify-center border-2 border-outset border-border-strong bg-card shadow-sm rounded-[12px]",
          boxSize,
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={cn(iconSize, "text-foreground shrink-0")}
          aria-label={`${appName} logo`}
        >
          <title>{appName}</title>
          <circle cx="12" cy="12" r="10" />
        </svg>
      </div>
      {showText && (
        <span className={cn("font-bold text-foreground truncate", titleClass)}>{appName}</span>
      )}
    </div>
  );
}
