import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, Clock, Compass, FileText, Plus } from "lucide-react";
import { useMemo } from "react";
import { useApiClient } from "@/app";
import { EmptyState } from "@/components/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_layout/recent")({
  head: () => ({
    meta: [
      { title: "Recent changes | Wiki" },
      { name: "description", content: "See the latest article activity across the wiki." },
    ],
  }),
  component: RecentChangesPage,
});

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
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

function dayKey(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toDateString();
}

function RecentChangesPage() {
  const { wiki } = Route.useRouteContext();
  const apiClient = useApiClient();
  const wikiId = wiki?.id ?? "";

  const q = useInfiniteQuery({
    queryKey: ["articles", "recent-page", wikiId],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => apiClient.listArticles({ wikiId, cursor: pageParam, limit: 30 }),
    getNextPageParam: (last) =>
      last.meta.hasMore ? (last.meta.nextCursor ?? undefined) : undefined,
    enabled: !!wikiId,
    staleTime: 30_000,
  });

  const all = useMemo(() => q.data?.pages.flatMap((p) => p.data) ?? [], [q.data]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof all>();
    for (const a of all) {
      const key = dayKey(a.updatedAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(a);
    }
    return Array.from(map.entries());
  }, [all]);

  if (!wiki) {
    return (
      <EmptyState
        icon={Compass}
        title="No wiki resolved"
        action={
          <Link
            to="/wiki/new"
            className="h-10 px-4 inline-flex items-center gap-1.5 text-sm font-semibold border-2 border-outset border-border-strong bg-foreground text-background shadow-sm hover:shadow-md active:border-inset active:shadow-none transition-all duration-200 ease-out rounded-[12px]"
          >
            <Plus className="h-4 w-4" />
            start a wiki
          </Link>
        }
      />
    );
  }

  return (
    <PageContainer variant="default">
      <div className="space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <ClipboardList className="h-3 w-3" />
            Activity
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Recent changes
          </h1>
          <p className="text-sm text-muted-foreground">
            The latest article edits in {wiki.name}, newest first.
          </p>
        </header>

        {q.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-[12px]" />
            ))}
          </div>
        ) : all.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-[12px] p-12 text-center space-y-2">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nothing has changed yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(([day, articles]) => (
              <section key={day} className="space-y-2">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground sticky top-0 py-2 bg-background/95 backdrop-blur">
                  {day}
                </h2>
                <ul className="border-2 border-outset border-border-strong bg-card rounded-[12px] overflow-hidden divide-y divide-border shadow-sm">
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
                          <div className="text-sm font-medium text-foreground truncate">
                            {a.title}
                          </div>
                          <div className="text-[11px] font-mono text-muted-foreground truncate">
                            /w/{a.slug}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground whitespace-nowrap">
                          <Clock className="h-3 w-3" />
                          {timeAgo(a.updatedAt)}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {q.hasNextPage && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => q.fetchNextPage()}
                  disabled={q.isFetchingNextPage}
                  className="h-10 px-4 inline-flex items-center gap-1.5 text-sm font-medium border-2 border-outset border-border-strong bg-card text-foreground shadow-sm hover:shadow-md active:border-inset active:shadow-none transition-all duration-200 ease-out rounded-[12px] disabled:opacity-50"
                >
                  {q.isFetchingNextPage ? "loading..." : "load more"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
