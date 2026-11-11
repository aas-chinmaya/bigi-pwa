"use client";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
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
    logo_data: "",
  });

  function onLogoSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    event.currentTarget.value = "";

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Choose a PNG, JPG, or WEBP logo");
      return;
    }
    if (file.size > 1024 * 1024) {
      toast.error("Logo must be 1 MB or smaller");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const logoData = reader.result;
      if (typeof logoData !== "string") {
        toast.error("Could not read the logo file");
        return;
      }
      setForm((current) => ({ ...current, logo_data: logoData }));
    };
    reader.onerror = () => toast.error("Could not read the logo file");
    reader.readAsDataURL(file);
  }

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
          logo_data: b.logo_data || "",
        });
      }
    })();
  }, []);

  async function onSubmit(e: FormEvent) {
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
      window.dispatchEvent(new Event("if:business-updated"));
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
        Used on every invoice and PDF. Changes are saved on this device offline and sync when you reconnect.
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
          <div className="space-y-2">
            <Label htmlFor="business-logo">Business logo</Label>
            <Input
              id="business-logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={onLogoSelect}
            />
            <p className="text-xs text-muted-foreground">PNG, JPG, or WEBP, up to 1 MB. Shown on invoices and PDFs.</p>
            {form.logo_data && (
              <div className="flex items-center gap-3">
                <img
                  src={form.logo_data}
                  alt="Business logo preview"
                  className="max-h-16 max-w-36 rounded border bg-white object-contain p-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setForm((current) => ({ ...current, logo_data: "" }))}
                >
                  Remove logo
                </Button>
              </div>
            )}
          </div>
          <Button type="submit" className="w-full" size="lg" loading={loading}>Save & continue</Button>
        </form>
      </Card>
    </div>
  );
}
