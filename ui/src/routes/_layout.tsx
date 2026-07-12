import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ClipboardList, Compass, Home, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getAccount, getAppName, sessionQueryOptions, useAuthClient } from "@/app";
import builtOn from "@/assets/built_on.png";
import builtOnRev from "@/assets/built_on_rev.png";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WikiHeader } from "@/components/wiki-header";
import { WikiSidebar } from "@/components/wiki-sidebar";
import { cn } from "@/lib/utils";

interface WikiContext {
  id: string;
  subdomain: string;
  accountId: string;
  orgId: string;
  name: string;
  createdAt: string;
}

export const Route = createFileRoute("/_layout")({
  beforeLoad: async ({ context }) => {
    const { queryClient, authClient, apiClient } = context;
    const session = await queryClient.ensureQueryData(
      sessionQueryOptions(authClient, context.session),
    );

    const accountId = getAccount(context.runtimeConfig);
    let wiki: WikiContext | null = null;
    try {
      wiki = await apiClient.resolveWiki({ accountId });
    } catch {
      wiki = null;
    }

    return {
      runtimeConfig: context.runtimeConfig,
      session,
      wiki,
    };
  },
  component: Layout,
});

function Layout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isNavigating = useRouterState({ select: (s) => s.status === "pending" });
  const { runtimeConfig, session, wiki } = Route.useRouteContext();
  const appName = getAppName(runtimeConfig);
  const auth = useAuthClient();

  const isAuthenticated = !!session?.user;
  const activeOrgId = session?.session?.activeOrganizationId ?? null;
  const isAdmin = session?.user?.role === "admin";

  const { data: liveSession } = useQuery({
    ...sessionQueryOptions(auth, session),
    initialData: session,
  });
  const liveOrgId = liveSession?.session?.activeOrganizationId ?? activeOrgId;
  const liveIsMember = !!wiki && !!liveOrgId && liveOrgId === wiki.orgId;
  const liveIsAdmin = liveSession?.user?.role === "admin" || isAdmin;
  const liveCanEdit = liveIsMember || liveIsAdmin;

  const hideChrome = pathname === "/login";

  const [betaBannerDismissed, setBetaBannerDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("beta-banner-dismissed") === "true";
  });

  useEffect(() => {
    localStorage.setItem("beta-banner-dismissed", String(betaBannerDismissed));
  }, [betaBannerDismissed]);

  return (
    <TooltipProvider>
      <div
        className="h-dvh w-full flex flex-col overflow-hidden bg-background text-foreground"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingLeft: "env(safe-area-inset-left, 0px)",
          paddingRight: "env(safe-area-inset-right, 0px)",
        }}
      >
        {!betaBannerDismissed && (
          <div className="shrink-0 flex items-center justify-center py-1.5 pl-3 pr-1 bg-yellow-300 border-b border-yellow-400">
            <span className="flex-1 text-[11px] font-bold tracking-wide text-yellow-950 text-center">
              Beta database will be wiped periodically. Do not save data you want to keep.
            </span>
            <button
              type="button"
              onClick={() => setBetaBannerDismissed(true)}
              className="shrink-0 p-1 text-yellow-950/60 hover:text-yellow-950 transition-colors cursor-pointer"
              aria-label="Dismiss beta banner"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {isNavigating && (
          <div className="fixed top-0 left-0 right-0 h-[2px] z-50 overflow-hidden pointer-events-none">
            <div className="h-full bg-foreground animate-progress-bar" style={{ width: "100%" }} />
          </div>
        )}

        {hideChrome ? (
          <MinimalHeader />
        ) : (
          <WikiHeader
            appName={appName}
            wiki={wiki}
            isAuthenticated={isAuthenticated}
            isMember={liveIsMember}
            canEdit={liveCanEdit}
          />
        )}

        <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden">
          {!hideChrome && (
            <aside className="hidden lg:flex shrink-0 w-64 flex-col border-r border-border bg-card overflow-y-auto">
              <div className="flex-1">
                <WikiSidebar
                  wiki={wiki}
                  isAuthenticated={isAuthenticated}
                  isMember={liveIsMember}
                  canEdit={liveCanEdit}
                />
              </div>
              <div className="shrink-0 px-4 pb-3 pt-2 border-t border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    wiki.everything.dev
                  </span>
                  <ThemeToggle className="relative flex items-center justify-center w-6 h-6 text-muted-foreground hover:text-foreground transition-colors" />
                </div>
                <NearBranding />
              </div>
            </aside>
          )}

          <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
            <main
              className={cn(
                "flex-1 w-full min-h-0 overflow-y-auto",
                !hideChrome && "pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6",
              )}
            >
              <Outlet />
            </main>
          </div>
        </div>

        {!hideChrome && (
          <MobileTabBar
            wiki={wiki}
            isAuthenticated={isAuthenticated}
            isMember={liveIsMember}
            canEdit={liveCanEdit}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

function MinimalHeader() {
  return (
    <div className="fixed bottom-4 left-4 z-40">
      <ThemeToggle className="relative flex items-center justify-center w-8 h-8 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground transition-colors shadow-sm" />
    </div>
  );
}

function NearBranding() {
  return (
    <a
      href="https://near.dev"
      target="_blank"
      rel="noopener noreferrer"
      className="relative block h-5 w-[84px] mx-auto"
    >
      <img
        src={builtOn}
        alt="Built on NEAR"
        className="absolute inset-0 h-full w-full object-contain dark:hidden"
      />
      <img
        src={builtOnRev}
        alt="Built on NEAR"
        className="absolute inset-0 hidden h-full w-full object-contain dark:block"
      />
    </a>
  );
}

function MobileTabBar({
  wiki,
  isAuthenticated,
  isMember,
  canEdit,
}: {
  wiki: WikiContext | null;
  isAuthenticated: boolean;
  isMember: boolean;
  canEdit: boolean;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 lg:hidden border-t border-border bg-card z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around px-2 py-1">
        <TabItem to="/" icon={Home} label="home" active={isActive("/")} />
        <TabItem to="/explore" icon={Compass} label="explore" active={isActive("/explore")} />
        <TabItem to="/recent" icon={ClipboardList} label="recent" active={isActive("/recent")} />
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="flex flex-col items-center justify-center gap-0.5 p-2 text-muted-foreground hover:text-foreground transition-colors min-w-[48px]"
            >
              <Menu className="w-5 h-5" />
              <span className="text-[10px]">menu</span>
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="!max-w-[300px] p-0 flex flex-col">
            <SheetHeader className="!px-4 !pt-4 !pb-2 shrink-0">
              <SheetTitle className="truncate">{wiki?.name ?? "Menu"}</SheetTitle>
            </SheetHeader>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <WikiSidebar
                wiki={wiki}
                isAuthenticated={isAuthenticated}
                isMember={isMember}
                canEdit={canEdit}
                onNavigate={() => setDrawerOpen(false)}
              />
            </div>
            <div className="shrink-0 px-4 pb-3 pt-2 border-t border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground">
                  wiki.everything.dev
                </span>
                <ThemeToggle className="relative flex items-center justify-center w-6 h-6 text-muted-foreground hover:text-foreground transition-colors" />
              </div>
              <NearBranding />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}

function TabItem({
  to,
  icon: Icon,
  label,
  active,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      preload="intent"
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 p-2 min-w-[56px] rounded-[10px] transition-colors duration-200",
        active ? "text-foreground bg-foreground/10" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
