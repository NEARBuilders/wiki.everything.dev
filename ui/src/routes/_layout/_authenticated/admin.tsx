import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowUpRight, Compass, Edit, FileText, History, Plus, Shield, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { getAccount, useApiClient } from "@/app";
import { EmptyState } from "@/components/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { UnderConstruction } from "@/components/under-construction";

export const Route = createFileRoute("/_layout/_authenticated/admin")({
  head: () => ({
    meta: [{ title: "Admin | Wiki" }],
  }),
  beforeLoad: async ({ context }) => {
    const { apiClient, runtimeConfig } = context;
    const accountId = getAccount(runtimeConfig);
    let wiki: Awaited<ReturnType<typeof apiClient.resolveWiki>> | null = null;
    try {
      wiki = await apiClient.resolveWiki({ accountId });
    } catch {
      wiki = null;
    }
    if (!wiki) {
      throw redirect({ to: "/" });
    }
    return { wiki };
  },
  component: AdminPage,
});

function AdminPage() {
  const { wiki, session, runtimeConfig } = Route.useRouteContext();
  const apiClient = useApiClient();
  const wikiId = wiki?.id ?? "";
  const [filter, setFilter] = useState("");

  const activeOrgId = session?.session?.activeOrganizationId ?? null;
  const isMember = !!wiki && !!activeOrgId && activeOrgId === wiki.orgId;
  const isAdmin = session?.user?.role === "admin";
  const authorized = isMember || isAdmin;

  const q = useInfiniteQuery({
    queryKey: ["articles", "admin", wikiId],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => apiClient.listArticles({ wikiId, cursor: pageParam, limit: 100 }),
    getNextPageParam: (last) =>
      last.meta.hasMore ? (last.meta.nextCursor ?? undefined) : undefined,
    enabled: !!wikiId && authorized,
    staleTime: 30_000,
  });

  const all = useMemo(() => q.data?.pages.flatMap((p) => p.data) ?? [], [q.data]);
  const filtered = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return all;
    return all.filter(
      (a) => a.title.toLowerCase().includes(term) || a.slug.toLowerCase().includes(term),
    );
  }, [all, filter]);

  if (!wiki) return null;

  if (!authorized) {
    return (
      <EmptyState
        icon={Shield}
        title="Not authorized"
        description={
          <>
            You need to be a member of <span className="font-mono">{wiki.subdomain}</span>'s
            organization to access wiki admin.
          </>
        }
        action={
          <div className="flex justify-center gap-2">
            <Link
              to="/"
              className="h-10 px-4 inline-flex items-center gap-1.5 text-sm font-medium border-2 border-outset border-border-strong bg-card text-foreground shadow-sm hover:shadow-md active:border-inset active:shadow-none transition-all duration-200 ease-out rounded-[12px]"
            >
              main page
            </Link>
            <Link
              to="/organizations"
              className="h-10 px-4 inline-flex items-center gap-1.5 text-sm font-medium border-2 border-outset border-border-strong bg-card text-foreground shadow-sm hover:shadow-md active:border-inset active:shadow-none transition-all duration-200 ease-out rounded-[12px]"
            >
              organizations
            </Link>
          </div>
        }
      />
    );
  }

  return (
    <PageContainer variant="wide">
      <div className="space-y-8">
        <header className="space-y-3">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <Shield className="h-3 w-3" />
            Admin
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {wiki.name}
              </h1>
              <p className="text-[11px] font-mono text-muted-foreground">
                {wiki.subdomain} · {wiki.accountId}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                to="/w/$slug/edit"
                params={{ slug: "new" }}
                preload="intent"
                className="h-10 px-4 inline-flex items-center gap-1.5 text-sm font-semibold border-2 border-outset border-border-strong bg-foreground text-background shadow-sm hover:shadow-md active:border-inset active:shadow-none transition-all duration-200 ease-out rounded-[12px]"
              >
                <Plus className="h-4 w-4" />
                new article
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total articles" value={all.length + (q.hasNextPage ? "+" : "")} />
          <StatCard label="Wiki subdomain" value={wiki.subdomain} mono />
          <StatCard label="NEAR account" value={wiki.accountId} mono />
          <StatCard
            label="Created"
            value={wiki.createdAt ? new Date(wiki.createdAt).toLocaleDateString() : "—"}
          />
        </section>

        <section className="space-y-3">
          <SectionHeader
            title="Manage articles"
            action={
              <Link
                to="/explore"
                preload="intent"
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Compass className="h-3 w-3" />
                public explorer
              </Link>
            }
          />
          <Input
            placeholder="Filter articles..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-md"
          />

          {q.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-[10px]" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-[12px] p-12 text-center space-y-2">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {filter ? "No matches for that filter." : "No articles yet."}
              </p>
            </div>
          ) : (
            <div className="border-2 border-outset border-border-strong bg-card rounded-[12px] overflow-hidden shadow-sm">
              <div className="hidden md:grid grid-cols-[minmax(0,1fr)_140px_120px_180px] px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border bg-muted">
                <div>Title</div>
                <div>Updated</div>
                <div>Revision</div>
                <div className="text-right">Actions</div>
              </div>
              <ul className="divide-y divide-border">
                {filtered.map((a) => (
                  <li
                    key={a.id}
                    className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_140px_120px_180px] items-center gap-2 px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <Link
                        to="/w/$slug"
                        params={{ slug: a.slug }}
                        preload="intent"
                        className="text-sm font-medium text-foreground truncate block hover:underline"
                      >
                        {a.title}
                      </Link>
                      <div className="text-[11px] font-mono text-muted-foreground truncate">
                        /w/{a.slug}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(a.updatedAt).toLocaleDateString()}
                    </div>
                    <div className="text-[11px] font-mono text-muted-foreground">
                      {a.currentRevisionId ? a.currentRevisionId.slice(0, 8) : "—"}
                    </div>
                    <div className="flex items-center justify-start md:justify-end gap-1">
                      <Link
                        to="/w/$slug"
                        params={{ slug: a.slug }}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-[6px] transition-colors"
                      >
                        <ArrowUpRight className="h-3 w-3" />
                        view
                      </Link>
                      <Link
                        to="/w/$slug/history"
                        params={{ slug: a.slug }}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-[6px] transition-colors"
                      >
                        <History className="h-3 w-3" />
                        history
                      </Link>
                      <Link
                        to="/w/$slug/edit"
                        params={{ slug: a.slug }}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-foreground bg-foreground/10 hover:bg-foreground hover:text-background rounded-[6px] transition-colors"
                      >
                        <Edit className="h-3 w-3" />
                        edit
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
              {q.hasNextPage && (
                <div className="border-t border-border p-3 flex justify-center">
                  <button
                    type="button"
                    onClick={() => q.fetchNextPage()}
                    disabled={q.isFetchingNextPage}
                    className="h-9 px-3 text-xs font-medium border-2 border-outset border-border-strong bg-card text-foreground shadow-sm hover:shadow-md active:border-inset active:shadow-none transition-all duration-200 ease-out rounded-[10px] disabled:opacity-50"
                  >
                    {q.isFetchingNextPage ? "loading..." : "load more"}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <SectionHeader title="Members & permissions" />
          <div className="border-2 border-outset border-border-strong bg-card rounded-[12px] shadow-sm p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              This wiki is backed by an organization. Manage members, roles, and invitations there.
            </p>
            <Link
              to="/organizations/$slug"
              params={{ slug: wiki.subdomain }}
              className="h-9 px-3 inline-flex items-center gap-1.5 text-xs font-medium border-2 border-outset border-border-strong bg-card text-foreground shadow-sm hover:shadow-md active:border-inset active:shadow-none transition-all duration-200 ease-out rounded-[10px]"
            >
              <Users className="h-3.5 w-3.5" />
              open organization
            </Link>
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader title="Danger zone" />
          <UnderConstruction
            sourceFile="ui/src/routes/_layout/_authenticated/admin.tsx"
            runtimeConfig={runtimeConfig}
          />
        </section>
      </div>
    </PageContainer>
  );
}

function StatCard({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="border-2 border-outset border-border-strong bg-card p-4 rounded-[12px] shadow-sm space-y-1">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={`text-sm text-foreground break-all ${mono ? "font-mono text-xs" : "font-semibold"}`}
      >
        {value}
      </div>
    </div>
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
