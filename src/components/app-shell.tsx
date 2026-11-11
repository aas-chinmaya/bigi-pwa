"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, FileText, LogOut, Mail, MapPin, Menu, Phone, Plus, UserRound, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@base-ui/react/dialog";
import type { Business } from "@/lib/business";
import { createClient } from "@/lib/supabase/client";
import { clearAll, getDb } from "@/lib/offline/db";
import { syncPending } from "@/lib/offline/sync";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  business,
  email,
}: {
  children: React.ReactNode;
  business: Business | null;
  email: string;
}) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const displayName = business?.business_name || email || "Account";
  const initials = displayName.trim().slice(0, 1).toUpperCase();
  const profileDetails = [
    { label: "Account email", value: email, icon: Mail },
    { label: "Business email", value: business?.email, icon: Mail },
    { label: "Phone", value: business?.phone, icon: Phone },
    { label: "Address", value: business?.address, icon: MapPin },
    { label: "State", value: business?.state, icon: MapPin },
    { label: "GSTIN", value: business?.gstin, icon: Building2 },
  ];

  async function logout() {
    if (!navigator.onLine) {
      toast.error("Reconnect before logging out so unsynced invoices stay protected.");
      return;
    }
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      try {
        await syncPending();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not sync offline invoices");
        return;
      }
      const unsynced = await getDb().offline
        .where("userId")
        .equals(session.user.id)
        .filter((row) => row.syncStatus !== "synced")
        .count();
      if (unsynced) {
        toast.error("Sync or resolve pending invoices before logging out.");
        return;
      }
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return;
    }
    await clearAll();
    navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_APP_CACHE" });
    toast.success("Logged out");
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/85">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link href="/invoices" className="flex shrink-0 items-center gap-2.5 font-bold tracking-tight text-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-500 text-white shadow-md shadow-primary/20">
              <FileText className="h-[18px] w-[18px]" />
            </span>
            <span className="text-[15px]">Invoice<span className="text-primary">Flow</span></span>
          </Link>
          <nav className="ml-3 hidden h-full items-center gap-1 sm:flex">
            <Link
              href="/invoices"
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                path.startsWith("/invoices") && !path.includes("/new")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              Invoices
            </Link>
            <Link
              href="/business"
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                path.startsWith("/business")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              Business
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-2.5">
            <Link href="/invoices/new" className={buttonVariants({ size: "sm", className: "hidden shadow-sm sm:inline-flex" })}><Plus className="h-4 w-4" /> New invoice</Link>
            <Dialog.Root>
              <Dialog.Trigger
                render={
                  <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-full p-0" aria-label="Open profile">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary ring-1 ring-primary/15">
                      {initials || <UserRound className="h-4 w-4" />}
                    </span>
                  </Button>
                }
              />
              <Dialog.Portal>
                <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] data-[open]:animate-in data-[open]:fade-in-0 data-[closed]:animate-out data-[closed]:fade-out-0" />
                <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-2xl outline-none">
                  <div className="bg-gradient-to-br from-primary/10 via-background to-violet-500/10 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-semibold text-primary-foreground shadow-md">
                          {initials}
                        </span>
                        <div className="min-w-0">
                          <Dialog.Title className="truncate text-lg font-semibold">{displayName}</Dialog.Title>
                          <Dialog.Description className="truncate text-sm text-muted-foreground">
                            Your account and business details
                          </Dialog.Description>
                        </div>
                      </div>
                      <Dialog.Close
                        render={
                          <Button variant="ghost" size="icon" className="-mr-2 -mt-2 shrink-0" aria-label="Close profile">
                            <X className="h-4 w-4" />
                          </Button>
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-1 p-5">
                    {profileDetails.map(({ label, value, icon: Icon }) => (
                      <div key={label} className="flex items-start gap-3 rounded-lg px-2 py-2.5">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-muted-foreground">{label}</div>
                          <div className="break-words text-sm">{value || "Not provided"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col-reverse gap-2 border-t bg-muted/30 p-4 sm:flex-row sm:justify-between">
                    <Button type="button" variant="destructive" onClick={() => { void logout(); }}>
                      <LogOut className="h-4 w-4" /> Log out
                    </Button>
                    <Dialog.Close
                      render={
                        <Link href="/business" className={buttonVariants({ variant: "outline" })}>
                          <Building2 className="h-4 w-4" /> Edit business profile
                        </Link>
                      }
                    />
                  </div>
                </Dialog.Popup>
              </Dialog.Portal>
            </Dialog.Root>
            <button type="button" className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden" onClick={() => setOpen((v) => !v)} aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open}>
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {open && (
          <div className="border-t bg-card px-4 py-3 shadow-sm sm:hidden">
            <Link href="/invoices" className={cn("block rounded-md px-3 py-2 text-sm font-medium", path.startsWith("/invoices") && !path.includes("/new") ? "bg-primary/10 text-primary" : "text-muted-foreground")} onClick={() => setOpen(false)}>Invoices</Link>
            <Link href="/business" className={cn("block rounded-md px-3 py-2 text-sm font-medium", path.startsWith("/business") ? "bg-primary/10 text-primary" : "text-muted-foreground")} onClick={() => setOpen(false)}>Business profile</Link>
            <Link href="/invoices/new" className="mt-2 flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm" onClick={() => setOpen(false)}><Plus className="h-4 w-4" /> New invoice</Link>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-7xl animate-fade-in px-4 py-6 sm:px-6 lg:py-8">{children}</main>
    </div>
  );
}
