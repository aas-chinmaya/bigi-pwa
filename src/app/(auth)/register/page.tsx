"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { saveBusiness } from "@/lib/business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [state, setState] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      const user = session?.user;
      if (user) router.replace("/invoices");
    });
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    if (data.user) {
      try {
        await saveBusiness(data.user.id, {
          business_name: businessName || fullName || "My Business",
          state: state || null,
          email,
        } as any);
      } catch (err: any) {
        // schema may not be run yet
        toast.error(err.message || "Account created but business save failed — open Business page");
        setLoading(false);
        router.replace("/business");
        return;
      }
    }
    setLoading(false);
    toast.success("Account created");
    router.replace("/invoices");
    router.refresh();
  }

  return (
    <Card className="border-0 p-6 shadow-xl sm:p-8">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-500 text-white">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold">Create account</h1>
        <p className="text-sm text-muted-foreground">Start invoicing in a minute</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1.5"><Label>Your name</Label><Input required value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Business name</Label><Input required value={businessName} onChange={(e) => setBusinessName(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>State (GST)</Label><Input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. Maharashtra" /></div>
        <div className="space-y-1.5"><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Password</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <Button type="submit" className="w-full" size="lg" loading={loading}>Create account</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Have an account? <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
      </p>
    </Card>
  );
}
