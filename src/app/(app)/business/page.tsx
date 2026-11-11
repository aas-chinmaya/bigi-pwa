"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient, getCurrentUser } from "@/lib/supabase/client";
import { loadBusiness, saveBusiness } from "@/lib/business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function BusinessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    business_name: "",
    email: "",
    phone: "",
    address: "",
    gstin: "",
    state: "",
    invoice_prefix: "INV",
  });

  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      if (!user) return;
      const b = await loadBusiness(user.id);
      if (b) {
        setForm({
          business_name: b.business_name || "",
          email: b.email || "",
          phone: b.phone || "",
          address: b.address || "",
          gstin: b.gstin || "",
          state: b.state || "",
          invoice_prefix: b.invoice_prefix || "INV",
        });
      }
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.business_name.trim()) {
      toast.error("Business name required");
      return;
    }
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Not signed in");
      await saveBusiness(user.id, form);
      toast.success("Business profile saved");
      router.replace("/invoices");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Could not save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">Business profile</h1>
      <p className="text-sm text-muted-foreground">
        Required once. Used on every invoice and PDF. Works offline after first save online.
      </p>
      <Card className="p-5">
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>Business name *</Label>
            <Input required value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div className="space-y-1"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label>GSTIN</Label><Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} /></div>
            <div className="space-y-1"><Label>State *</Label><Input required value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="e.g. Maharashtra" /></div>
          </div>
          <div className="space-y-1"><Label>Invoice prefix</Label><Input value={form.invoice_prefix} onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value })} /></div>
          <Button type="submit" className="w-full" size="lg" loading={loading}>Save & continue</Button>
        </form>
      </Card>
    </div>
  );
}
