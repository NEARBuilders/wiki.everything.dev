import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Compass, FileText, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useApiClient } from "@/app";
import { EmptyState } from "@/components/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_layout/explore")({
  head: () => ({
    meta: [
      { title: "Explore | Wiki" },
      { name: "description", content: "Browse every article in the wiki, A to Z." },
    ],
  }),
  component: ExplorePage,
});

function ExplorePage() {
  const { wiki } = Route.useRouteContext();
  const apiClient = useApiClient();
  const wikiId = wiki?.id ?? "";
  const [query, setQuery] = useState("");

  const q = useInfiniteQuery({
    queryKey: ["articles", "all", wikiId],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => apiClient.listArticles({ wikiId, cursor: pageParam, limit: 100 }),
    getNextPageParam: (last) =>
      last.meta.hasMore ? (last.meta.nextCursor ?? undefined) : undefined,
    enabled: !!wikiId,
    staleTime: 60_000,
  });

  const all = useMemo(() => q.data?.pages.flatMap((p) => p.data) ?? [], [q.data]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return all;
    return all.filter(
      (a) => a.title.toLowerCase().includes(term) || a.slug.toLowerCase().includes(term),
    );
  }, [all, query]);

  const byLetter = useMemo(() => {
    const buckets = new Map<string, typeof filtered>();
    for (const a of filtered) {
      const first = (a.title[0] ?? a.slug[0] ?? "#").toUpperCase();
      const key = /[A-Z]/.test(first) ? first : "#";
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)?.push(a);
    }
    for (const list of buckets.values()) {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }
    return buckets;
  }, [filtered]);

  const letters = Array.from(byLetter.keys()).sort((a, b) => a.localeCompare(b));

  if (!wiki) {
    return (
      <EmptyState
        icon={Compass}
        title="No wiki here yet"
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
    <PageContainer variant="wide">
      <div className="space-y-6">
        <header className="space-y-3">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <Compass className="h-3 w-3" />
            Explore
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            All pages
          </h1>
        </header>

        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by title or slug"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {q.isLoading ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-[10px]" />
            ))}
          </div>
        ) : letters.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-[12px] p-12 text-center">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              {query ? `No matches for "${query}"` : "No pages yet."}
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5 sticky top-0 py-2 bg-background/95 backdrop-blur z-10 border-b border-border">
              {letters.map((letter) => (
                <a
                  key={letter}
                  href={`#letter-${letter}`}
                  className="inline-flex items-center justify-center w-8 h-8 text-xs font-bold border-2 border-outset border-border-strong bg-card text-foreground shadow-sm hover:shadow-md hover:bg-muted active:border-inset active:shadow-none transition-all duration-200 ease-out rounded-[8px]"
                >
                  {letter}
                </a>
              ))}
            </div>

            <div className="space-y-8">
              {letters.map((letter) => (
                <section key={letter} id={`letter-${letter}`} className="space-y-3 scroll-mt-24">
                  <div className="flex items-baseline justify-between border-b-2 border-border pb-1">
                    <h2 className="text-2xl font-bold text-foreground">{letter}</h2>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      {byLetter.get(letter)?.length ?? 0} pages
                    </span>
                  </div>
                  <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                    {byLetter.get(letter)?.map((a) => (
                      <li key={a.id}>
                        <Link
                          to="/w/$slug"
                          params={{ slug: a.slug }}
                          preload="intent"
                          className="flex items-center gap-2 px-2 py-1.5 text-sm text-foreground hover:bg-muted transition-colors rounded-[8px]"
                        >
                          <span className="truncate">{a.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            {q.hasNextPage && (
              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  onClick={() => q.fetchNextPage()}
                  disabled={q.isFetchingNextPage}
                  className="h-10 px-4 inline-flex items-center gap-1.5 text-sm font-medium border-2 border-outset border-border-strong bg-card text-foreground shadow-sm hover:shadow-md active:border-inset active:shadow-none transition-all duration-200 ease-out rounded-[12px] disabled:opacity-50"
                >
                  {q.isFetchingNextPage ? "loading..." : "load more pages"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
}
