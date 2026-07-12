import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center min-h-[55vh] px-4 py-16 text-center",
        className,
      )}
    >
      <div className="max-w-md flex flex-col items-center gap-6">
        {Icon && (
          <div className="min-h-[40px] flex items-center">
            <Icon className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
        <div className="min-h-[32px]">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        </div>
        {description && (
          <div className="min-h-[40px]">
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          </div>
        )}
        {action && <div className="min-h-[44px]">{action}</div>}
      </div>
    </div>
  );
}
