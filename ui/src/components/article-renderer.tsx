import type { JSX, ReactNode } from "react";

interface ArticleRendererProps {
  content: unknown | null;
}

export function ArticleRenderer({ content }: ArticleRendererProps) {
  if (!content) {
    return (
      <div className="text-muted-foreground text-sm italic">This article has no content yet.</div>
    );
  }

  if (typeof content === "string") {
    try {
      const parsed = JSON.parse(content);
      return <AstRenderer node={parsed} />;
    } catch {
      return <div className="whitespace-pre-wrap text-foreground">{content}</div>;
    }
  }

  if (typeof content === "object" && content !== null) {
    return <AstRenderer node={content as AstNode} />;
  }

  return <div className="text-foreground">{String(content)}</div>;
}

interface AstNode {
  type: string;
  content?: AstNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  attrs?: Record<string, unknown>;
}

function AstRenderer({ node }: { node: AstNode }) {
  switch (node.type) {
    case "doc":
      return (
        <div className="space-y-4">
          {node.content?.map((child, i) => (
            <AstRenderer key={i} node={child} />
          ))}
        </div>
      );

    case "paragraph":
      return (
        <p className="text-foreground leading-relaxed">
          {node.content?.map((child, i) => (
            <AstRenderer key={i} node={child} />
          ))}
        </p>
      );

    case "heading": {
      const level = (node.attrs?.level as number) ?? 1;
      const Tag = `h${Math.min(Math.max(level, 1), 6)}` as keyof JSX.IntrinsicElements;
      const headingClasses: Record<number, string> = {
        1: "text-3xl font-bold tracking-tight",
        2: "text-2xl font-semibold tracking-tight",
        3: "text-xl font-semibold",
        4: "text-lg font-medium",
        5: "text-base font-medium",
        6: "text-sm font-medium text-muted-foreground",
      };
      return (
        <Tag className={headingClasses[level] ?? "text-lg font-semibold"}>
          {node.content?.map((child, i) => (
            <AstRenderer key={i} node={child} />
          ))}
        </Tag>
      );
    }

    case "text":
      return <TextRenderer node={node} />;

    case "bulletList":
      return (
        <ul className="list-disc pl-6 space-y-1 text-foreground">
          {node.content?.map((child, i) => (
            <AstRenderer key={i} node={child} />
          ))}
        </ul>
      );

    case "orderedList":
      return (
        <ol className="list-decimal pl-6 space-y-1 text-foreground">
          {node.content?.map((child, i) => (
            <AstRenderer key={i} node={child} />
          ))}
        </ol>
      );

    case "listItem":
      return (
        <li>
          {node.content?.map((child, i) => (
            <AstRenderer key={i} node={child} />
          ))}
        </li>
      );

    case "codeBlock":
      return (
        <pre className="bg-muted rounded-lg p-4 overflow-x-auto text-sm font-mono text-foreground">
          <code>{node.content?.[0]?.text ?? ""}</code>
        </pre>
      );

    case "blockquote":
      return (
        <blockquote className="border-l-4 border-border pl-4 italic text-muted-foreground">
          {node.content?.map((child, i) => (
            <AstRenderer key={i} node={child} />
          ))}
        </blockquote>
      );

    case "horizontalRule":
      return <hr className="border-border my-6" />;

    case "hardBreak":
      return <br />;

    default:
      return (
        <span className="text-foreground">
          {node.content?.map((child, i) => (
            <AstRenderer key={i} node={child} />
          ))}
        </span>
      );
  }
}

function TextRenderer({ node }: { node: AstNode }) {
  let text: ReactNode = node.text ?? "";

  if (node.marks) {
    for (const mark of node.marks) {
      switch (mark.type) {
        case "bold":
          text = <strong>{text}</strong>;
          break;
        case "italic":
          text = <em>{text}</em>;
          break;
        case "underline":
          text = <span className="underline">{text}</span>;
          break;
        case "strike":
          text = <span className="line-through">{text}</span>;
          break;
        case "code":
          text = (
            <code className="bg-muted rounded px-1 py-0.5 text-sm font-mono text-foreground">
              {text}
            </code>
          );
          break;
        case "link": {
          const href = (mark.attrs?.href as string) ?? "#";
          text = (
            <a
              href={href}
              className="text-primary underline hover:text-primary/80 transition-colors"
            >
              {text}
            </a>
          );
          break;
        }
      }
    }
  }

  return <>{text}</>;
}
