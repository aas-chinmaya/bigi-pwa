"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Download, Pencil, Printer, Trash2 } from "lucide-react";
import { createClient, getCurrentUser } from "@/lib/supabase/client";
import { getDb } from "@/lib/offline/db";
import { loadBusiness } from "@/lib/business";
import { calcInvoice } from "@/lib/gst";
import { downloadInvoicePdf } from "@/lib/pdf";
import { InvoiceSheet, type SheetData } from "@/components/invoice-sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const sheetRef = useRef<HTMLDivElement>(null);
  const [sheet, setSheet] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [meta, setMeta] = useState<{ number?: string | null; status?: string }>({});
  const [localOnly, setLocalOnly] = useState(false);

  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      if (!user) return;
      const queued = await getDb().offline.get(id);
      if (queued?.syncStatus === "synced" && queued.serverId) {
        router.replace(`/invoices/${queued.serverId}`);
        return;
      }
      if (queued && queued.syncStatus !== "synced") {
        const payload = queued.payload;
        const business = await loadBusiness(user.id);
        const calc = calcInvoice(
          (payload.items || []).map((item: any) => ({
            quantity: Number(item.quantity) || 0,
            unitPrice: Number(item.unit_price) || 0,
            gstRate: Number(item.gst_rate) || 0,
          })),
          business?.state || "",
          payload.customer_state || ""
        );
        setLocalOnly(true);
        setMeta({ number: payload.status === "issued" ? "Pending issue" : "Offline draft", status: "pending sync" });
        setSheet({
          number: payload.status === "issued" ? "Pending issue" : "Offline draft",
          status: "pending sync",
          invoice_date: payload.invoice_date,
          due_date: payload.due_date,
          notes: payload.notes,
          business: {
            name: business?.business_name || "Business",
            address: business?.address || "",
            email: business?.email || "",
            phone: business?.phone || "",
            gstin: business?.gstin || "",
            state: business?.state || "",
          },
          customer: {
            name: payload.customer_name,
            address: payload.customer_address || "",
            email: payload.customer_email || "",
            phone: payload.customer_phone || "",
            gstin: payload.customer_gstin || "",
            state: payload.customer_state || "",
          },
          items: (payload.items || []).map((item: any, index: number) => ({
            name: item.name, hsn_sac: item.hsn_sac, unit: item.unit,
            quantity: Number(item.quantity), unit_price: Number(item.unit_price), gst_rate: Number(item.gst_rate),
            taxable: calc.lines[index].taxable, cgst: calc.lines[index].cgst, sgst: calc.lines[index].sgst,
            igst: calc.lines[index].igst, line_total: calc.lines[index].lineTotal,
          })),
          totals: { subtotal: calc.subtotal, cgst: calc.cgst, sgst: calc.sgst, igst: calc.igst, grand: calc.grandTotal },
          intra: calc.intra,
        });
        setLoading(false);
        return;
      }
      if (!navigator.onLine) {
        toast.error("This invoice is not available offline yet");
        setLoading(false);
        return;
      }
      const supabase = createClient();
      const { data: inv } = await supabase.from("invoices").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
      if (!inv) { setLoading(false); return; }
      const [{ data: items }, { data: biz }] = await Promise.all([
        supabase.from("invoice_items").select("*").eq("invoice_id", inv.id).order("position"),
        supabase.from("businesses").select("*").eq("id", inv.business_id).maybeSingle(),
      ]);
      setMeta({ number: inv.invoice_number, status: inv.status });
      setSheet({
        number: inv.invoice_number,
        status: inv.status,
        invoice_date: inv.invoice_date,
        due_date: inv.due_date,
        notes: inv.notes,
        business: {
          name: biz?.business_name || "Business",
          address: biz?.address || "",
          email: biz?.email || "",
          phone: biz?.phone || "",
          gstin: biz?.gstin || "",
          state: biz?.state || "",
        },
        customer: {
          name: inv.customer_name,
          address: inv.customer_address || "",
          email: inv.customer_email || "",
          phone: inv.customer_phone || "",
          gstin: inv.customer_gstin || "",
          state: inv.customer_state || "",
        },
        items: (items || []).map((it) => ({
          name: it.name, hsn_sac: it.hsn_sac, unit: it.unit,
          quantity: Number(it.quantity), unit_price: Number(it.unit_price), gst_rate: Number(it.gst_rate),
          taxable: it.taxable, cgst: it.cgst, sgst: it.sgst, igst: it.igst, line_total: it.line_total,
        })),
        totals: { subtotal: inv.subtotal, cgst: inv.cgst, sgst: inv.sgst, igst: inv.igst, grand: inv.grand_total },
        intra: Number(inv.igst) === 0,
      });
      setLoading(false);
    })();
  }, [id, router]);

  async function onPdf() {
    if (!sheetRef.current) return;
    setPdfBusy(true);
    try {
      await downloadInvoicePdf(sheetRef.current, `${meta.number || "invoice"}.pdf`);
      toast.success("PDF downloaded");
    } catch (e: any) {
      toast.error(e?.message || "PDF failed — try Print instead");
    } finally {
      setPdfBusy(false);
    }
  }

  async function onDelete() {
    if (!confirm("Delete this invoice permanently?")) return;
    const supabase = createClient();
    const user = await getCurrentUser();
    if (!user) return;
    const { error } = await supabase.from("invoices").delete().eq("id", id).eq("user_id", user.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      router.replace("/invoices");
    }
  }

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-muted" />;
  if (!sheet) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Invoice not found. <Link href="/invoices" className="text-primary underline">Back</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <Link href="/invoices" aria-label="Back to invoices" className={buttonVariants({ variant: "ghost", size: "sm" })}><ArrowLeft className="h-4 w-4" /></Link>
          <div>
            <h1 className="text-xl font-bold">{meta.number || "Draft"}</h1>
            <p className="text-xs capitalize text-muted-foreground">{meta.status}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/invoices/${id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}><Pencil className="h-4 w-4" /> Edit</Link>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button size="sm" loading={pdfBusy} onClick={onPdf}>
            <Download className="h-4 w-4" /> Download PDF
          </Button>
          {!localOnly && <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>}
        </div>
      </div>
      <Card className="overflow-x-auto bg-muted/40 p-3 sm:p-6 print:border-0 print:bg-white print:p-0 print:shadow-none">
        <InvoiceSheet ref={sheetRef} data={sheet} />
      </Card>
    </div>
  );
}
