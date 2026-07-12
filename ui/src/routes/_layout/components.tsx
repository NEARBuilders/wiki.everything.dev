import { createFileRoute } from "@tanstack/react-router";
import { Info, Plus, Settings } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/_layout/components")({
  head: () => ({
    meta: [{ title: "Components | Wiki" }],
  }),
  component: ComponentsPage,
});

function ComponentsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <PageContainer variant="default">
      <div className="space-y-10">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Components</h1>
          <p className="text-sm text-muted-foreground">
            UI component library previews. Navigate here to see available building blocks.
          </p>
        </div>

        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="default">Primary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon">
              <Plus className="h-4 w-4" />
            </Button>
            <Button size="icon-sm">
              <Settings className="h-3 w-3" />
            </Button>
            <Button size="icon-lg">
              <Info className="h-5 w-5" />
            </Button>
          </div>
        </Section>

        <Section title="Badges">
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </div>
        </Section>

        <Section title="Cards">
          <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>Card title</CardTitle>
                <CardDescription>A description of what this card contains.</CardDescription>
              </CardHeader>
              <CardContent>Content area for the main card body.</CardContent>
              <CardFooter>
                <Button variant="outline" size="sm">
                  Action
                </Button>
              </CardFooter>
            </Card>
            <Card className="p-6 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Simple card
              </div>
              <div className="text-sm font-semibold text-foreground">No header/footer wrappers</div>
              <div className="text-[11px] text-muted-foreground">Just a raw card with padding.</div>
            </Card>
          </div>
        </Section>

        <Section title="Form controls">
          <div className="grid gap-6 max-w-md">
            <div className="space-y-1.5">
              <Label htmlFor="demo-input">Text input</Label>
              <Input id="demo-input" placeholder="Type something..." />
            </div>
            <div className="space-y-1.5">
              <Label>Select</Label>
              <Select>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a">Option A</SelectItem>
                  <SelectItem value="b">Option B</SelectItem>
                  <SelectItem value="c">Option C</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Checkbox</Label>
              <div className="flex items-center gap-2">
                <Checkbox id="demo-check" />
                <Label htmlFor="demo-check" className="font-normal text-muted-foreground">
                  I agree to the terms
                </Label>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Radio group</Label>
              <RadioGroup defaultValue="one">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="one" id="r1" />
                  <Label htmlFor="r1" className="font-normal text-muted-foreground">
                    Option one
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="two" id="r2" />
                  <Label htmlFor="r2" className="font-normal text-muted-foreground">
                    Option two
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </Section>

        <Section title="Overlays">
          <div className="flex flex-wrap items-center gap-3">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Open dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dialog title</DialogTitle>
                  <DialogDescription>
                    A modal dialog with a description, actions, and a close button.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setDialogOpen(false)}>Confirm</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline">Open sheet</Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Sheet title</SheetTitle>
                  <SheetDescription>A slide-in panel from the right side.</SheetDescription>
                </SheetHeader>
                <div className="py-4 text-sm text-muted-foreground">Sheet content area.</div>
              </SheetContent>
            </Sheet>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Dropdown menu</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuItem>Billing</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon-sm">
                  <Info className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tooltip text here</TooltipContent>
            </Tooltip>
          </div>
        </Section>

        <Section title="Tabs">
          <Tabs defaultValue="one" className="max-w-md">
            <TabsList className="w-full">
              <TabsTrigger value="one" className="flex-1">
                Account
              </TabsTrigger>
              <TabsTrigger value="two" className="flex-1">
                Security
              </TabsTrigger>
              <TabsTrigger value="three" className="flex-1">
                Billing
              </TabsTrigger>
            </TabsList>
            <TabsContent value="one" className="p-4 text-sm text-muted-foreground">
              Account settings content.
            </TabsContent>
            <TabsContent value="two" className="p-4 text-sm text-muted-foreground">
              Security settings content.
            </TabsContent>
            <TabsContent value="three" className="p-4 text-sm text-muted-foreground">
              Billing settings content.
            </TabsContent>
          </Tabs>
        </Section>

        <Section title="Table">
          <div className="max-w-xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Alice</TableCell>
                  <TableCell>Admin</TableCell>
                  <TableCell>
                    <Badge>Active</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Bob</TableCell>
                  <TableCell>Editor</TableCell>
                  <TableCell>
                    <Badge variant="secondary">Inactive</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Carol</TableCell>
                  <TableCell>Viewer</TableCell>
                  <TableCell>
                    <Badge variant="outline">Pending</Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </Section>

        <Section title="Skeleton">
          <div className="flex items-center space-x-4 max-w-sm">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        </Section>

        <Separator />

        <Section title="Toasts">
          <p className="text-sm text-muted-foreground mb-4">
            Click a button to preview toast variants. Colors match the brand tokens from{" "}
            <code className="text-[11px] bg-muted px-1 py-0.5 rounded-[4px]">styles.css</code>.
          </p>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="sm" onClick={() => toast("Plain toast message")}>
                Plain
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.success("Article saved successfully")}
              >
                Success
              </Button>
              <Button variant="outline" size="sm" onClick={() => toast.info("New version available")}>
                Info
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.warning("Unsaved changes will be lost")}
              >
                Warning
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.error("Failed to save article")}
              >
                Error
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const id = toast.loading("Saving...");
                  setTimeout(() => toast.success("Saved!", { id }), 2000);
                }}
              >
                Loading
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  toast.success("Article saved", {
                    action: { label: "Undo", onClick: () => toast.info("Undone") },
                  })
                }
              >
                + Action
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  toast.error("Delete article?", {
                    action: { label: "Delete", onClick: () => toast.success("Deleted") },
                    cancel: { label: "Cancel", onClick: () => {} },
                  })
                }
              >
                + Action + Cancel
              </Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  toast.success("Article saved successfully", {
                    description: "Your changes have been synced across all devices.",
                  })
                }
              >
                Success + desc
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  toast.info("New version available", {
                    description: "Version 2.4.0 includes performance improvements and bug fixes.",
                  })
                }
              >
                Info + desc
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  toast.warning("Unsaved changes will be lost", {
                    description: "You have 3 pending edits that haven't been saved yet.",
                  })
                }
              >
                Warning + desc
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  toast.error("Failed to save article", {
                    description: "The API is currently unavailable. Please try again later.",
                  })
                }
              >
                Error + desc
              </Button>
            </div>
          </div>
        </Section>
      </div>
    </PageContainer>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
      {children}
    </section>
  );
}
