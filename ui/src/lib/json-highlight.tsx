import type { ReactNode } from "react";

const patterns: {
  re: RegExp;
  render: (m: string, ...groups: string[]) => ReactNode;
}[] = [
  {
    re: /("(?:[^"\\]|\\.)*")\s*:/,
    render: (_m, k) => <span className="text-background/80">{k}</span>,
  },
  {
    re: /"(?:[^"\\]|\\.)*"/,
    render: (_m, s) => <span className="text-brand-accent">{s}</span>,
  },
  {
    re: /\b(true|false)\b/,
    render: (_m, b) => <span className="text-yellow-300">{b}</span>,
  },
  {
    re: /\bnull\b/,
    render: () => <span className="text-muted-foreground">null</span>,
  },
  {
    re: /(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/,
    render: (_m, n) => <span className="text-blue-300">{n}</span>,
  },
];

export function highlightJson(json: string): ReactNode {
  const lines = json.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <div key={i} className="flex">
          <span className="text-background/30 mr-4 select-none text-right w-8 shrink-0">
            {i + 1}
          </span>
          <span>{syntaxHighlightLine(line)}</span>
        </div>
      ))}
    </>
  );
}

function syntaxHighlightLine(line: string): ReactNode {
  const tokens: ReactNode[] = [];
  let remaining = line;
  let key = 0;

  let matched = false;
  for (const { re, render } of patterns) {
    const match = remaining.match(re);
    if (match && match.index === 0) {
      tokens.push(<span key={key++}>{render(match[0], ...match.slice(1))}</span>);
      remaining = remaining.slice(match[0].length);
      matched = true;
      break;
    }
  }

  if (!matched) {
    if (remaining.length === 0) {
      return <span key="rest" />;
    }
    tokens.push(<span key={key++}>{remaining[0]}</span>);
    remaining = remaining.slice(1);
  }

  if (remaining.length > 0) {
    return (
      <>
        {tokens}
        {syntaxHighlightLine(remaining)}
      </>
    );
  }

  return <>{tokens}</>;
}
