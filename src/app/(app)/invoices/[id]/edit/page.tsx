"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { createClient, getCurrentUser } from "@/lib/supabase/client";
import { loadBusiness } from "@/lib/business";
import { calcInvoice } from "@/lib/gst";
import { todayStr, inr } from "@/lib/utils";
import { getCache, getDb, setCache } from "@/lib/offline/db";
import { getCustomerOptions, getItemOptions } from "@/lib/invoice-options";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Line = { name: string; quantity: string; unit_price: string; gst_rate: string; hsn_sac: string; unit: string };

export default function EditInvoicePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [biz, setBiz] = useState<any>(null);
  const [localOnly, setLocalOnly] = useState(false);
  const [customers, setCustomers] = useState<{ name: string; email: string; phone: string; address: string; gstin: string; state: string }[]>([]);
  const [itemOptions, setItemOptions] = useState(getItemOptions());
  const [status, setStatus] = useState("draft");
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "", address: "", gstin: "", state: "" });
  const [invoiceDate, setInvoiceDate] = useState(todayStr());
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Line[]>([{ name: "", quantity: "1", unit_price: "0", gst_rate: "18", hsn_sac: "", unit: "NOS" }]);

  useEffect(() => {
    (async () => {
      try {
      const user = await getCurrentUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const supabase = createClient();
      const b = await loadBusiness(user.id);
      setBiz(b);
      const queued = await getDb().offline.get(id);
      if (queued && queued.syncStatus !== "synced") {
        setLocalOnly(true);
        const payload = queued.payload;
        setStatus(payload.status || "draft");
        setCustomer({
          name: payload.customer_name || "",
          email: payload.customer_email || "",
          phone: payload.customer_phone || "",
          address: payload.customer_address || "",
          gstin: payload.customer_gstin || "",
          state: payload.customer_state || "",
        });
        setInvoiceDate(payload.invoice_date || todayStr());
        setDueDate(payload.due_date || "");
        setNotes(payload.notes || "");
        setItems((payload.items || []).map((item: any) => ({
          name: item.name, quantity: String(item.quantity), unit_price: String(item.unit_price),
          gst_rate: String(item.gst_rate), hsn_sac: item.hsn_sac || "", unit: item.unit || "NOS",
        })));
        const cachedInvoices = await getCache(user.id, "invoices");
        setItemOptions(getItemOptions(await getCache(user.id, "items") || []));
        setCustomers(getCustomerOptions([
          ...(cachedInvoices || []),
          {
            customer_name: payload.customer_name,
            customer_email: payload.customer_email,
            customer_phone: payload.customer_phone,
            customer_address: payload.customer_address,
            customer_gstin: payload.customer_gstin,
            customer_state: payload.customer_state,
          },
        ]));
        setBooting(false);
        return;
      }
      if (!navigator.onLine) {
        toast.error("Editing requires online connection");
        router.replace(`/invoices/${id}`);
        return;
      }
      const { data: inv } = await supabase.from("invoices").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
      if (!inv) { toast.error("Not found"); router.replace("/invoices"); return; }
      setStatus(inv.status);
      setCustomer({
        name: inv.customer_name || "",
        email: inv.customer_email || "",
        phone: inv.customer_phone || "",
        address: inv.customer_address || "",
        gstin: inv.customer_gstin || "",
        state: inv.customer_state || "",
      });
      const { data: previousCustomers, error: previousCustomersError } = await supabase
        .from("invoices")
        .select("customer_name,customer_email,customer_phone,customer_address,customer_gstin,customer_state")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (previousCustomersError) console.error("Could not load previous customers", previousCustomersError);
      setCustomers(getCustomerOptions([...(previousCustomers || []), inv]));
      if (!previousCustomersError) await setCache(user.id, "customers", previousCustomers || []);
      const { data: previousItems, error: previousItemsError } = await supabase
        .from("invoice_items")
        .select("name,unit_price,gst_rate,hsn_sac,unit,invoices!inner(user_id)")
        .eq("invoices.user_id", user.id)
        .limit(200);
      if (previousItemsError) console.error("Could not load previous items", previousItemsError);
      else {
        setItemOptions(getItemOptions(previousItems || []));
        await setCache(user.id, "items", previousItems || []);
      }
      setInvoiceDate(inv.invoice_date);
      setDueDate(inv.due_date || "");
      setNotes(inv.notes || "");
      const { data: its } = await supabase.from("invoice_items").select("*").eq("invoice_id", id).order("position");
      if (its?.length) {
        setItems(its.map((it) => ({
          name: it.name,
          quantity: String(it.quantity),
          unit_price: String(it.unit_price),
          gst_rate: String(it.gst_rate),
          hsn_sac: it.hsn_sac || "",
          unit: it.unit || "NOS",
        })));
      }
      setBooting(false);
      } catch (error) {
        console.error("Could not load invoice for editing", error);
        toast.error("Could not load this invoice. Reconnect and try again.");
        setBooting(false);
      }
    })();
  }, [id, router]);

  const calc = useMemo(
    () => calcInvoice(
      items.map((it) => ({ quantity: +it.quantity || 0, unitPrice: +it.unit_price || 0, gstRate: +it.gst_rate || 0 })),
      biz?.state || "",
      customer.state || ""
    ),
    [items, biz, customer.state]
  );

  async function save() {
    if (!customer.name.trim()) { toast.error("Customer name required"); return; }
    setLoading(true);
    const supabase = createClient();
    let user;
    try {
      user = await getCurrentUser();
    } catch (error) {
      console.error("Could not restore the saved session", error);
      toast.error("Could not restore your sign-in. Please reconnect and try again.");
      setLoading(false);
      return;
    }
    if (!user) {
      toast.error("Sign in required");
      setLoading(false);
      return;
    }
    const payload = {
      status,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      customer_address: customer.address,
      customer_gstin: customer.gstin,
      customer_state: customer.state,
      invoice_date: invoiceDate,
      due_date: dueDate || null,
      notes,
      items: items.filter((item) => item.name.trim()).map((item) => ({
        name: item.name, quantity: +item.quantity, unit_price: +item.unit_price,
        gst_rate: +item.gst_rate, hsn_sac: item.hsn_sac, unit: item.unit,
      })),
    };
    if (localOnly) {
      try {
        const queued = await getDb().offline.get(id);
        if (!queued || queued.syncStatus === "synced") throw new Error("Offline invoice is no longer available");
        await getDb().offline.put({
          ...queued,
          payload,
          syncStatus: "pending",
          lastError: undefined,
        });
        toast.success("Offline invoice updated and queued to sync");
        router.replace(`/invoices/${id}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update offline invoice");
      } finally {
        setLoading(false);
      }
      return;
    }
    try {
      const { error } = await supabase.from("invoices").update({
        customer_name: customer.name,
        customer_email: customer.email || null,
        customer_phone: customer.phone || null,
        customer_address: customer.address || null,
        customer_gstin: customer.gstin || null,
        customer_state: customer.state || null,
        invoice_date: invoiceDate,
        due_date: dueDate || null,
        notes: notes || null,
        subtotal: calc.subtotal,
        cgst: calc.cgst,
        sgst: calc.sgst,
        igst: calc.igst,
        grand_total: calc.grandTotal,
      }).eq("id", id).eq("user_id", user.id);
      if (error) throw error;
      const { error: deleteItemsError } = await supabase.from("invoice_items").delete().eq("invoice_id", id);
      if (deleteItemsError) throw deleteItemsError;
      const rows = items.filter((i) => i.name.trim()).map((it, i) => ({
        invoice_id: id, position: i, name: it.name, hsn_sac: it.hsn_sac || null, unit: it.unit,
        quantity: +it.quantity, unit_price: +it.unit_price, gst_rate: +it.gst_rate,
        taxable: calc.lines[i].taxable, cgst: calc.lines[i].cgst, sgst: calc.lines[i].sgst,
        igst: calc.lines[i].igst, line_total: calc.lines[i].lineTotal,
      }));
      if (rows.length) {
        const { error: insertItemsError } = await supabase.from("invoice_items").insert(rows);
        if (insertItemsError) throw insertItemsError;
      }
      toast.success("Invoice updated");
      router.push(`/invoices/${id}`);
    } catch (e: any) {
      toast.error(e.message || "Update failed");
    } finally {
      setLoading(false);
    }
  }

  if (booting) return <div className="h-48 animate-pulse rounded-2xl bg-muted" />;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold">Edit invoice</h1>
      <Card className="space-y-3 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="edit-customer-picker">Select customer</Label>
            <Select value={customers.some((item) => item.name === customer.name) ? customer.name : "__custom__"} onValueChange={(value) => {
              const selected = customers.find((item) => item.name === value);
              if (selected) setCustomer((current) => ({ ...current, ...selected }));
              else if (value === "__custom__") setCustomer((current) => ({ ...current, name: "" }));
            }}>
              <SelectTrigger id="edit-customer-picker"><SelectValue /></SelectTrigger>
              <SelectContent align="start" className="min-w-[20rem] max-w-[calc(100vw-2rem)]">
                {customers.map((item, index) => (
                  <SelectItem key={`${item.name}-${index}`} value={item.name} className="py-2">
                    <span className="flex min-w-0 flex-col items-start gap-0.5">
                      <span className="w-full truncate font-medium">{item.name}</span>
                      <span className="w-full whitespace-normal text-xs text-muted-foreground">
                        {[item.email, item.phone, item.state].filter(Boolean).join(" · ")}
                      </span>
                      <span className="w-full whitespace-normal text-xs text-muted-foreground">
                        {[item.address, item.gstin && `GSTIN ${item.gstin}`].filter(Boolean).join(" · ") || "No address or GSTIN saved"}
                      </span>
                    </span>
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">Custom customer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2"><Label>Customer name *</Label><Input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} /></div>
          <div className="space-y-1"><Label>Email</Label><Input value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} /></div>
          <div className="space-y-1"><Label>Phone</Label><Input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} /></div>
          <div className="space-y-1"><Label>GSTIN</Label><Input value={customer.gstin} onChange={(e) => setCustomer({ ...customer, gstin: e.target.value })} /></div>
          <div className="space-y-1"><Label>State</Label><Input value={customer.state} onChange={(e) => setCustomer({ ...customer, state: e.target.value })} /></div>
          <div className="space-y-1"><Label>Date</Label><Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></div>
          <div className="space-y-1"><Label>Due</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
        </div>
      </Card>
      <Card className="space-y-3 p-5">
        <div className="flex justify-between"><h2 className="font-semibold">Items</h2>
          <Button size="sm" variant="outline" type="button" onClick={() => setItems((xs) => [...xs, { name: "", quantity: "1", unit_price: "0", gst_rate: "18", hsn_sac: "", unit: "NOS" }])}><Plus className="h-4 w-4" /> Add</Button>
        </div>
        {items.map((it, idx) => (
          <div key={idx} className="space-y-3 rounded-xl border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor={`edit-item-picker-${idx}`}>Item {idx + 1}</Label>
              <Button type="button" variant="ghost" size="sm" aria-label={`Remove item ${idx + 1}`} disabled={items.length === 1} onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
            <Select value={itemOptions.some((sample) => sample.name === it.name) ? it.name : "__custom__"} onValueChange={(value) => {
              const sample = itemOptions.find((item) => item.name === value);
              const next = [...items];
              next[idx] = sample ? { ...it, ...sample, quantity: it.quantity || "1" } : { ...it, name: "" };
              setItems(next);
            }}>
              <SelectTrigger id={`edit-item-picker-${idx}`}><SelectValue placeholder="Choose an item" /></SelectTrigger>
              <SelectContent align="start" className="min-w-[20rem] max-w-[calc(100vw-2rem)]">
                <SelectItem value="__custom__">Custom item — enter details below</SelectItem>
                {itemOptions.map((sample) => (
                  <SelectItem key={sample.name} value={sample.name} className="py-2">
                    <span className="flex min-w-0 flex-col items-start gap-0.5">
                      <span className="w-full truncate font-medium">{sample.name}</span>
                      <span className="w-full whitespace-normal text-xs text-muted-foreground">
                        {inr(sample.unit_price)} / {sample.unit} · GST {sample.gst_rate}%
                        {sample.hsn_sac ? ` · HSN ${sample.hsn_sac}` : ""}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Description</Label><Input placeholder="Item or service name" value={it.name} onChange={(e) => { const n = [...items]; n[idx] = { ...it, name: e.target.value }; setItems(n); }} /></div>
              <div className="space-y-1"><Label className="text-xs">Quantity</Label><Input type="number" min="0" step="0.001" value={it.quantity} onChange={(e) => { const n = [...items]; n[idx] = { ...it, quantity: e.target.value }; setItems(n); }} /></div>
              <div className="space-y-1"><Label className="text-xs">Rate (₹)</Label><Input type="number" min="0" step="0.01" value={it.unit_price} onChange={(e) => { const n = [...items]; n[idx] = { ...it, unit_price: e.target.value }; setItems(n); }} /></div>
              <div className="space-y-1"><Label htmlFor={`edit-gst-rate-${idx}`} className="text-xs">GST rate</Label><Select value={it.gst_rate} onValueChange={(value) => { if (value === null) return; const n = [...items]; n[idx] = { ...it, gst_rate: value }; setItems(n); }}>
                <SelectTrigger id={`edit-gst-rate-${idx}`}><SelectValue /></SelectTrigger><SelectContent>{["0", "5", "12", "18", "28"].map((rate) => <SelectItem key={rate} value={rate}>{rate}%</SelectItem>)}</SelectContent>
              </Select></div>
              <div className="space-y-1"><Label className="text-xs">HSN / SAC</Label><Input value={it.hsn_sac} onChange={(e) => { const n = [...items]; n[idx] = { ...it, hsn_sac: e.target.value }; setItems(n); }} placeholder="Optional" /></div>
              <div className="space-y-1"><Label htmlFor={`edit-item-unit-${idx}`} className="text-xs">Unit</Label><Select value={it.unit} onValueChange={(value) => { if (value === null) return; const n = [...items]; n[idx] = { ...it, unit: value }; setItems(n); }}>
                <SelectTrigger id={`edit-item-unit-${idx}`}><SelectValue /></SelectTrigger><SelectContent>{["NOS", "HRS", "MON", "DAY", "DAYS", "TRIP", "KG", "LTR"].map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}</SelectContent>
              </Select></div>
            </div>
          </div>
        ))}
        <div className="text-right font-bold">Total {inr(calc.grandTotal)}</div>
      </Card>
      <div className="space-y-1"><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      <div className="flex gap-2">
        <Button loading={loading} onClick={save}>Save changes</Button>
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </div>
  );
}
