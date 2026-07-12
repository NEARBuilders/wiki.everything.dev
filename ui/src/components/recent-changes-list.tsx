import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Clock, FileText } from "lucide-react";
import { useApiClient } from "@/app";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface RecentChangesListProps {
  wikiId: string | undefined;
  limit?: number;
  variant?: "cards" | "compact";
  className?: string;
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const diffMs = Date.now() - d.getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export function RecentChangesList({
  wikiId,
  limit = 10,
  variant = "cards",
  className,
}: RecentChangesListProps) {
  const apiClient = useApiClient();

  const query = useQuery({
    queryKey: ["articles", "recent", wikiId, limit],
    queryFn: () => apiClient.listArticles({ wikiId: wikiId ?? "", limit }),
    enabled: !!wikiId,
    staleTime: 30_000,
  });

  const articles = query.data?.data ?? [];

  if (query.isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: Math.min(limit, 5) }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-[12px]" />
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div
        className={cn(
          "border-2 border-dashed border-border rounded-[12px] p-8 text-center",
          className,
        )}
      >
        <p className="text-sm text-muted-foreground">No recent activity yet.</p>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <ul
        className={cn(
          "divide-y divide-border border-2 border-outset border-border-strong bg-card rounded-[12px] overflow-hidden",
          className,
        )}
      >
        {articles.map((a) => (
          <li key={a.id}>
            <Link
              to="/w/$slug"
              params={{ slug: a.slug }}
              preload="intent"
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors"
            >
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground truncate">{a.title}</div>
                <div className="text-[11px] font-mono text-muted-foreground truncate">
                  /{a.slug}
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground whitespace-nowrap">
                <Clock className="h-3 w-3" />
                {timeAgo(a.updatedAt)}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {articles.map((a) => (
        <Link
          key={a.id}
          to="/w/$slug"
          params={{ slug: a.slug }}
          preload="intent"
          className="group relative border-2 border-outset border-border-strong bg-card p-4 rounded-[12px] shadow-sm hover:shadow-md transition-all duration-200 ease-out"
        >
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center h-10 w-10 shrink-0 border-2 border-inset border-border-strong bg-muted rounded-[8px]">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <h3 className="text-sm font-semibold text-foreground truncate group-hover:underline underline-offset-2">
                {a.title}
              </h3>
              <div className="text-[11px] font-mono text-muted-foreground truncate">/{a.slug}</div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeAgo(a.updatedAt)}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
