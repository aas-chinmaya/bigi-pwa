"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { FilePlus2, FileText } from "lucide-react";
import { createClient, getCurrentUser } from "@/lib/supabase/client";
import { getDb, getCache, setCache } from "@/lib/offline/db";
import { inr, fmtDate } from "@/lib/utils";
import { calcInvoice } from "@/lib/gst";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function offlineRow(rec: any, business: any) {
  const payload = rec.payload;
  const calc = calcInvoice(
    (payload.items || []).map((item: any) => ({
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unit_price) || 0,
      gstRate: Number(item.gst_rate) || 0,
    })),
    business?.state || "",
    payload.customer_state || ""
  );
  return {
    id: rec.localId,
    invoice_number: payload.status === "issued" ? "Pending issue" : "Offline draft",
    customer_name: payload.customer_name,
    invoice_date: payload.invoice_date,
    grand_total: calc.grandTotal,
    status: rec.syncStatus === "failed" ? "sync failed" : "pending sync",
  };
}

export default function InvoicesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const refreshAfterSync = async () => {
      try {
        const user = await getCurrentUser();
        if (!user || !navigator.onLine) return;
        const [result, off, business] = await Promise.all([
          createClient()
            .from("invoices")
            .select("id,invoice_number,customer_name,customer_email,customer_phone,customer_address,customer_gstin,customer_state,invoice_date,grand_total,status")
            .eq("user_id", user.id)
            .order("invoice_date", { ascending: false })
            .limit(100),
          getDb().offline.where("syncStatus").anyOf(["pending", "failed", "syncing"]).filter((r) => r.userId === user.id).toArray(),
          getCache(user.id, "business"),
        ]);
        if (result.error) throw result.error;
        await setCache(user.id, "invoices", result.data || []);
        setPending(off);
        setRows([...(result.data || []), ...off.map((rec) => offlineRow(rec, business))]);
      } catch (error) {
        console.error("Could not refresh invoices after sync", error);
      }
    };
    window.addEventListener("if:synced", refreshAfterSync);
    (async () => {
      try {
        const user = await getCurrentUser();
        if (!user) { setLoading(false); return; }
        const supabase = createClient();
        const off = await getDb().offline.where("syncStatus").anyOf(["pending", "failed", "syncing"]).filter((r) => r.userId === user.id).toArray();
        setPending(off);
        const cached = (await getCache(user.id, "invoices")) || [];
        if (!navigator.onLine) {
          const business = await getCache(user.id, "business");
          setRows([...off.map((rec) => offlineRow(rec, business)), ...cached]);
          return;
        }

        const { data, error } = await supabase
          .from("invoices")
          .select("id,invoice_number,customer_name,customer_email,customer_phone,customer_address,customer_gstin,customer_state,invoice_date,grand_total,status")
          .eq("user_id", user.id)
          .order("invoice_date", { ascending: false })
          .limit(100);
        if (error) throw error;
        await setCache(user.id, "invoices", data || []);
        const business = await getCache(user.id, "business");
        setRows([...(data || []), ...off.map((rec) => offlineRow(rec, business))]);
      } catch (error) {
        console.error("Could not load invoices", error);
        const user = await getCurrentUser();
        if (user) {
          const [cached, business, off] = await Promise.all([
            getCache(user.id, "invoices"),
            getCache(user.id, "business"),
            getDb().offline.where("syncStatus").anyOf(["pending", "failed", "syncing"]).filter((r) => r.userId === user.id).toArray(),
          ]);
          setRows([...off.map((rec) => offlineRow(rec, business)), ...(cached || [])]);
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => window.removeEventListener("if:synced", refreshAfterSync);
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-sm text-muted-foreground">Create, view & download PDF</p>
        </div>
        <Link href="/invoices/new" className={buttonVariants()}><FilePlus2 className="h-4 w-4" /> New invoice</Link>
      </div>

      {pending.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <b>{pending.length}</b> offline invoice(s) waiting to sync
        </Card>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="space-y-2 p-6">
            <div className="h-8 animate-pulse rounded bg-muted" />
            <div className="h-8 animate-pulse rounded bg-muted" />
          </div>
        ) : !rows.length ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <FileText className="h-10 w-10 opacity-40" />
            <p className="text-sm">No invoices yet</p>
            <Link href="/invoices/new" className={buttonVariants({ size: "sm", className: "mt-2" })}>Create first invoice</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Invoice</th>
                  <th className="px-3 py-3 font-medium">Customer</th>
                  <th className="hidden px-3 py-3 font-medium sm:table-cell">Date</th>
                  <th className="px-3 py-3 font-medium text-right">Total</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/invoices/${r.id}`} className="text-primary hover:underline">
                        {r.invoice_number || "Draft"}
                      </Link>
                    </td>
                    <td className="max-w-[140px] truncate px-3 py-3">{r.customer_name}</td>
                    <td className="hidden px-3 py-3 text-muted-foreground sm:table-cell">{fmtDate(r.invoice_date)}</td>
                    <td className="px-3 py-3 text-right tabular-nums font-medium">{inr(r.grand_total)}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
