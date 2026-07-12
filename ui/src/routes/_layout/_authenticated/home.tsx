import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, Compass, Home as HomeIcon, Plus, Settings, Shield } from "lucide-react";
import { useMemo } from "react";
import { type Passkey, type SessionData, sessionQueryOptions, useAuthClient } from "@/app";
import { Card } from "@/components";
import { PageContainer } from "@/components/layout/page-container";

export const Route = createFileRoute("/_layout/_authenticated/home")({
  head: () => ({
    meta: [{ title: "Workspace | Wiki" }, { name: "description", content: "Your workspace." }],
  }),
  component: Home,
});

function Home() {
  const auth = useAuthClient();
  const { wiki } = Route.useRouteContext();
  const { data: session } = useQuery<SessionData | null>(sessionQueryOptions(auth, undefined));
  const { data: passkeys = [] } = useQuery({
    queryKey: ["passkeys"],
    queryFn: async () => {
      const { data } = await auth.passkey.listUserPasskeys();
      return (data || []) as Passkey[];
    },
    staleTime: 60 * 1000,
  });
  const user = session?.user;
  const nearAccountId = auth.near.getAccountId();

  const profile = useMemo(() => {
    if (!user)
      return {
        isAnonymous: false,
        hasEmail: false,
        hasNear: false,
        hasPasskeys: false,
        isAdmin: false,
      };
    return {
      isAnonymous: user.isAnonymous || false,
      hasEmail: Boolean(user.email),
      hasNear: Boolean(nearAccountId),
      hasPasskeys: passkeys.length > 0,
      isAdmin: user.role === "admin",
    };
  }, [user, nearAccountId, passkeys.length]);

  const activeOrgId = session?.session?.activeOrganizationId ?? null;
  const isMember = !!wiki && !!activeOrgId && activeOrgId === wiki.orgId;

  return (
    <PageContainer variant="wide">
      <div className="space-y-8">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <HomeIcon className="h-3 w-3" />
            Workspace
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {user?.name || user?.email || "You"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage your identity and jump back into the wiki.
              </p>
            </div>
            <Link
              to="/settings"
              preload="intent"
              className="h-10 px-4 inline-flex items-center gap-1.5 text-sm font-medium border-2 border-outset border-border-strong bg-card text-foreground shadow-sm hover:shadow-md active:border-inset active:shadow-none transition-all duration-200 ease-out rounded-[12px]"
            >
              <Settings className="h-4 w-4" />
              settings
            </Link>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickCard title="Main page" desc="Browse the wiki" to="/" icon={HomeIcon} />
          <QuickCard title="Explore" desc="Every page A–Z" to="/explore" icon={Compass} />
          <QuickCard title="Recent changes" desc="Latest edits" to="/recent" icon={ClipboardList} />
          {isMember ? (
            <QuickCard title="Wiki admin" desc="Manage articles" to="/admin" icon={Shield} />
          ) : (
            <QuickCard title="Start a wiki" desc="Create your own" to="/wiki/new" icon={Plus} />
          )}
        </section>

        {!user ? (
          <div className="text-muted-foreground text-center py-12 text-sm">Loading…</div>
        ) : (
          <>
            <Card className="p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Chip>workspace</Chip>
                {profile.isAnonymous && <Chip>anonymous</Chip>}
                {profile.isAdmin && <Chip accent>admin</Chip>}
                {isMember && <Chip accent>wiki member</Chip>}
              </div>
              <h2 className="text-foreground text-xl font-semibold">
                {user.name || user.email || user.id.slice(0, 8)}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Manage your identity and connected accounts.
              </p>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                Identity Status
              </div>
              <div className="flex flex-col gap-2">
                <InfoRow
                  label="email"
                  value={profile.hasEmail ? (user.email ?? "linked") : "not linked"}
                />
                <InfoRow
                  label="near"
                  value={profile.hasNear ? (nearAccountId ?? "linked") : "not linked"}
                  mono
                />
                <InfoRow
                  label="passkeys"
                  value={profile.hasPasskeys ? `${passkeys.length} registered` : "not linked"}
                />
                <InfoRow
                  label="profile"
                  value={profile.isAnonymous ? "anonymous session" : "persistent account"}
                />
              </div>

              {profile.isAnonymous && (
                <div className="mt-2 rounded-[10px] bg-brand-accent-light border border-brand-accent-border text-foreground text-[13px] leading-relaxed px-4 py-3">
                  Link an email or NEAR wallet before signing out to keep your data.
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </PageContainer>
  );
}

function QuickCard({
  title,
  desc,
  to,
  icon: Icon,
}: {
  title: string;
  desc: string;
  to: "/" | "/explore" | "/recent" | "/admin" | "/wiki/new";
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      to={to}
      preload="intent"
      className="group border-2 border-outset border-border-strong bg-card p-4 rounded-[12px] shadow-sm hover:shadow-md active:border-inset active:shadow-none transition-all duration-200 ease-out flex flex-col gap-2"
    >
      <div className="flex items-center justify-center w-9 h-9 border-2 border-inset border-border-strong bg-muted rounded-[8px]">
        <Icon className="h-4 w-4 text-foreground" />
      </div>
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="text-[11px] text-muted-foreground">{desc}</div>
    </Link>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-4 rounded-[8px] border border-border bg-muted px-3.5 py-2.5 items-center">
      <span className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
        {label}
      </span>
      <span className={`text-foreground text-[13px] break-all ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function Chip({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-[6px] px-2.5 py-0.5 text-[11px] font-semibold border ${accent ? "bg-brand-accent-light border-brand-accent-border" : "bg-secondary border-border"} text-foreground`}
    >
      {children}
    </span>
  );
}
