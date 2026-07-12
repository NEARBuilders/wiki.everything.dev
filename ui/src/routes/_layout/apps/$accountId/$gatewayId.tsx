import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Check, Copy, ExternalLink, Info } from "lucide-react";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import { useApiClient } from "@/app";
import { Badge, Button } from "@/components";
import { AppDetailContent } from "@/components/ui/app-detail-content";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";

export const Route = createFileRoute("/_layout/apps/$accountId/$gatewayId")({
  loader: async ({ params, context }) => {
    const { queryClient, apiClient } = context;
    await queryClient.prefetchQuery({
      queryKey: ["app", params.accountId, params.gatewayId],
      queryFn: () =>
        apiClient.apps.getRegistryApp({
          accountId: params.accountId,
          gatewayId: params.gatewayId,
        }),
      staleTime: 30_000,
    });
    return { accountId: params.accountId, gatewayId: params.gatewayId };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [] };
    return {
      meta: [
        {
          title: `${loaderData.accountId} / ${loaderData.gatewayId} | Apps | everything.dev`,
        },
        {
          name: "description",
          content: `Runtime details for bos://${loaderData.accountId}/${loaderData.gatewayId} — inspect host, UI, API, and plugin composition.`,
        },
      ],
    };
  },
  component: AppDetailPage,
});

function AppDetailPage() {
  const { accountId, gatewayId } = Route.useParams();
  const apiClient = useApiClient();
  const router = useRouter();
  const canGoBack = router.history.canGoBack?.() ?? false;

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const appQuery = useSuspenseQuery({
    queryKey: ["app", accountId, gatewayId],
    queryFn: () => apiClient.apps.getRegistryApp({ accountId, gatewayId }),
    staleTime: 30_000,
  });

  const statusQuery = useQuery({
    queryKey: ["registry-status"],
    queryFn: () => apiClient.apps.getRegistryStatus(),
    staleTime: 60_000,
  });

  const app = appQuery.data?.data;

  if (!app) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-24 text-center sm:px-6">
        <p className="text-base font-semibold text-foreground">App not found.</p>
        <Button asChild variant="ghost" size="sm">
          <Link to="/apps" search={{}}>
            ← back to apps
          </Link>
        </Button>
      </div>
    );
  }

  const isTenant = app.extends === "bos://dev.everything.near/everything.dev";

  const metaPanel = (
    <div className="space-y-4 text-sm">
      <MetaSectionLabel>Details</MetaSectionLabel>
      <MetaRow label="Status">
        <Badge variant={app.status === "ready" ? "default" : "destructive"} className="text-xs">
          {app.status}
        </Badge>
      </MetaRow>
      {isTenant && (
        <MetaRow label="Type">
          <Badge variant="outline" className="text-xs">
            tenant runtime
          </Badge>
        </MetaRow>
      )}
      {app.extends && (
        <MetaRow label="Extends">
          <code className="font-mono text-xs break-all text-foreground">{app.extends}</code>
        </MetaRow>
      )}
      {app.domain && (
        <MetaRow label="Domain">
          <span className="font-mono text-xs">{app.domain}</span>
        </MetaRow>
      )}
      {app.metadata?.claimedBy && (
        <MetaRow label="Claimed by">
          <span className="font-mono text-xs">{app.metadata.claimedBy}</span>
        </MetaRow>
      )}
      {app.metadata?.updatedAt && (
        <MetaRow label="Updated">{new Date(app.metadata.updatedAt).toLocaleDateString()}</MetaRow>
      )}
      <MetaRow label="Relay">
        {statusQuery.data?.relayEnabled ? (
          <Badge variant="secondary" className="text-xs">
            enabled
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">disabled</span>
        )}
      </MetaRow>
      <div className="pt-1 space-y-1.5">
        <MetaSectionLabel>FastKV key</MetaSectionLabel>
        <code className="block font-mono text-[10px] text-muted-foreground break-all bg-muted/30 rounded px-2 py-1.5">
          {app.canonicalKey}
        </code>
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex items-center gap-2 flex-wrap justify-between">
          <div className="flex items-center gap-2">
            {canGoBack ? (
              <button
                type="button"
                onClick={() => router.history.back()}
                aria-label="Go back"
                className="flex items-center justify-center w-8 h-8 border-2 border-outset border-border-strong bg-card shadow-sm transition-all duration-200 ease-out hover:shadow-md hover:bg-muted rounded-[10px]"
              >
                <ArrowLeft size={14} className="text-foreground" />
              </button>
            ) : (
              <Link
                to="/apps/$accountId"
                params={{ accountId }}
                aria-label="Go back"
                className="flex items-center justify-center w-8 h-8 border-2 border-outset border-border-strong bg-card shadow-sm transition-all duration-200 ease-out hover:shadow-md hover:bg-muted rounded-[10px]"
              >
                <ArrowLeft size={14} className="text-foreground" />
              </Link>
            )}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
              <Link to="/apps" search={{}} className="hover:text-foreground transition-colors">
                apps
              </Link>
              <span>/</span>
              <Link
                to="/apps/$accountId"
                params={{ accountId }}
                className="hover:text-foreground transition-colors"
              >
                {accountId}
              </Link>
              <span>/</span>
              <span className="text-foreground font-semibold">{gatewayId}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {app.openUrl && (
              <Button asChild size="sm" className="h-8 gap-1.5">
                <a href={app.openUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={11} />
                  open app
                </a>
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              className="h-8 gap-1.5"
              onClick={async () => {
                await navigator.clipboard.writeText(
                  `bunx everything-dev@latest start --account ${accountId} --domain ${gatewayId}`,
                );
                setCopiedCmd(true);
                toast.success("Copied start command");
                setTimeout(() => setCopiedCmd(false), 2000);
              }}
            >
              {copiedCmd ? <Check size={11} /> : <Copy size={11} />}
              <span className="hidden sm:inline">start command</span>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="sm:hidden"
              onClick={() => setDetailsOpen(true)}
              aria-label="App details"
            >
              <Info size={14} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-6">
          <AppDetailContent
            accountId={accountId}
            gatewayId={gatewayId}
            app={app}
            statusQuery={statusQuery}
          />

          <div className="hidden sm:block">
            <div className="sticky top-4 space-y-0 border border-border rounded-lg overflow-hidden bg-card">
              <div className="px-4 py-3 border-b border-border bg-muted/20">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Details
                </span>
              </div>
              <div className="px-4 py-4">{metaPanel}</div>
            </div>
          </div>
        </div>
      </div>

      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="bottom" className="max-h-[70dvh] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-sm">Details</SheetTitle>
            <SheetClose />
          </SheetHeader>
          {metaPanel}
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}

function MetaSectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-foreground">{children}</div>
    </div>
  );
}
