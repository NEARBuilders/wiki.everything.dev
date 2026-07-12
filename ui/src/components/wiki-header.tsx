import { Link } from "@tanstack/react-router";
import { ArticleSearch } from "@/components/article-search";
import { BrandElement } from "@/components/brand-element";
import { ContributeMenu } from "@/components/contribute-menu";
import { UserNav } from "@/components/user-nav";
import { cn } from "@/lib/utils";

interface WikiHeaderProps {
  appName: string;
  wiki: {
    id: string;
    subdomain: string;
    accountId: string;
    orgId: string;
    name: string;
    createdAt: string;
  } | null;
  isAuthenticated: boolean;
  isMember: boolean;
  canEdit: boolean;
  className?: string;
}

export function WikiHeader({
  appName,
  wiki,
  isAuthenticated,
  isMember,
  canEdit,
  className,
}: WikiHeaderProps) {
  return (
    <header
      className={cn(
        "shrink-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-5 h-14 bg-card border-b border-border",
        className,
      )}
    >
      <Link to="/" preload="intent" aria-label={`${appName} home`} className="min-w-0 shrink-0">
        <BrandElement appName={appName} />
      </Link>

      {wiki && (
        <div className="hidden sm:flex flex-col min-w-0 leading-tight">
          <span className="text-sm font-bold text-foreground truncate">{wiki.name}</span>
          <span className="text-[10px] font-mono text-muted-foreground truncate">
            {wiki.subdomain}
          </span>
        </div>
      )}

      <div className="flex-1 flex justify-center px-1 sm:px-4 min-w-0">
        <div className="w-full max-w-lg hidden md:block">
          <ArticleSearch wikiId={wiki?.id} />
        </div>
        <div className="md:hidden ml-auto">
          <ArticleSearch wikiId={wiki?.id} variant="trigger" />
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {wiki || isAuthenticated ? (
          <ContributeMenu canEdit={canEdit} isMember={isMember} hasWiki={!!wiki} />
        ) : null}
        <UserNav />
      </div>
    </header>
  );
}
