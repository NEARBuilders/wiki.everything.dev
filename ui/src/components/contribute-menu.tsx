import { Link } from "@tanstack/react-router";
import { ChevronDown, ClipboardList, Compass, Plus, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ContributeMenuProps {
  canEdit: boolean;
  isMember: boolean;
  hasWiki: boolean;
}

export function ContributeMenu({ canEdit, isMember, hasWiki }: ContributeMenuProps) {
  if (!hasWiki) {
    return (
      <Link
        to="/wiki/new"
        preload="intent"
        className="h-10 px-3 sm:px-4 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold border-2 border-outset border-border-strong bg-foreground text-background shadow-sm hover:shadow-md active:border-inset active:shadow-none transition-all duration-200 ease-out rounded-[12px]"
      >
        <Sparkles className="h-4 w-4" />
        <span className="hidden sm:inline">start a wiki</span>
        <span className="sm:hidden">new</span>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="h-10 px-3 sm:px-4 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold border-2 border-outset border-border-strong bg-foreground text-background shadow-sm hover:shadow-md active:border-inset active:shadow-none transition-all duration-200 ease-out rounded-[12px] cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">contribute</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Contribute
        </DropdownMenuLabel>
        {canEdit && (
          <DropdownMenuItem asChild>
            <Link to="/w/$slug/edit" params={{ slug: "new" }} className="cursor-pointer">
              <Plus className="h-4 w-4" />
              new article
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link to="/recent" className="cursor-pointer">
            <ClipboardList className="h-4 w-4" />
            recent changes
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/explore" className="cursor-pointer">
            <Compass className="h-4 w-4" />
            explore all pages
          </Link>
        </DropdownMenuItem>
        {isMember && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Manage
            </DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link to="/admin" className="cursor-pointer">
                wiki admin
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
