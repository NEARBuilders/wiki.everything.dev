import { useQuery } from "@tanstack/react-query";
import { ClientOnly, createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Fingerprint, Lock, Save } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { sessionQueryOptions, useApiClient, useAuthClient } from "@/app";
import { ArticleRenderer } from "@/components/article-renderer";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_layout/w/$slug/edit")({
  head: ({ params }) => ({
    meta: [{ title: `Edit ${params.slug} | Wiki` }],
  }),
  component: ArticleEditorPage,
});

const NEAR_SIGN_CONTRACT = "wiki.everything.near";

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const MDEditor = lazy(async () => {
  const mod = await import("@uiw/react-md-editor");
  await import("@uiw/react-md-editor/markdown-editor.css");
  return { default: mod.default };
});

type EditorMode = "edit" | "preview" | "split";

function ArticleEditorPage() {
  const { slug } = Route.useParams();
  const { wiki } = Route.useRouteContext();
  const apiClient = useApiClient();
  const auth = useAuthClient();
  const router = useRouter();
  const canGoBack = router.history.canGoBack?.() ?? false;

  const wikiId = wiki?.id ?? "";
  const isNew = slug === "new";

  const { data: session } = useQuery(sessionQueryOptions(auth, undefined));
  const activeOrgId = session?.session?.activeOrganizationId ?? null;
  const isMember = !!wiki && !!activeOrgId && activeOrgId === wiki.orgId;
  const isAdmin = session?.user?.role === "admin";
  const canEdit = isMember || isAdmin;

  const articleQuery = useQuery({
    queryKey: ["article", wikiId, slug],
    queryFn: () => apiClient.getArticle({ wikiId, slug }),
    enabled: !!wikiId && !isNew,
    retry: false,
  });

  const existing = articleQuery.data?.article;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<EditorMode>("edit");
  const [draftBanner, setDraftBanner] = useState<"idle" | "restored" | "dismissed">("idle");

  const draftKey = useMemo(() => `wiki-draft:${wikiId}:${slug}`, [wikiId, slug]);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    if (typeof window === "undefined") return;
    if (!wikiId) return;

    const raw = window.localStorage.getItem(draftKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { title?: string; content?: string };
        if (parsed.title) setTitle(parsed.title);
        if (parsed.content) setContent(parsed.content);
        setDraftBanner("restored");
        hydratedRef.current = true;
        return;
      } catch {
        window.localStorage.removeItem(draftKey);
      }
    }

    if (existing) {
      setTitle(existing.title);
      setContent(
        typeof existing.content === "string"
          ? existing.content
          : existing.content
            ? JSON.stringify(existing.content, null, 2)
            : "",
      );
      hydratedRef.current = true;
    } else if (isNew) {
      hydratedRef.current = true;
    }
  }, [draftKey, existing, isNew, wikiId]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (typeof window === "undefined") return;
    if (!title && !content) return;
    const t = setTimeout(() => {
      window.localStorage.setItem(draftKey, JSON.stringify({ title, content }));
    }, 400);
    return () => clearTimeout(t);
  }, [title, content, draftKey]);

  const clearDraft = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(draftKey);
    }
    setDraftBanner("dismissed");
  };

  const derivedSlug = isNew ? generateSlug(title) : slug;

  async function saveArticle(signature?: string) {
    if (!title.trim() || !content.trim() || !wikiId) {
      toast.error("Title and content are required");
      return;
    }

    setSubmitting(true);
    try {
      if (isNew) {
        if (!derivedSlug) {
          toast.error("Title must contain alphanumeric characters");
          return;
        }
        await apiClient.createArticle({
          wikiId,
          slug: derivedSlug,
          title,
          content,
          signature,
        });
        toast.success("Article created");
        clearDraft();
        await router.navigate({ to: "/w/$slug", params: { slug: derivedSlug } });
      } else {
        const parentRevisionId = existing?.currentRevisionId ?? "";
        await apiClient.updateArticle({
          wikiId,
          slug,
          content,
          parentRevisionId,
          signature,
        });
        toast.success("Article saved");
        clearDraft();
        await router.navigate({ to: "/w/$slug", params: { slug } });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save article");
    } finally {
      setSubmitting(false);
    }
  }

  const handleSave = () => saveArticle();

  const handleSignAndSave = async () => {
    const nearAccountId = auth.near.getAccountId();
    if (!nearAccountId) {
      toast.error("Connect a NEAR wallet to sign edits");
      return;
    }

    const signature = await auth.near.buildSignedDelegateAction(NEAR_SIGN_CONTRACT, (builder) =>
      builder.functionCall(
        NEAR_SIGN_CONTRACT,
        "sign",
        { content },
        { gas: "10000000000000", attachedDeposit: 0n },
      ),
    );

    await saveArticle(signature);
  };

  const handleCancel = () => {
    if (canGoBack) router.history.back();
    else router.navigate({ to: "/" });
  };

  if (!canEdit && !isNew) {
    return <PermissionGuard />;
  }

  if (!isNew && articleQuery.isLoading) {
    return <EditorSkeleton canGoBack={canGoBack} onBack={() => router.history.back()} />;
  }

  return (
    <div className="w-full h-full flex flex-col min-h-0">
      <div className="sticky top-0 z-20 shrink-0 bg-card border-b border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <BackButton canGoBack={canGoBack} onBack={handleCancel} />
            <div className="min-w-0 hidden sm:block">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {isNew ? "New article" : "Editing"}
              </div>
              <div className="text-sm font-semibold text-foreground truncate">
                {isNew ? title || "Untitled" : slug}
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1 border-2 border-inset border-border-strong bg-muted rounded-[10px] p-0.5">
            {(["edit", "split", "preview"] as EditorMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-[8px] transition-colors",
                  mode === m
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={submitting || !title.trim() || !content.trim()}
              className="h-9 px-3 inline-flex items-center gap-1.5 text-xs font-semibold border-2 border-outset border-border-strong bg-card text-foreground shadow-sm hover:shadow-md active:border-inset active:shadow-none transition-all duration-200 ease-out rounded-[10px] disabled:opacity-50 disabled:pointer-events-none"
            >
              <Save className="h-3.5 w-3.5" />
              {submitting ? "saving..." : "save"}
            </button>
            <button
              type="button"
              onClick={handleSignAndSave}
              disabled={submitting || !title.trim() || !content.trim()}
              className="h-9 px-3 inline-flex items-center gap-1.5 text-xs font-semibold border-2 border-outset border-border-strong bg-foreground text-background shadow-sm hover:shadow-md active:border-inset active:shadow-none transition-all duration-200 ease-out rounded-[10px] disabled:opacity-50 disabled:pointer-events-none"
            >
              <Fingerprint className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">sign & save</span>
              <span className="sm:hidden">sign</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 space-y-4">
          {draftBanner === "restored" && (
            <div className="flex items-center justify-between gap-3 border-2 border-inset border-border-strong bg-yellow-100 dark:bg-yellow-950/30 rounded-[10px] px-4 py-2 text-xs">
              <span className="text-foreground">
                Restored an unsaved local draft. Save to publish, or dismiss to keep as-is.
              </span>
              <button
                type="button"
                onClick={() => setDraftBanner("dismissed")}
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                dismiss
              </button>
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="article-title"
              className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold"
            >
              Title
            </label>
            <Input
              id="article-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article title"
              className="text-xl font-semibold h-12"
              disabled={!isNew}
            />
            {isNew && derivedSlug && (
              <div className="text-[11px] font-mono text-muted-foreground">→ /w/{derivedSlug}</div>
            )}
          </div>

          <EditorPane mode={mode} content={content} onChange={setContent} title={title} />
        </div>
      </div>
    </div>
  );
}

function EditorPane({
  mode,
  content,
  onChange,
  title,
}: {
  mode: EditorMode;
  content: string;
  onChange: (v: string) => void;
  title: string;
}) {
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");

  return (
    <>
      <div className="md:hidden">
        <div className="flex items-center border-2 border-inset border-border-strong bg-muted rounded-[10px] p-0.5 mb-3">
          {(["edit", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setMobileTab(t)}
              className={cn(
                "flex-1 py-1.5 text-xs font-medium rounded-[8px] transition-colors",
                mobileTab === t
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        {mobileTab === "edit" ? (
          <WysiwygEditor value={content} onChange={onChange} preview="edit" />
        ) : (
          <PreviewPane title={title} content={content} />
        )}
      </div>

      <div className="hidden md:block">
        {mode === "edit" && <WysiwygEditor value={content} onChange={onChange} preview="edit" />}
        {mode === "preview" && <PreviewPane title={title} content={content} />}
        {mode === "split" && <WysiwygEditor value={content} onChange={onChange} preview="live" />}
      </div>
    </>
  );
}

function WysiwygEditor({
  value,
  onChange,
  preview,
}: {
  value: string;
  onChange: (v: string) => void;
  preview: "edit" | "live" | "preview";
}) {
  return (
    <div
      className="border-2 border-inset border-border-strong bg-card rounded-[12px] overflow-hidden"
      data-color-mode="auto"
    >
      <ClientOnly
        fallback={
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={20}
            placeholder="Write your article content in markdown..."
            className="w-full bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none font-mono resize-none"
          />
        }
      >
        <Suspense
          fallback={<div className="p-6 text-xs text-muted-foreground">Loading editor…</div>}
        >
          <MDEditor
            value={value}
            onChange={(v?: string) => onChange(v ?? "")}
            height={520}
            preview={preview}
            visibleDragbar={false}
          />
        </Suspense>
      </ClientOnly>
    </div>
  );
}

function PreviewPane({ title, content }: { title: string; content: string }) {
  return (
    <div className="border-2 border-inset border-border-strong bg-card rounded-[12px] p-6 space-y-4">
      <h1 className="text-2xl font-bold text-foreground border-b border-border pb-3">
        {title || "Untitled"}
      </h1>
      {content ? (
        <div className="prose-custom">
          <ArticleRenderer content={content} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">Start writing to see the preview.</p>
      )}
    </div>
  );
}

function BackButton({ canGoBack, onBack }: { canGoBack: boolean; onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="flex items-center gap-1.5 h-9 px-2.5 border-2 border-outset border-border-strong bg-card text-foreground shadow-sm hover:shadow-md active:border-inset active:shadow-none transition-all duration-200 ease-out rounded-[10px]"
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="text-xs font-medium">{canGoBack ? "back" : "home"}</span>
    </button>
  );
}

function EditorSkeleton({ canGoBack, onBack }: { canGoBack: boolean; onBack: () => void }) {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 space-y-6">
      <BackButton canGoBack={canGoBack} onBack={onBack} />
      <Skeleton className="h-12 w-full rounded-[8px]" />
      <Skeleton className="h-[520px] w-full rounded-[12px]" />
    </div>
  );
}

function PermissionGuard() {
  return (
    <EmptyState
      icon={Lock}
      title="Not editable"
      description="You need to be a member of this wiki's organization to edit articles."
      action={
        <Link
          to="/organizations"
          className="h-10 px-4 inline-flex items-center gap-1.5 text-sm font-medium border-2 border-outset border-border-strong bg-card text-foreground shadow-sm hover:shadow-md active:border-inset active:shadow-none transition-all duration-200 ease-out rounded-[12px]"
        >
          organizations
        </Link>
      }
    />
  );
}
