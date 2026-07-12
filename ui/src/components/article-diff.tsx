import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface ArticleDiffProps {
  before: string;
  after: string;
  className?: string;
}

type DiffOp = { type: "eq" | "add" | "del"; value: string };

function computeLcs(a: string[], b: string[]): DiffOp[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: "eq", value: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: "del", value: a[i] });
      i++;
    } else {
      ops.push({ type: "add", value: b[j] });
      j++;
    }
  }
  while (i < n) ops.push({ type: "del", value: a[i++] });
  while (j < m) ops.push({ type: "add", value: b[j++] });
  return ops;
}

export function ArticleDiff({ before, after, className }: ArticleDiffProps) {
  const [collapsed, setCollapsed] = useState(true);

  const ops = useMemo(() => {
    const beforeLines = before.split(/\r?\n/);
    const afterLines = after.split(/\r?\n/);
    return computeLcs(beforeLines, afterLines);
  }, [before, after]);

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    for (const op of ops) {
      if (op.type === "add") added++;
      else if (op.type === "del") removed++;
    }
    return { added, removed };
  }, [ops]);

  const visibleOps = useMemo(() => {
    if (!collapsed) return ops;
    return collapseUnchangedRuns(ops, 2);
  }, [ops, collapsed]);

  return (
    <div
      className={cn(
        "border-2 border-inset border-border-strong bg-card rounded-[12px] overflow-hidden",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-border bg-muted">
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-green-600 dark:text-green-400">+{stats.added}</span>
          <span className="text-destructive">−{stats.removed}</span>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? "show full context" : "collapse unchanged"}
        </button>
      </div>
      <div className="max-h-[60vh] overflow-y-auto overflow-x-auto font-mono text-xs leading-relaxed">
        {visibleOps.map((op, i) => {
          if (op.type === "eq" && op.value === "\u2026") {
            return (
              <div
                key={i}
                className="px-3 py-1 text-center text-muted-foreground bg-muted/50 border-y border-border"
              >
                &middot; &middot; &middot;
              </div>
            );
          }
          const bg =
            op.type === "add"
              ? "bg-green-500/10 border-l-2 border-green-500"
              : op.type === "del"
                ? "bg-destructive/10 border-l-2 border-destructive"
                : "border-l-2 border-transparent";
          const prefix = op.type === "add" ? "+" : op.type === "del" ? "−" : " ";
          return (
            <div key={i} className={cn("flex px-3 py-0.5 whitespace-pre", bg)}>
              <span className="w-4 shrink-0 text-muted-foreground select-none">{prefix}</span>
              <span className="text-foreground">{op.value || " "}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function collapseUnchangedRuns(ops: DiffOp[], keep: number): DiffOp[] {
  const out: DiffOp[] = [];
  let i = 0;
  while (i < ops.length) {
    if (ops[i].type === "eq") {
      let j = i;
      while (j < ops.length && ops[j].type === "eq") j++;
      const run = ops.slice(i, j);
      if (run.length <= keep * 2 + 1) {
        out.push(...run);
      } else {
        const isFirst = i === 0;
        const isLast = j === ops.length;
        if (!isFirst) out.push(...run.slice(0, keep));
        out.push({ type: "eq", value: "\u2026" });
        if (!isLast) out.push(...run.slice(run.length - keep));
      }
      i = j;
    } else {
      out.push(ops[i]);
      i++;
    }
  }
  return out;
}
