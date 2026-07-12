import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Clock, Compass, Fingerprint, Plus, User } from "lucide-react";
import { useMemo } from "react";
import { sessionQueryOptions, useApiClient, useAuthClient } from "@/app";
import { Badge } from "@/components";
import { ArticleActionsBar } from "@/components/article-actions-bar";
import { ArticleRenderer } from "@/components/article-renderer";
import { ArticleToc } from "@/components/article-toc";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_layout/w/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} | Wiki` },
      { name: "description", content: `View article: ${params.slug}` },
    ],
  }),
  component: ArticleReaderPage,
});

function ArticleReaderPage() {
  const { slug } = Route.useParams();
  const { wiki } = Route.useRouteContext();
  const apiClient = useApiClient();
  const auth = useAuthClient();
  const router = useRouter();
  const canGoBack = router.history.canGoBack?.() ?? false;

  const wikiId = wiki?.id ?? "";

  const { data: session } = useQuery(sessionQueryOptions(auth, undefined));
  const activeOrgId = session?.session?.activeOrganizationId ?? null;
  const isMember = !!wiki && !!activeOrgId && activeOrgId === wiki.orgId;
  const isAdmin = session?.user?.role === "admin";
  const canEdit = isMember || isAdmin;

  const articleQuery = useQuery({
    queryKey: ["article", wikiId, slug],
    queryFn: () => apiClient.getArticle({ wikiId, slug }),
    enabled: !!wikiId,
    retry: (failureCount, err: unknown) => {
      const status = (err as { status?: number })?.status;
      if (status === 404) return false;
      return failureCount < 2;
    },
  });

  const article = articleQuery.data?.article;
  const isLoading = articleQuery.isLoading;
  const notFound = !isLoading && !article;

  const contentString = useMemo(() => {
    if (!article?.content) return "";
    if (typeof article.content === "string") return article.content;
    try {
      return JSON.stringify(article.content, null, 2);
    } catch {
      return "";
    }
  }, [article?.content]);

  const historyQuery = useQuery({
    queryKey: ["article-history", article?.id],
    queryFn: () => apiClient.getHistory({ articleId: article!.id, cursor: undefined }),
    enabled: !!article?.id,
  });

  const firstAuthor = useMemo(() => {
    const revs = historyQuery.data?.revisions ?? [];
    if (revs.length === 0) return null;
    const oldest = revs[revs.length - 1];
    const authors = historyQuery.data?.authors ?? {};
    const name = authors[oldest.authorId]?.name ?? oldest.authorId.slice(0, 8);
    return { authorId: oldest.authorId, name, signed: !!oldest.signature };
  }, [historyQuery.data]);

  return (
    <div className="w-full">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex items-center justify-between gap-3">
          <BackButton canGoBack={canGoBack} onBack={() => router.history.back()} />
          {article && <ArticleActionsBar slug={slug} title={article.title} canEdit={canEdit} />}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 pb-16 grid gap-8 xl:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
              <div className="space-y-3 pt-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </div>
          ) : notFound ? (
            <NotFoundState slug={slug} canEdit={canEdit} />
          ) : (
            article && (
              <article className="space-y-6">
                <header className="space-y-3 pb-6 border-b border-border">
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                    {article.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {firstAuthor && (
                      <span className="flex items-center gap-1.5">
                        <User className="h-3 w-3" />
                        <span className="font-mono">{firstAuthor.name}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      Updated {new Date(article.updatedAt).toLocaleDateString()}
                    </span>
                    {article.currentRevisionId && (
                      <Badge variant="secondary" className="text-[10px]">
                        rev {article.currentRevisionId.slice(0, 6)}
                      </Badge>
                    )}
                    {firstAuthor?.signed && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono">
                        <Fingerprint className="h-3 w-3" />
                        signed origin
                      </span>
                    )}
                  </div>
                </header>

                <div className="prose-custom">
                  <ArticleRenderer content={article.content} />
                </div>

                <MobileToc content={contentString} />

                <footer className="pt-6 border-t border-border">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to="/w/$slug/history"
                      params={{ slug }}
                      preload="intent"
                      className="h-9 px-3 inline-flex items-center gap-1.5 text-xs font-medium border-2 border-outset border-border-strong bg-card text-foreground shadow-sm hover:shadow-md active:border-inset active:shadow-none transition-all duration-200 ease-out rounded-[10px]"
                    >
                      view revision history
                    </Link>
                    {canEdit && (
                      <Link
                        to="/w/$slug/edit"
                        params={{ slug }}
                        preload="intent"
                        className="h-9 px-3 inline-flex items-center gap-1.5 text-xs font-semibold border-2 border-outset border-border-strong bg-foreground text-background shadow-sm hover:shadow-md active:border-inset active:shadow-none transition-all duration-200 ease-out rounded-[10px]"
                      >
                        improve this article
                      </Link>
                    )}
                  </div>
                </footer>
              </article>
            )
          )}
        </div>

        {article && contentString && (
          <div className="hidden xl:block">
            <div className="sticky top-6">
              <ArticleToc content={contentString} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BackButton({ canGoBack, onBack }: { canGoBack: boolean; onBack: () => void }) {
  const shared =
    "flex items-center gap-1.5 h-9 px-2.5 border-2 border-outset border-border-strong bg-card text-foreground shadow-sm hover:shadow-md active:border-inset active:shadow-none transition-all duration-200 ease-out rounded-[10px]";
  if (canGoBack) {
    return (
      <button type="button" onClick={onBack} className={shared}>
        <ArrowLeft className="h-4 w-4" />
        <span className="text-xs font-medium">back</span>
      </button>
    );
  }
  return (
    <Link to="/" className={shared}>
      <ArrowLeft className="h-4 w-4" />
      <span className="text-xs font-medium">main page</span>
    </Link>
  );
}

function MobileToc({ content }: { content: string }) {
  return (
    <div className="xl:hidden">
      <details className="border-2 border-inset border-border-strong bg-card rounded-[12px] p-4">
        <summary className="text-xs font-bold uppercase tracking-wider text-muted-foreground cursor-pointer">
          On this page
        </summary>
        <div className="mt-3">
          <ArticleToc content={content} />
        </div>
      </details>
    </div>
  );
}

function NotFoundState({ slug, canEdit }: { slug: string; canEdit: boolean }) {
  return (
    <EmptyState
      icon={Compass}
      title="Page not found"
      description={
        <>
          No article exists at <span className="font-mono text-foreground">/w/{slug}</span> yet.
        </>
      }
      action={
        canEdit ? (
          <div className="space-y-2">
            <Link
              to="/w/$slug/edit"
              params={{ slug }}
              className="h-10 px-4 inline-flex items-center gap-1.5 text-sm font-semibold border-2 border-outset border-border-strong bg-foreground text-background shadow-sm hover:shadow-md active:border-inset active:shadow-none transition-all duration-200 ease-out rounded-[12px]"
            >
              <Plus className="h-4 w-4" />
              create this page
            </Link>
            <p className="text-xs text-muted-foreground">
              You'll be able to write content and publish immediately.
            </p>
          </div>
        ) : (
          <Link
            to="/explore"
            className="h-10 px-4 inline-flex items-center gap-1.5 text-sm font-medium border-2 border-outset border-border-strong bg-card text-foreground shadow-sm hover:shadow-md active:border-inset active:shadow-none transition-all duration-200 ease-out rounded-[12px]"
          >
            browse existing pages
          </Link>
        )
      }
    />
  );
}
