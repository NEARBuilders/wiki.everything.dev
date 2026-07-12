import { List } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface TocEntry {
  id: string;
  level: number;
  text: string;
}

interface ArticleTocProps {
  content: string;
  className?: string;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function parseHeadings(content: string): TocEntry[] {
  if (!content) return [];
  const lines = content.split(/\r?\n/);
  const entries: TocEntry[] = [];
  let inCodeBlock = false;
  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      if (level >= 1 && level <= 4 && text) {
        entries.push({ id: slugify(text), level, text });
      }
    }
  }
  return entries;
}

export function ArticleToc({ content, className }: ArticleTocProps) {
  const entries = useMemo(() => parseHeadings(content), [content]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (entries.length === 0) return;
    const observer = new IntersectionObserver(
      (records) => {
        for (const rec of records) {
          if (rec.isIntersecting) {
            setActiveId(rec.target.id);
          }
        }
      },
      { rootMargin: "-64px 0px -70% 0px", threshold: 0.1 },
    );
    for (const entry of entries) {
      const el = document.getElementById(entry.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <aside className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        <List className="h-3 w-3" />
        On this page
      </div>
      <nav className="space-y-1">
        {entries.map((entry) => {
          const isActive = entry.id === activeId;
          return (
            <a
              key={`${entry.id}-${entry.level}`}
              href={`#${entry.id}`}
              className={cn(
                "block truncate text-xs leading-relaxed transition-colors hover:text-foreground",
                isActive
                  ? "text-foreground font-medium border-l-2 border-foreground pl-2"
                  : "text-muted-foreground border-l-2 border-transparent pl-2",
              )}
              style={{ paddingLeft: `${(entry.level - 1) * 12 + 8}px` }}
            >
              {entry.text}
            </a>
          );
        })}
      </nav>
    </aside>
  );
}
