import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, ChevronDown, ChevronRight, Clock, Fingerprint, User } from "lucide-react";
import { useState } from "react";
import { useApiClient } from "@/app";
import { ArticleDiff } from "@/components/article-diff";
import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_layout/w/$slug/history")({
  head: ({ params }) => ({
    meta: [
      { title: `History: ${params.slug} | Wiki` },
      { name: "description", content: `Revision history for ${params.slug}` },
    ],
  }),
  component: ArticleHistoryPage,
});

function ArticleHistoryPage() {
  const { slug } = Route.useParams();
  const { wiki } = Route.useRouteContext();
  const apiClient = useApiClient();
  const router = useRouter();
  const canGoBack = router.history.canGoBack?.() ?? false;

  const wikiId = wiki?.id ?? "";

  const articleQuery = useQuery({
    queryKey: ["article", wikiId, slug],
    queryFn: () => apiClient.getArticle({ wikiId, slug }),
    enabled: !!wikiId,
  });

  const articleId = articleQuery.data?.article?.id;

  const historyQuery = useQuery({
    queryKey: ["article-history", articleId],
    queryFn: () => apiClient.getHistory({ articleId: articleId!, cursor: undefined }),
    enabled: !!articleId,
  });

  const [openId, setOpenId] = useState<string | null>(null);

  const isLoading = articleQuery.isLoading || historyQuery.isLoading;
  const revisions = historyQuery.data?.revisions ?? [];
  const authors = historyQuery.data?.authors ?? {};

  return (
    <PageContainer variant="default">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {canGoBack ? (
              <button
                type="button"
                onClick={() => router.history.back()}
                className="flex items-center justify-center w-9 h-9 border-2 border-outset border-border-strong bg-card text-foreground shadow-sm hover:shadow-md active:border-inset active:shadow-none transition-all duration-200 ease-out rounded-[10px]"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <Link
                to="/w/$slug"
                params={{ slug }}
                className="flex items-center justify-center w-9 h-9 border-2 border-outset border-border-strong bg-card text-foreground shadow-sm hover:shadow-md active:border-inset active:shadow-none transition-all duration-200 ease-out rounded-[10px]"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            )}
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate">
                Revision history
              </h1>
              <p className="text-[11px] font-mono text-muted-foreground truncate">/w/{slug}</p>
            </div>
          </div>
          <Link
            to="/w/$slug"
            params={{ slug }}
            preload="intent"
            className="h-9 px-3 inline-flex items-center gap-1.5 text-xs font-medium border-2 border-outset border-border-strong bg-card text-foreground shadow-sm hover:shadow-md active:border-inset active:shadow-none transition-all duration-200 ease-out rounded-[10px]"
          >
            back to article
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-[12px]" />
            ))}
          </div>
        ) : revisions.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-[12px] p-12 text-center">
            <p className="text-muted-foreground">No revisions yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {revisions.map((revision, i) => {
              const parent = revisions[i + 1];
              const isOpen = openId === revision.id;
              const authorName = authors[revision.authorId]?.name ?? revision.authorId.slice(0, 8);
              const isCurrent = i === 0;

              return (
                <div
                  key={revision.id}
                  className={cn(
                    "border-2 border-outset border-border-strong bg-card rounded-[12px] shadow-sm overflow-hidden",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : revision.id)}
                    className="w-full text-left px-4 py-3 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                        )}
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium text-foreground truncate">
                              {authorName}
                            </span>
                            {isCurrent && (
                              <span className="inline-flex items-center rounded-[6px] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-brand-accent-light border border-brand-accent-border text-foreground">
                                current
                              </span>
                            )}
                            {revision.signature && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                                <Fingerprint className="h-3 w-3" />
                                signed
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(revision.createdAt).toLocaleString()}
                            </span>
                            <span>rev {revision.id.slice(0, 8)}</span>
                            {revision.parentId && (
                              <span className="hidden sm:inline">
                                ← {revision.parentId.slice(0, 8)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-border px-4 py-3 space-y-3 bg-muted/30">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        {parent ? "Diff vs previous revision" : "Initial revision"}
                      </div>
                      {parent ? (
                        <ArticleDiff before={parent.content} after={revision.content} />
                      ) : (
                        <div className="border-2 border-inset border-border-strong bg-card rounded-[12px] p-4 max-h-[60vh] overflow-auto">
                          <pre className="text-xs text-foreground whitespace-pre-wrap font-mono">
                            {revision.content}
                          </pre>
                        </div>
                      )}
                      {revision.signature && (
                        <div className="text-[10px] font-mono text-muted-foreground break-all border-2 border-inset border-border-strong bg-card rounded-[8px] p-2">
                          <span className="uppercase tracking-wider text-[9px] mr-2">
                            signature:
                          </span>
                          {revision.signature.slice(0, 128)}
                          {revision.signature.length > 128 && "…"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
