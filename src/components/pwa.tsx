"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { CloudOff, Download, RefreshCw, X } from "lucide-react";
import { syncPending } from "@/lib/offline/sync";
import { Button } from "@/components/ui/button";

export function PWA() {
  const [online, setOnline] = useState(true);
  const [install, setInstall] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);

  const run = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    try {
      const r = await syncPending();
      if (r.synced) toast.success(`${r.synced} offline invoice(s) synced`);
      if (r.failed) toast.error(`${r.failed} offline invoice(s) could not sync and will retry`);
    } catch (error) {
      toast.error(error instanceof Error ? `Could not sync offline invoices: ${error.message}` : "Could not sync offline invoices");
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => { setOnline(true); toast.success("Back online"); void run(); };
    const off = () => { setOnline(false); toast.message("Offline — invoices save on this device"); };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, [run]);

  useEffect(() => { if (online) void run(); }, [online, run]);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed", error);
      toast.error("Offline support could not start on this device");
    });
  }, []);

  useEffect(() => {
    const h = (e: any) => { e.preventDefault(); setInstall(e); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  return (
    <>
      {!online && (
        <div className="flex items-center justify-center gap-2 bg-amber-500 px-3 py-1.5 text-sm font-medium text-white">
          <CloudOff className="h-4 w-4" /> Offline — same app, data syncs later
        </div>
      )}
      {online && syncing && (
        <div className="flex items-center justify-center gap-2 bg-primary px-3 py-1 text-xs text-white">
          <RefreshCw className="h-3 w-3 animate-spin" /> Syncing…
        </div>
      )}
      {install && (
        <div className="fixed bottom-4 right-4 z-50 flex max-w-xs items-center gap-3 rounded-2xl border bg-card p-3 shadow-xl">
          <Download className="h-5 w-5 text-primary" />
          <div className="text-sm"><b>Install app</b><div className="text-xs text-muted-foreground">Works offline</div></div>
          <Button size="sm" onClick={async () => { install.prompt(); await install.userChoice; setInstall(null); }}>Install</Button>
          <button onClick={() => setInstall(null)}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
      )}
    </>
  );
}
