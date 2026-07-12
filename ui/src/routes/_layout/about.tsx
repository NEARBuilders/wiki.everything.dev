import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Check, Copy, Globe } from "lucide-react";
import { useState } from "react";
import { getAccount, getActiveRuntime, useApiClient } from "@/app";
import { AppDetailContent } from "@/components/ui/app-detail-content";
import { Button } from "@/components";
import { PageContainer } from "@/components/layout/page-container";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export const Route = createFileRoute("/_layout/about")({
  loader: async ({ context }) => {
    const { queryClient, apiClient } = context;
    const runtimeConfig = context.runtimeConfig;
    const accountId = getAccount(runtimeConfig);
    const gatewayId = getActiveRuntime(runtimeConfig)?.gatewayId;
    if (accountId && gatewayId) {
      await queryClient.prefetchQuery({
        queryKey: ["app", accountId, gatewayId],
        queryFn: () => apiClient.apps.getRegistryApp({ accountId, gatewayId }),
        staleTime: 30_000,
      });
    }
    return { accountId, gatewayId };
  },
  head: () => ({
    meta: [
      { title: "About | everything.dev" },
      { name: "description", content: "About this runtime-composed app on NEAR." },
    ],
  }),
  component: About,
});

function About() {
  const { accountId, gatewayId } = Route.useLoaderData();
  const { runtimeConfig } = Route.useRouteContext();
  const runtime = getActiveRuntime(runtimeConfig);
  const apiClient = useApiClient();
  const router = useRouter();
  const canGoBack = router.history.canGoBack?.() ?? false;

  const [copiedCmd, setCopiedCmd] = useState(false);

  const appQuery = useQuery({
    queryKey: ["app", accountId, gatewayId],
    queryFn: () => apiClient.apps.getRegistryApp({ accountId: accountId!, gatewayId: gatewayId! }),
    staleTime: 30_000,
    enabled: Boolean(accountId && gatewayId),
  });

  const statusQuery = useQuery({
    queryKey: ["registry-status"],
    queryFn: () => apiClient.apps.getRegistryStatus(),
    staleTime: 60_000,
  });

  const bosUri = accountId && gatewayId ? `bos://${accountId}/${gatewayId}` : null;
  const displayTitle = runtime?.title ?? accountId ?? "About";
  const startCommand =
    accountId && gatewayId
      ? `bunx everything-dev@latest start --account ${accountId} --domain ${gatewayId}`
      : null;

  const header = (
    <div className="flex items-center gap-2 flex-wrap justify-between">
      <div className="flex items-center gap-2">
        {canGoBack && (
          <button
            type="button"
            onClick={() => router.history.back()}
            aria-label="Go back"
            className="flex items-center justify-center w-8 h-8 border-2 border-outset border-border-strong bg-card shadow-sm transition-all duration-200 ease-out hover:shadow-md hover:bg-muted rounded-[10px]"
          >
            <ArrowLeft size={14} className="text-foreground" />
          </button>
        )}
        <span className="text-xs text-muted-foreground font-mono">about</span>
      </div>

      <div className="flex items-center gap-2">
        {startCommand && (
          <Button
            variant="secondary"
            size="sm"
            className="h-8 gap-1.5"
            onClick={async () => {
              await navigator.clipboard.writeText(startCommand);
              setCopiedCmd(true);
              toast.success("Copied start command");
              setTimeout(() => setCopiedCmd(false), 2000);
            }}
          >
            {copiedCmd ? <Check size={11} /> : <Copy size={11} />}
            <span className="hidden sm:inline">start command</span>
          </Button>
        )}
      </div>
    </div>
  );

  if (!accountId || !gatewayId) {
    return (
      <TooltipProvider>
        <PageContainer variant="default">
          <div className="space-y-4">
            {header}
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-24 text-center sm:px-6">
              <Globe size={28} className="text-border" />
              <p className="text-base font-semibold text-foreground">Runtime identity not available.</p>
            </div>
          </div>
        </PageContainer>
      </TooltipProvider>
    );
  }

  if (appQuery.isLoading) {
    return (
      <TooltipProvider>
        <PageContainer variant="default">
          <div className="space-y-4">
            {header}
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-24 text-center sm:px-6">
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          </div>
        </PageContainer>
      </TooltipProvider>
    );
  }

  const app = appQuery.data?.data;

  if (appQuery.error || !app) {
    return (
      <TooltipProvider>
        <PageContainer variant="default">
          <div className="space-y-4">
            {header}
            <div className="rounded-[12px] border border-border bg-card p-6 space-y-4">
              <div className="space-y-2">
                <h1 className="text-xl font-bold text-foreground break-all">{displayTitle}</h1>
                {bosUri && (
                  <code className="block font-mono text-xs text-muted-foreground">{bosUri}</code>
                )}
                {runtime?.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {runtime.description}
                  </p>
                )}
              </div>

              <section className="space-y-2">
                <SectionLabel>Runtime</SectionLabel>
                <div className="space-y-1.5">
                  <RuntimeRow label="host" value={runtime?.hostUrl} />
                  <RuntimeRow label="account" value={accountId} isUrl={false} mono />
                  <RuntimeRow label="gateway" value={gatewayId} isUrl={false} mono />
                </div>
              </section>

              {startCommand && (
                <section className="space-y-2">
                  <SectionLabel>Start command</SectionLabel>
                  <StartCommand command={startCommand} />
                </section>
              )}

              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Publish to the registry with{" "}
                  <code className="font-mono">bos publish</code> to make this app discoverable and
                  show its full detail view.
                </p>
              </div>
            </div>
          </div>
        </PageContainer>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-6">
        {header}

        <AppDetailContent
          accountId={accountId}
          gatewayId={gatewayId}
          app={app}
          statusQuery={statusQuery}
        />
      </div>
    </TooltipProvider>
  );
}

function StartCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    toast.success("Copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="w-full group flex items-center justify-between gap-3 rounded-[8px] border border-border bg-foreground px-4 py-3 cursor-pointer transition-opacity duration-150 hover:opacity-90 text-left"
    >
      <code className="font-mono text-sm font-semibold text-background break-all leading-snug">
        {command}
      </code>
      <span
        className={`shrink-0 transition-colors duration-150 ${copied ? "text-brand-accent" : "text-background/50 group-hover:text-background/80"}`}
      >
        <Copy size={14} />
      </span>
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
      {children}
    </div>
  );
}

function RuntimeRow({
  label,
  value,
  isUrl = true,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  isUrl?: boolean;
  mono?: boolean;
}) {
  if (!value) return null;
  const looksLikeUrl = isUrl && /^https?:\/\//.test(value);
  return (
    <div className="flex items-start gap-2 rounded border border-border bg-muted/10 px-2.5 py-1.5 text-xs">
      <span
        className="text-muted-foreground uppercase tracking-wide shrink-0 pt-px font-semibold min-w-[40px]"
        style={{ fontSize: 10 }}
      >
        {label}
      </span>
      {looksLikeUrl ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-foreground hover:underline break-all"
        >
          {value}
        </a>
      ) : (
        <span className={`text-foreground break-all ${mono ? "font-mono" : ""}`}>{value}</span>
      )}
    </div>
  );
}
