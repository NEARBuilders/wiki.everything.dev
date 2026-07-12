import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { FileText, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApiClient } from "@/app";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface ArticleSearchProps {
  wikiId: string | undefined;
  variant?: "inline" | "trigger";
  placeholder?: string;
  className?: string;
}

export function ArticleSearch({
  wikiId,
  variant = "inline",
  placeholder = "Search articles...",
  className,
}: ArticleSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (variant === "trigger") {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label="Search"
            className={cn(
              "flex items-center justify-center w-10 h-10 border-2 border-outset border-border-strong bg-card text-foreground shadow-sm transition-all duration-200 ease-out hover:shadow-md hover:bg-muted active:border-inset active:shadow-none rounded-[12px]",
              className,
            )}
          >
            <Search className="h-4 w-4" />
          </button>
        </SheetTrigger>
        <SheetContent side="top" className="!max-h-[85svh]">
          <SheetHeader>
            <SheetTitle>Search</SheetTitle>
          </SheetHeader>
          <SearchPanel
            wikiId={wikiId}
            query={query}
            onQueryChange={setQuery}
            onSelect={() => setOpen(false)}
            inputRef={inputRef}
            placeholder={placeholder}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <InlineSearch
      wikiId={wikiId}
      query={query}
      onQueryChange={setQuery}
      placeholder={placeholder}
      className={className}
    />
  );
}

function InlineSearch({
  wikiId,
  query,
  onQueryChange,
  placeholder,
  className,
}: {
  wikiId: string | undefined;
  query: string;
  onQueryChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const showResults = focused && query.trim().length > 0;

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          placeholder={placeholder}
          className="pl-9 h-10"
        />
      </div>
      {showResults && (
        <div className="absolute left-0 right-0 top-full mt-2 z-40 border-2 border-outset border-border-strong bg-card shadow-md rounded-[12px] max-h-[60vh] overflow-y-auto">
          <SearchResults wikiId={wikiId} query={query} onSelect={() => onQueryChange("")} />
        </div>
      )}
    </div>
  );
}

function SearchPanel({
  wikiId,
  query,
  onQueryChange,
  onSelect,
  inputRef,
  placeholder,
}: {
  wikiId: string | undefined;
  query: string;
  onQueryChange: (v: string) => void;
  onSelect: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  placeholder: string;
}) {
  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="relative px-5 pb-3">
        <Search className="pointer-events-none absolute left-8 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="pl-9 h-11 text-base"
        />
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-5">
        <SearchResults wikiId={wikiId} query={query} onSelect={onSelect} />
      </div>
    </div>
  );
}

function SearchResults({
  wikiId,
  query,
  onSelect,
}: {
  wikiId: string | undefined;
  query: string;
  onSelect: () => void;
}) {
  const apiClient = useApiClient();
  const trimmed = query.trim();

  const searchQuery = useQuery({
    queryKey: ["articles", "search", wikiId, trimmed],
    queryFn: async () => {
      if (!wikiId || !trimmed) return { data: [], meta: { hasMore: false, nextCursor: null } };
      return apiClient.searchArticles({ wikiId, q: trimmed, limit: 25 });
    },
    enabled: !!wikiId && trimmed.length > 0,
    staleTime: 30_000,
  });

  const hits = searchQuery.data?.data ?? [];
  const hasMore = searchQuery.data?.meta?.hasMore ?? false;
  const loading = searchQuery.isLoading || searchQuery.isFetching;

  if (loading) {
    return <div className="p-4 text-xs text-muted-foreground">Searching...</div>;
  }
  if (hits.length === 0 && trimmed.length > 0) {
    return (
      <div className="p-4 text-xs text-muted-foreground">No matches for &quot;{trimmed}&quot;.</div>
    );
  }
  if (hits.length === 0) {
    return <div className="p-4 text-xs text-muted-foreground">Start typing to search.</div>;
  }

  return (
    <div className="divide-y divide-border">
      {hits.map((hit) => (
        <Link
          key={hit.id}
          to="/w/$slug"
          params={{ slug: hit.slug }}
          preload="intent"
          onClick={onSelect}
          className="flex items-start gap-3 px-3 py-2.5 hover:bg-muted transition-colors"
        >
          <FileText className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground truncate">{hit.title}</div>
            <div className="text-[11px] font-mono text-muted-foreground truncate">/{hit.slug}</div>
          </div>
        </Link>
      ))}
      {hasMore && (
        <div className="py-3 text-center">
          <span className="text-xs text-muted-foreground">
            More results available — refine your search.
          </span>
        </div>
      )}
    </div>
  );
}
