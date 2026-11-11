"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, FilePlus2, Plus, Trash2 } from "lucide-react";
import { createClient, getCurrentUser } from "@/lib/supabase/client";
import { getCache, saveOffline, setCache } from "@/lib/offline/db";
import { calcInvoice } from "@/lib/gst";
import { uid, todayStr, inr } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCustomerOptions, getItemOptions } from "@/lib/invoice-options";
import Link from "next/link";

type Line = { name: string; quantity: string; unit_price: string; gst_rate: string; hsn_sac: string; unit: string };

export default function NewInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(true);
  const [biz, setBiz] = useState<any>(null);
  const [customers, setCustomers] = useState(getCustomerOptions());
  const [itemOptions, setItemOptions] = useState(getItemOptions());
  const [customer, setCustomer] = useState({
    name: "", email: "", phone: "", address: "", gstin: "", state: "",
  });
  const [invoiceDate, setInvoiceDate] = useState(todayStr());
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Line[]>([
    { name: "", quantity: "1", unit_price: "0", gst_rate: "18", hsn_sac: "", unit: "NOS" },
  ]);

  useEffect(() => {
    setOnline(navigator.onLine);
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    const loadFormData = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) return;
        const supabase = createClient();
        const cachedInvoices = await getCache(user.id, "invoices");
        setCustomers(getCustomerOptions(cachedInvoices || []));
        const cachedCustomers = await getCache(user.id, "customers");
        if (cachedCustomers) setCustomers(getCustomerOptions(cachedCustomers));
        const cachedItems = await getCache(user.id, "items");
        setItemOptions(getItemOptions(cachedItems || []));
        if (navigator.onLine) {
          try {
            const { data, error } = await supabase
              .from("invoices")
              .select("customer_name,customer_email,customer_phone,customer_address,customer_gstin,customer_state")
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
              .limit(100);
            if (error) console.error("Could not load previous customers", error);
            else {
              setCustomers(getCustomerOptions(data || []));
              await setCache(user.id, "customers", data || []);
            }
          } catch (error) {
            console.error("Could not load previous customers", error);
          }
          try {
            const { data, error } = await supabase
              .from("invoice_items")
              .select("name,unit_price,gst_rate,hsn_sac,unit,invoices!inner(user_id)")
              .eq("invoices.user_id", user.id)
              .limit(200);
            if (error) console.error("Could not load previous items", error);
            else {
              setItemOptions(getItemOptions(data || []));
              await setCache(user.id, "items", data || []);
            }
          } catch (error) {
            console.error("Could not load previous items", error);
          }
        }
        const { loadBusiness } = await import("@/lib/business");
        const data = await loadBusiness(user.id);
        setBiz(data);
        if (data?.default_notes) setNotes(data.default_notes);
        if (!data) {
          toast.message("Set up your business profile first");
          router.replace("/business");
        }
      } catch (error) {
        console.error("Could not load invoice form data", error);
        toast.error("Some invoice options could not be loaded. You can still enter details manually.");
      }
    };
    void loadFormData();
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, [router]);

  const calc = useMemo(
    () =>
      calcInvoice(
        items.map((it) => ({ quantity: +it.quantity || 0, unitPrice: +it.unit_price || 0, gstRate: +it.gst_rate || 0 })),
        biz?.state || "",
        customer.state || ""
      ),
    [items, biz, customer.state]
  );

  async function save(status: "draft" | "issued") {
    if (!customer.name.trim()) { toast.error("Customer name required"); return; }
    if (!items.some((i) => i.name.trim())) { toast.error("Add at least one item"); return; }
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
    if (!user) { toast.error("Sign in required"); setLoading(false); return; }
    if (!biz) { toast.error("Business profile missing"); setLoading(false); router.push("/business"); return; }

    const localId = uid();
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
      items: items.filter((i) => i.name.trim()).map((i) => ({
        name: i.name, quantity: +i.quantity, unit_price: +i.unit_price, gst_rate: +i.gst_rate,
        hsn_sac: i.hsn_sac, unit: i.unit,
      })),
    };

    if (!navigator.onLine) {
      try {
        await saveOffline(localId, user.id, payload);
      } catch (error) {
        toast.error(error instanceof Error ? `Could not save invoice on this device: ${error.message}` : "Could not save invoice on this device");
        setLoading(false);
        return;
      }
      toast.success("Saved offline — will sync when online");
      setLoading(false);
      router.push("/invoices");
      return;
    }

    try {
      const { data: inv, error } = await supabase.from("invoices").insert({
        user_id: user.id,
        business_id: biz.id,
        local_uuid: localId,
        status,
        customer_name: payload.customer_name,
        customer_email: payload.customer_email || null,
        customer_phone: payload.customer_phone || null,
        customer_address: payload.customer_address || null,
        customer_gstin: payload.customer_gstin || null,
        customer_state: payload.customer_state || null,
        invoice_date: payload.invoice_date,
        due_date: payload.due_date,
        notes: payload.notes || null,
        subtotal: calc.subtotal,
        cgst: calc.cgst,
        sgst: calc.sgst,
        igst: calc.igst,
        grand_total: calc.grandTotal,
        invoice_number: status === "issued" ? `${biz.invoice_prefix || "INV"}-${Date.now().toString().slice(-6)}` : null,
      }).select("id").single();
      if (error) throw error;
      const { error: itemsError } = await supabase.from("invoice_items").insert(
        payload.items.map((it, i) => ({
          invoice_id: inv.id, position: i, name: it.name, hsn_sac: it.hsn_sac || null, unit: it.unit,
          quantity: it.quantity, unit_price: it.unit_price, gst_rate: it.gst_rate,
          taxable: calc.lines[i].taxable, cgst: calc.lines[i].cgst, sgst: calc.lines[i].sgst,
          igst: calc.lines[i].igst, line_total: calc.lines[i].lineTotal,
        }))
      );
      if (itemsError) {
        await supabase.from("invoices").delete().eq("id", inv.id).eq("user_id", user.id);
        throw itemsError;
      }
      toast.success(status === "issued" ? "Invoice issued" : "Draft saved");
      router.push(`/invoices/${inv.id}`);
    } catch (e: any) {
      if (!navigator.onLine || e instanceof TypeError || e?.message?.toLowerCase().includes("fetch")) {
        try {
          await saveOffline(localId, user.id, payload);
          toast.success("Connection lost — invoice saved on this device and will sync later");
          router.push("/invoices");
        } catch (saveError) {
          toast.error(saveError instanceof Error ? `Could not save invoice on this device: ${saveError.message}` : "Could not save invoice on this device");
        }
        return;
      }
      toast.error(e.message || "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start gap-3">
        <Link href="/invoices" className={buttonVariants({ variant: "outline", size: "sm", className: "mt-1 shrink-0" })}><ArrowLeft className="h-4 w-4" /><span className="sr-only">Back to invoices</span></Link>
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-primary"><FilePlus2 className="h-4 w-4" /> Invoice creation</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Create invoice</h1>
          <p className="mt-1 text-sm text-muted-foreground">Add customer and line items, then save a draft or issue it.</p>
        </div>
      </div>
      {!online && (
        <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">You’re offline. This invoice will be saved on this device and synced when you reconnect.</p>
      )}

      <Card className="space-y-5 p-5 sm:p-6">
        <div>
          <h2 className="font-semibold">Customer details</h2>
          <p className="mt-1 text-sm text-muted-foreground">Choose a saved example or enter a new customer.</p>
        </div>
        <div className="max-w-sm space-y-1.5">
          <Label htmlFor="customer-picker">Select customer</Label>
          <Select value={customers.some((item) => item.name === customer.name) ? customer.name : customer.name ? "__new__" : ""} onValueChange={(value) => {
            const selected = customers.find((item) => item.name === value);
            if (selected) setCustomer((current) => ({ ...current, ...selected }));
            else if (value === "__new__") setCustomer({ name: "", email: "", phone: "", address: "", gstin: "", state: "" });
          }}>
            <SelectTrigger id="customer-picker"><SelectValue placeholder="Choose a customer…" /></SelectTrigger>
            <SelectContent align="start" className="min-w-[20rem] max-w-[calc(100vw-2rem)]">
              {customers.map((item) => (
                <SelectItem key={item.name} value={item.name} className="py-2">
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
              <SelectItem value="__new__">＋ Add a new customer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1"><Label>Name *</Label><Input required value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Customer or company name" /></div>
          <div className="space-y-1"><Label>Email</Label><Input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} /></div>
          <div className="space-y-1"><Label>Phone</Label><Input type="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} /></div>
          <div className="space-y-1"><Label>GSTIN</Label><Input value={customer.gstin} onChange={(e) => setCustomer({ ...customer, gstin: e.target.value })} /></div>
          <div className="space-y-1"><Label>State</Label><Input value={customer.state} onChange={(e) => setCustomer({ ...customer, state: e.target.value })} placeholder="Place of supply" /></div>
          <div className="space-y-1 sm:col-span-2"><Label>Address</Label><Input value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} /></div>
          <div className="space-y-1"><Label>Invoice date</Label><Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></div>
          <div className="space-y-1"><Label>Due date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
        </div>
      </Card>

      <Card className="space-y-5 p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div><h2 className="font-semibold">Items and services</h2><p className="mt-1 text-sm text-muted-foreground">Select a suggestion to fill item details.</p></div>
          <Button type="button" size="sm" variant="outline" onClick={() => setItems((xs) => [...xs, { name: "", quantity: "1", unit_price: "0", gst_rate: "18", hsn_sac: "", unit: "NOS" }])}>
            <Plus className="h-4 w-4" /> Add row
          </Button>
        </div>
        {items.map((it, idx) => (
          <div key={idx} className="space-y-3 rounded-xl border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor={`item-picker-${idx}`}>Item {idx + 1}</Label>
              <Button type="button" size="sm" variant="ghost" aria-label={`Remove item ${idx + 1}`} disabled={items.length === 1} onClick={() => setItems(items.filter((_, i) => i !== idx))}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <Select value={itemOptions.some((sample) => sample.name === it.name) ? it.name : "__custom__"} onValueChange={(value) => {
              const sample = itemOptions.find((item) => item.name === value);
              const next = [...items];
              next[idx] = sample
                ? { ...it, ...sample, quantity: it.quantity || "1" }
                : { ...it, name: "" };
              setItems(next);
            }}>
              <SelectTrigger id={`item-picker-${idx}`}><SelectValue placeholder="Choose an item" /></SelectTrigger>
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
              <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Description</Label><Input value={it.name} onChange={(e) => { const n = [...items]; n[idx] = { ...it, name: e.target.value }; setItems(n); }} placeholder="Item or service name" /></div>
              <div className="space-y-1"><Label className="text-xs">Quantity</Label><Input type="number" min="0" step="0.001" value={it.quantity} onChange={(e) => { const n = [...items]; n[idx] = { ...it, quantity: e.target.value }; setItems(n); }} /></div>
              <div className="space-y-1"><Label className="text-xs">Rate (₹)</Label><Input type="number" min="0" step="0.01" value={it.unit_price} onChange={(e) => { const n = [...items]; n[idx] = { ...it, unit_price: e.target.value }; setItems(n); }} /></div>
              <div className="space-y-1"><Label htmlFor={`gst-rate-${idx}`} className="text-xs">GST rate</Label><Select value={it.gst_rate} onValueChange={(value) => { if (value === null) return; const n = [...items]; n[idx] = { ...it, gst_rate: value }; setItems(n); }}>
                <SelectTrigger id={`gst-rate-${idx}`}><SelectValue /></SelectTrigger><SelectContent>
                {["0", "5", "12", "18", "28"].map((rate) => <SelectItem key={rate} value={rate}>{rate}%</SelectItem>)}
                </SelectContent>
              </Select></div>
              <div className="space-y-1"><Label className="text-xs">HSN / SAC</Label><Input value={it.hsn_sac} onChange={(e) => { const n = [...items]; n[idx] = { ...it, hsn_sac: e.target.value }; setItems(n); }} placeholder="Optional" /></div>
              <div className="space-y-1"><Label htmlFor={`item-unit-${idx}`} className="text-xs">Unit</Label><Select value={it.unit} onValueChange={(value) => { if (value === null) return; const n = [...items]; n[idx] = { ...it, unit: value }; setItems(n); }}>
                <SelectTrigger id={`item-unit-${idx}`}><SelectValue /></SelectTrigger><SelectContent>
                {["NOS", "HRS", "MON", "DAY", "DAYS", "TRIP", "KG", "LTR"].map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                </SelectContent>
              </Select></div>
            </div>
          </div>
        ))}
        <div className="ml-auto max-w-sm space-y-2 rounded-xl bg-muted/60 p-4 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{inr(calc.subtotal)}</span></div>
          {calc.intra ? (
            <><div className="flex justify-between"><span>CGST</span><span>{inr(calc.cgst)}</span></div>
            <div className="flex justify-between"><span>SGST</span><span>{inr(calc.sgst)}</span></div></>
          ) : (
            <div className="flex justify-between"><span>IGST</span><span>{inr(calc.igst)}</span></div>
          )}
          <div className="flex justify-between border-t pt-3 text-lg font-bold"><span>Total due</span><span>{inr(calc.grandTotal)}</span></div>
        </div>
      </Card>

      <Card className="space-y-2 p-5 sm:p-6">
        <Label>Notes</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Card>

      <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
        <Button variant="outline" loading={loading} onClick={() => save("draft")}>Save as draft</Button>
        <Button size="lg" loading={loading} onClick={() => save("issued")}><FilePlus2 className="h-4 w-4" /> Issue invoice</Button>
      </div>
    </div>
  );
}
