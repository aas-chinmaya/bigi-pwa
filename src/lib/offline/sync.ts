import { getDb } from "./db";
import { createClient, getCurrentUser } from "@/lib/supabase/client";
import { calcInvoice } from "@/lib/gst";

type SyncResult = { synced: number; failed: number };

let activeSync: Promise<SyncResult> | null = null;

export function syncPending(): Promise<SyncResult> {
  if (!activeSync) {
    activeSync = performSync().finally(() => {
      activeSync = null;
    });
  }
  return activeSync;
}

async function performSync(): Promise<SyncResult> {
  const out = { synced: 0, failed: 0 };
  if (typeof navigator !== "undefined" && !navigator.onLine) return out;
  const user = await getCurrentUser();
  if (!user) return out;
  const supabase = createClient();
  const db = getDb();
  const due = await db.offline.where("syncStatus").anyOf(["pending", "failed", "syncing"]).filter((r) => r.userId === user.id).toArray();
  due.sort((a, b) => a.createdAt - b.createdAt);

  for (const rec of due) {
    await db.offline.update(rec.localId, { syncStatus: "syncing" });
    try {
      const p = rec.payload;
      const { data: biz } = await supabase.from("businesses").select("id,state,invoice_prefix").eq("user_id", user.id).maybeSingle();
      if (!biz) throw new Error("Set up business in Settings first");
      const calc = calcInvoice(
        (p.items || []).map((it: any) => ({ quantity: +it.quantity, unitPrice: +it.unit_price, gstRate: +it.gst_rate })),
        biz.state || "",
        p.customer_state || ""
      );
      const status = p.status || "draft";
      const { data: existing, error: lookupError } = await supabase
        .from("invoices")
        .select("id")
        .eq("user_id", user.id)
        .eq("local_uuid", rec.localId)
        .maybeSingle();
      if (lookupError) throw lookupError;
      let invoiceId = existing?.id;
      const invoiceData = {
        user_id: user.id,
        business_id: biz.id,
        local_uuid: rec.localId,
        status,
        customer_name: p.customer_name,
        customer_email: p.customer_email || null,
        customer_phone: p.customer_phone || null,
        customer_address: p.customer_address || null,
        customer_gstin: p.customer_gstin || null,
        customer_state: p.customer_state || null,
        invoice_date: p.invoice_date,
        due_date: p.due_date || null,
        notes: p.notes || null,
        subtotal: calc.subtotal,
        cgst: calc.cgst,
        sgst: calc.sgst,
        igst: calc.igst,
        grand_total: calc.grandTotal,
      };
      if (invoiceId) {
        const { error } = await supabase.from("invoices").update(invoiceData).eq("id", invoiceId).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { data: inv, error } = await supabase.from("invoices").insert({
          ...invoiceData,
          invoice_number: status === "issued" ? `${biz.invoice_prefix || "INV"}-${Date.now().toString().slice(-6)}` : null,
        }).select("id").single();
        if (error) throw error;
        invoiceId = inv.id;
      }
      const items = (p.items || []).map((it: any, i: number) => ({
        invoice_id: invoiceId, position: i, name: it.name, hsn_sac: it.hsn_sac || null, unit: it.unit || "NOS",
        quantity: it.quantity, unit_price: it.unit_price, gst_rate: it.gst_rate,
        taxable: calc.lines[i].taxable, cgst: calc.lines[i].cgst, sgst: calc.lines[i].sgst,
        igst: calc.lines[i].igst, line_total: calc.lines[i].lineTotal,
      }));
      const { error: deleteItemsError } = await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId);
      if (deleteItemsError) throw deleteItemsError;
      if (items.length) {
        const { error: insertItemsError } = await supabase.from("invoice_items").insert(items);
        if (insertItemsError) throw insertItemsError;
      }
      await db.offline.update(rec.localId, { syncStatus: "synced", serverId: invoiceId });
      out.synced++;
    } catch (e: any) {
      await db.offline.update(rec.localId, { syncStatus: "failed", lastError: e?.message || "fail" });
      out.failed++;
      if (!navigator.onLine) break;
    }
  }
  if (typeof window !== "undefined" && (out.synced > 0 || out.failed > 0)) {
    window.dispatchEvent(new Event("if:synced"));
  }
  return out;
}
