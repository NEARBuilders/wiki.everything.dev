import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Globe } from "lucide-react";
import type { TransactionBuilder } from "near-kit";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApiClient, useAuthClient } from "@/app";
import {
  Badge,
  Button,
  Card,
  Field,
  FieldLabel,
  InfoRow,
  Input,
  Spinner,
  Textarea,
} from "@/components";
import { StepList, useStepper } from "@/components/ui/stepper";
import { highlightJson } from "@/lib/json-highlight";

const PUBLISH_STEPS = [
  { label: "Preparing config write" },
  { label: "Signing delegate action" },
  { label: "Relaying transaction" },
] as const;

const CONFIG_PUBLISH_GAS = "300000000000000";

interface WikiConfigCardProps {
  wikiAccountId: string;
  parentAccount: string;
  gatewayId: string;
}

export function WikiConfigCard({ wikiAccountId, parentAccount, gatewayId }: WikiConfigCardProps) {
  const apiClient = useApiClient();
  const auth = useAuthClient();
  const queryClient = useQueryClient();

  const wikiQuery = useQuery({
    queryKey: ["wiki-by-account", wikiAccountId],
    queryFn: () => apiClient.resolveWiki({ accountId: wikiAccountId }),
    retry: false,
  });

  const appQuery = useQuery({
    queryKey: ["app", wikiAccountId, gatewayId],
    queryFn: () => apiClient.apps.getRegistryApp({ accountId: wikiAccountId, gatewayId }),
    retry: false,
  });

  const canonicalConfigUrl = appQuery.data?.data?.canonicalConfigUrl;

  const configQuery = useQuery({
    queryKey: ["fastkv-config", canonicalConfigUrl],
    queryFn: async () => {
      if (!canonicalConfigUrl) return null;
      const res = await fetch(canonicalConfigUrl);
      if (!res.ok) return null;
      return (await res.json()) as Record<string, unknown>;
    },
    enabled: Boolean(canonicalConfigUrl),
    staleTime: 60_000,
  });

  const wiki = wikiQuery.data;
  const existingConfig = configQuery.data;
  const hasPublishedConfig = Boolean(existingConfig);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (existingConfig) {
      setTitle((existingConfig.title as string) ?? wiki?.name ?? "");
      setDescription((existingConfig.description as string) ?? wiki?.name ?? "");
    } else if (wiki) {
      setTitle(wiki.name);
      setDescription(wiki.name);
    }
  }, [existingConfig, wiki]);

  const { steps, resetSteps, runStep } = useStepper(PUBLISH_STEPS);

  const publishMutation = useMutation({
    mutationFn: async () => {
      resetSteps();

      const config: Record<string, unknown> = {
        ...(existingConfig ?? {}),
        extends: `bos://${parentAccount}/${gatewayId}`,
        account: wikiAccountId,
        domain: wiki ? `${wiki.subdomain}.${gatewayId}` : undefined,
        title: title.trim() || wiki?.name || wikiAccountId,
        description: description.trim() || wiki?.name || wikiAccountId,
      };

      const prepared = await runStep(0, () =>
        apiClient.apps.prepareRegistryConfigWrite({
          accountId: wikiAccountId,
          gatewayId,
          config,
        }),
      );
      if (!prepared) throw new Error(steps[0].error ?? "Failed to prepare config write");

      const nearAccountId = auth.near.getAccountId();
      if (!nearAccountId) throw new Error("Connect a NEAR wallet first");

      const signed = await runStep(1, () =>
        auth.near.buildSignedDelegateAction(
          prepared.data.contractId,
          (builder: TransactionBuilder) =>
            builder.functionCall(
              prepared.data.contractId,
              prepared.data.methodName,
              prepared.data.args,
              { gas: CONFIG_PUBLISH_GAS, attachedDeposit: 0n },
            ),
        ),
      );
      if (!signed) throw new Error(steps[1].error ?? "Failed to sign delegate action");

      const relayed = await runStep(2, () => auth.near.relayTransaction({ payload: signed }));
      if (!relayed || relayed.error) {
        const msg = relayed?.error?.message ?? steps[2].error ?? "Relay failed";
        throw new Error(msg);
      }

      return relayed.data;
    },
    onSuccess: async (data) => {
      toast.success("Config published", {
        description: data?.txHash ? `tx: ${data.txHash}` : "Indexing may take a moment.",
      });
      await queryClient.invalidateQueries({ queryKey: ["app", wikiAccountId, gatewayId] });
      await queryClient.invalidateQueries({ queryKey: ["fastkv-config", canonicalConfigUrl] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to publish config");
    },
  });

  if (wikiQuery.isLoading) {
    return (
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          Loading wiki info...
        </div>
      </Card>
    );
  }

  if (wikiQuery.error || !wiki) {
    return (
      <Card className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Wiki</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Wiki not found for account <code className="font-mono text-xs">{wikiAccountId}</code>. The
          wiki may have been deleted while the organization still references it.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">{wiki.name}</span>
          {hasPublishedConfig ? (
            <Badge variant="secondary" className="text-xs">
              published
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              unpublished
            </Badge>
          )}
        </div>

        <div className="space-y-1.5">
          <InfoRow label="account" value={wiki.accountId} />
          <InfoRow label="domain" value={`${wiki.subdomain}.${gatewayId}`} />
        </div>

        <Button asChild variant="outline" size="sm">
          <a
            href={`https://${wiki.subdomain}.${gatewayId}`}
            target="_blank"
            rel="noreferrer"
            className="gap-1.5"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            visit wiki
          </a>
        </Button>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Config
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="config-title">Title</FieldLabel>
            <Input
              id="config-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Wiki title"
              className="h-9 text-sm"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="config-description">Description</FieldLabel>
            <Textarea
              id="config-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description"
              className="min-h-9 text-sm"
            />
          </Field>
        </div>

        {existingConfig && (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="bg-muted/30 px-3.5 py-2 border-b border-border">
              <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
                Published config
              </span>
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-sm text-foreground leading-relaxed whitespace-pre bg-foreground text-background max-h-64">
              {highlightJson(JSON.stringify(existingConfig, null, 2))}
            </pre>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={() => publishMutation.mutate()}
            disabled={publishMutation.isPending || !title}
            size="sm"
          >
            {publishMutation.isPending
              ? "Publishing..."
              : hasPublishedConfig
                ? "Publish changes"
                : "Publish config"}
          </Button>
        </div>

        {publishMutation.isPending && (
          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
            <div className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
              Progress
            </div>
            <StepList steps={steps} />
          </div>
        )}

        {!hasPublishedConfig && !publishMutation.isPending && (
          <p className="text-xs text-muted-foreground">
            No config has been published yet. Click "Publish config" to write a minimal
            bos.config.json to the registry. This makes the wiki accessible at{" "}
            <code className="font-mono">
              {wiki.subdomain}.{gatewayId}
            </code>
            .
          </p>
        )}
      </Card>
    </div>
  );
}
