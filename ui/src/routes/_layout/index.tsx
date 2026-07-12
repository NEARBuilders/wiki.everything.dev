import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Compass, FileText, Plus } from "lucide-react";
import { useMemo } from "react";
import { sessionQueryOptions, useApiClient, useAuthClient } from "@/app";
import { ArticleSearch } from "@/components/article-search";
import { EmptyState } from "@/components/empty-state";
import { RecentChangesList } from "@/components/recent-changes-list";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_layout/")({
  head: () => ({
    meta: [
      { title: "Main page | Wiki" },
      { name: "description", content: "Browse, contribute, and explore the wiki." },
    ],
  }),
  component: WikiHome,
});

function WikiHome() {
  const { wiki } = Route.useRouteContext();
  const apiClient = useApiClient();
  const auth = useAuthClient();
  const { data: session } = useQuery(sessionQueryOptions(auth, undefined));

  const wikiId = wiki?.id ?? "";
  const activeOrgId = session?.session?.activeOrganizationId ?? null;
  const isMember = !!wiki && !!activeOrgId && activeOrgId === wiki.orgId;
  const isAdmin = session?.user?.role === "admin";
  const canEdit = isMember || isAdmin;

  const allArticles = useInfiniteQuery({
    queryKey: ["articles", "index", wikiId],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => apiClient.listArticles({ wikiId, cursor: pageParam, limit: 100 }),
    getNextPageParam: (last) =>
      last.meta.hasMore ? (last.meta.nextCursor ?? undefined) : undefined,
    enabled: !!wikiId,
    staleTime: 60_000,
  });

  const flat = useMemo(
    () => allArticles.data?.pages.flatMap((p) => p.data) ?? [],
    [allArticles.data],
  );

  const byLetter = useMemo(() => {
    const buckets = new Map<string, { slug: string; title: string; id: string }[]>();
    for (const a of flat) {
      const first = (a.title[0] ?? a.slug[0] ?? "#").toUpperCase();
      const key = /[A-Z]/.test(first) ? first : "#";
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)?.push({ slug: a.slug, title: a.title, id: a.id });
    }
    for (const list of buckets.values()) {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }
    return buckets;
  }, [flat]);

  const totalCount = flat.length + (allArticles.hasNextPage ? "+" : "");

  if (!wiki) {
    return <NoWikiHero />;
  }

  return (
    <div className="w-full">
      <Hero
        title={wiki.name}
        subdomain={wiki.subdomain}
        wikiId={wikiId}
        totalCount={String(totalCount)}
        canEdit={canEdit}
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-12">
        <section className="space-y-4">
          <SectionHeader
            title="Recent changes"
            action={
              <Link
                to="/recent"
                preload="intent"
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                view all →
              </Link>
            }
          />
          <RecentChangesList wikiId={wikiId} limit={6} />
        </section>

        <section className="space-y-4">
          <SectionHeader
            title="Explore"
            action={
              <Link
                to="/explore"
                preload="intent"
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                open explorer →
              </Link>
            }
          />
          {allArticles.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-[12px]" />
              ))}
            </div>
          ) : flat.length === 0 ? (
            <EmptyArticles canEdit={canEdit} />
          ) : (
            <AlphaGrid byLetter={byLetter} />
          )}
        </section>
      </div>
    </div>
  );
}

