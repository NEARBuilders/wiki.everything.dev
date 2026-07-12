import { Link, useRouterState } from "@tanstack/react-router";
import { ClipboardList, Compass, Home, LogIn, Plus, Settings, Shield, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface WikiSidebarProps {
  wiki: {
    id: string;
    subdomain: string;
    accountId: string;
    orgId: string;
    name: string;
  } | null;
  isAuthenticated: boolean;
  isMember: boolean;
  canEdit: boolean;
  onNavigate?: () => void;
  className?: string;
}

interface NavItem {
  label: string;
  to:
    | "/"
    | "/explore"
    | "/recent"
    | "/w/$slug/edit"
    | "/admin"
    | "/home"
    | "/organizations"
    | "/settings"
    | "/login"
    | "/wiki/new"
    | "/about";
  icon: React.ComponentType<{ className?: string }>;
  params?: Record<string, string>;
}

export function WikiSidebar({
  wiki,
  isAuthenticated,
  isMember,
  canEdit,
  onNavigate,
  className,
}: WikiSidebarProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const discover: NavItem[] = [
    { label: "Main page", to: "/", icon: Home },
    { label: "Recent changes", to: "/recent", icon: ClipboardList },
    { label: "Explore all pages", to: "/explore", icon: Compass },
  ];

  const contribute: NavItem[] = [];
  if (canEdit) {
    contribute.push({
      label: "New article",
      to: "/w/$slug/edit",
      icon: Plus,
      params: { slug: "new" },
    });
  }
  if (isMember) {
    contribute.push({ label: "Wiki admin", to: "/admin", icon: Shield });
  }

  const account: NavItem[] = isAuthenticated
    ? [
        { label: "Workspace", to: "/home", icon: Home },
        { label: "Organizations", to: "/organizations", icon: Users },
        { label: "Settings", to: "/settings", icon: Settings },
      ]
    : [{ label: "Sign in", to: "/login", icon: LogIn }];

  const isActive = (item: NavItem) => {
    if (item.to === "/") return pathname === "/";
    return pathname === item.to || pathname.startsWith(`${item.to}/`);
  };

  return (
    <div className={cn("flex flex-col gap-6 py-4 h-full min-h-full", className)}>
      {wiki && (
        <div className="px-4">
          <div className="border-2 border-outset border-border-strong bg-card shadow-sm rounded-[12px] p-3 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Current wiki
            </div>
            <div className="text-sm font-semibold text-foreground truncate">{wiki.name}</div>
            <div className="text-[11px] font-mono text-muted-foreground truncate">
              {wiki.subdomain}
            </div>
          </div>
        </div>
      )}

      <NavSection title="Discover" items={discover} isActive={isActive} onNavigate={onNavigate} />
      {contribute.length > 0 && (
        <NavSection
          title="Contribute"
          items={contribute}
          isActive={isActive}
          onNavigate={onNavigate}
        />
      )}
      <NavSection title="Account" items={account} isActive={isActive} onNavigate={onNavigate} />

      {!wiki && isAuthenticated && (
        <div className="px-4">
          <Link
            to="/wiki/new"
            onClick={onNavigate}
            className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold border-2 border-outset border-border-strong bg-foreground text-background shadow-sm hover:shadow-md active:border-inset active:shadow-none transition-all duration-200 ease-out rounded-[12px]"
          >
            <Plus className="h-4 w-4" />
            start a wiki
          </Link>
        </div>
      )}
    </div>
  );
}

function NavSection({
  title,
  items,
  isActive,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  isActive: (item: NavItem) => boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-1.5 px-2">
      <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <nav className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          const linkProps = item.params ? { to: item.to, params: item.params } : { to: item.to };
          return (
            <Link
              key={`${item.label}-${item.to}`}
              {...(linkProps as { to: string })}
              preload="intent"
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-[8px] transition-colors",
                active
                  ? "bg-foreground text-background font-semibold"
                  : "text-foreground hover:bg-muted",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
