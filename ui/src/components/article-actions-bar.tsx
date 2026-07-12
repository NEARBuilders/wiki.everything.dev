import { Link } from "@tanstack/react-router";
import { Edit, History, Link as LinkIcon, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ArticleActionsBarProps {
  slug: string;
  title: string;
  canEdit: boolean;
  className?: string;
}

export function ArticleActionsBar({ slug, title, canEdit, className }: ArticleActionsBarProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 border-2 border-outset border-border-strong bg-card p-1 rounded-[12px] shadow-sm",
        className,
      )}
    >
      <ActionButton onClick={handleShare} label={copied ? "copied!" : "share"}>
        {copied ? <LinkIcon className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">{copied ? "copied" : "share"}</span>
      </ActionButton>
      <Link
        to="/w/$slug/history"
        params={{ slug }}
        preload="intent"
        className="inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
      >
        <History className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">history</span>
      </Link>
      {canEdit && (
        <Link
          to="/w/$slug/edit"
          params={{ slug }}
          preload="intent"
          className="inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-opacity"
        >
          <Edit className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">edit</span>
        </Link>
      )}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
    >
      {children}
    </button>
  );
}