function Hero({
  title,
  subdomain,
  wikiId,
  totalCount,
  canEdit,
}: {
  title: string;
  subdomain: string;
  wikiId: string;
  totalCount: string;
  canEdit: boolean;
}) {
  return (
    <section className="border-b border-border bg-gradient-to-b from-muted to-background">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14 space-y-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-[6px] border border-border bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground">
              Wiki
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">{subdomain}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Welcome to {title}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
            {totalCount} pages and growing. Search, browse, and contribute below.
          </p>
        </div>

        <div className="max-w-2xl">
          <ArticleSearch wikiId={wikiId} placeholder={`Search ${title}...`} />
        </div>

        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Link
              to="/w/$slug/edit"
              params={{ slug: "new" }}
              preload="intent"
              className="h-10 px-4 inline-flex items-center gap-1.5 text-sm font-semibold border-2 border-outset border-border-strong bg-foreground text-background shadow-sm hover:shadow-md active:border-inset active:shadow-none transition-all duration-200 ease-out rounded-[12px]"
            >
              <Plus className="h-4 w-4" />
              new article
            </Link>
            <Link
              to="/admin"
              preload="intent"
              className="h-10 px-4 inline-flex items-center gap-1.5 text-sm font-medium border-2 border-outset border-border-strong bg-card text-foreground shadow-sm hover:shadow-md active:border-inset active:shadow-none transition-all duration-200 ease-out rounded-[12px]"
            >
              wiki admin
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {action}
    </div>
  );
}

function AlphaGrid({
  byLetter,
}: {
  byLetter: Map<string, { slug: string; title: string; id: string }[]>;
}) {
  const letters = Array.from(byLetter.keys()).sort((a, b) => a.localeCompare(b));

  if (letters.length === 0) {
    return <p className="text-sm text-muted-foreground">No pages to explore yet.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1.5">
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

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {letters.slice(0, 12).map((letter) => (
          <div
            key={letter}
            id={`letter-${letter}`}
            className="border-2 border-outset border-border-strong bg-card rounded-[12px] p-4 space-y-2 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-foreground">{letter}</span>
              <span className="text-[10px] font-mono text-muted-foreground">
                {byLetter.get(letter)?.length ?? 0} pages
              </span>
            </div>
            <ul className="space-y-1">
              {byLetter
                .get(letter)
                ?.slice(0, 8)
                .map((a) => (
                  <li key={a.id}>
                    <Link
                      to="/w/$slug"
                      params={{ slug: a.slug }}
                      preload="intent"
                      className="text-sm text-foreground hover:underline underline-offset-2 truncate block"
                    >
                      {a.title}
                    </Link>
                  </li>
                ))}
            </ul>
            {(byLetter.get(letter)?.length ?? 0) > 8 && (
              <Link
                to="/explore"
                preload="intent"
                className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                + {(byLetter.get(letter)?.length ?? 0) - 8} more →
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyArticles({ canEdit }: { canEdit: boolean }) {
  return (
    <div className="border-2 border-dashed border-border rounded-[12px] p-10 text-center space-y-4">
      <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
      <div className="space-y-1">
        <p className="text-base font-semibold text-foreground">No pages yet</p>
        <p className="text-sm text-muted-foreground">
          {canEdit ? "Kick things off with the first article." : "Check back soon."}
        </p>
      </div>
      {canEdit && (
        <Link
          to="/w/$slug/edit"
          params={{ slug: "new" }}
          preload="intent"
          className="h-10 px-4 inline-flex items-center gap-1.5 text-sm font-semibold border-2 border-outset border-border-strong bg-foreground text-background shadow-sm hover:shadow-md active:border-inset active:shadow-none transition-all duration-200 ease-out rounded-[12px]"
        >
          <Plus className="h-4 w-4" />
          create the first article
        </Link>
      )}
    </div>
  );
}

function NoWikiHero() {
  return (
    <EmptyState
      title="Start a new wiki"
      action={
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/wiki/new"
            preload="intent"
            className="h-11 px-5 inline-flex items-center gap-2 text-sm font-semibold border-2 border-outset border-border-strong bg-foreground text-background shadow-sm hover:shadow-md active:border-inset active:shadow-none transition-all duration-200 ease-out rounded-[12px]"
          >
            <Plus className="h-4 w-4" />
            start a wiki
          </Link>
          <Link
            to="/about"
            preload="intent"
            className="h-11 px-5 inline-flex items-center gap-2 text-sm font-medium border-2 border-outset border-border-strong bg-card text-foreground shadow-sm hover:shadow-md active:border-inset active:shadow-none transition-all duration-200 ease-out rounded-[12px]"
          >
            <Compass className="h-4 w-4" />
            learn more
          </Link>
        </div>
      }
    />
  );
}
