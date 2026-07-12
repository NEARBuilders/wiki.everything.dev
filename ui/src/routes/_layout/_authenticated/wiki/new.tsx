import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useApiClient, useAuthClient } from "@/app";
import { Button, Card, CardContent, Input } from "@/components";
import { PageContainer } from "@/components/layout/page-container";

export const Route = createFileRoute("/_layout/_authenticated/wiki/new")({
  head: () => ({
    title: "New Wiki | Wiki",
    meta: [{ name: "description", content: "Create a new wiki." }],
  }),
  component: NewWikiPage,
});

function NewWikiPage() {
  const apiClient = useApiClient();
  const auth = useAuthClient();
  const [subdomain, setSubdomain] = useState("");
  const [name, setName] = useState("");

  const generateSubdomain = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const [autoSync, setAutoSync] = useState(true);

  const handleNameChange = (value: string) => {
    setName(value);
    if (autoSync) {
      setSubdomain(generateSubdomain(value));
    }
  };

  const handleSubdomainChange = (value: string) => {
    setSubdomain(value.replace(/[^a-z0-9-]/g, ""));
    if (!value && autoSync === false) {
      setAutoSync(true);
    } else if (value) {
      setAutoSync(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const nearAccountId = auth.near.getAccountId();
      if (!nearAccountId) {
        throw new Error("Connect a NEAR wallet first");
      }

      const namespaceAccountId = "wiki.everything.near";
      const accountId = `${subdomain}.${namespaceAccountId}`;
      const publicKey = auth.near.getState()?.publicKey;
      if (!publicKey) {
        throw new Error("No NEAR public key available");
      }

      const availability = await auth.near.checkSubAccountAvailability({
        subAccountName: subdomain,
      });
      if (availability.error) throw new Error(availability.error.message);
      if (!availability.data?.available) {
        throw new Error(`Subdomain "${subdomain}" is already taken`);
      }

      const subAccountResult = await auth.near.createSubAccount({
        subAccountName: subdomain,
        publicKey,
      });
      if (subAccountResult.error) throw new Error(subAccountResult.error.message);

      const orgResult = await auth.organization.create({
        name,
        slug: subdomain,
        metadata: { wikiAccountId: accountId },
      });
      if (orgResult.error) throw new Error(orgResult.error.message);

      const wikiResult = await apiClient.createWiki({
        subdomain,
        name,
        accountId,
        orgId: orgResult.data.id,
      });

      await auth.organization.setActive({ organizationId: orgResult.data.id });

      return { wiki: wikiResult, accountId, orgId: orgResult.data.id };
    },
    onSuccess: async () => {
      toast.success(`Wiki "${name}" created`);
      window.location.href = "/";
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create wiki");
    },
  });

  return (
    <PageContainer variant="narrow">
      <div className="space-y-8">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            Create
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            New Wiki
          </h1>
          <p className="text-sm text-muted-foreground">
            Create a new wiki tenant. Your linked NEAR wallet will be used as the owner and
            administrator.
          </p>
        </header>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-6"
        >
          <Card>
            <CardContent className="p-6 space-y-4">
              <Field label="wiki name" htmlFor="wiki-name">
                <Input
                  id="wiki-name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Star Wars Wiki"
                  required
                />
              </Field>
              <Field label="subdomain" htmlFor="wiki-subdomain">
                <div className="flex items-center gap-2">
                  <Input
                    id="wiki-subdomain"
                    value={subdomain}
                    onChange={(e) => handleSubdomainChange(e.target.value)}
                    placeholder="star-wars"
                    pattern="[a-z0-9-]+"
                    required
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                    .wiki.everything.dev
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Only lowercase letters, numbers, and hyphens.
                </p>
              </Field>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={createMutation.isPending || !name || !subdomain}
              variant="outline"
            >
              {createMutation.isPending ? "creating..." : "create wiki"}
            </Button>
          </div>
        </form>

        <section className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            What Happens
          </h2>
          <Card>
            <CardContent className="p-4 space-y-2 text-xs text-muted-foreground">
              <p>
                1. <strong>NEAR subaccount</strong> — {subdomain || "{subdomain}"}
                .wiki.everything.near is created and linked to your wallet
              </p>
              <p>
                2. <strong>Organization</strong> — A Better-Auth organization is created (you become
                owner)
              </p>
              <p>
                3. <strong>Wiki row</strong> — The wiki is registered in the database
              </p>
              <p>
                4. <strong>Redirect</strong> — You're sent to your new wiki
              </p>
              <p className="text-muted-foreground/60 pt-1">
                Funded subaccount (≥0.1 NEAR). Full-access key retained — you can delete and reclaim
                later.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </PageContainer>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
